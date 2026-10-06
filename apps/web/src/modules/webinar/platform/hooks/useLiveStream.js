import { useCallback, useEffect, useRef, useState } from 'react'

/** Lag allowed behind the live edge before the player speeds up, and before it jumps ahead. */
const SPEED_UP_AFTER_S = 2.5
const JUMP_AFTER_S = 5
const KEEP_BEHIND_S = 2
/** The picture must stall this long before the viewer is told the signal is weak (short stalls are normal). */
const STALL_NOTICE_MS = 3000
const RECONNECT_DELAYS_MS = [1000, 2000, 3000, 5000]

export const canPlayWebm = () => {
  const probe = document.createElement('video')
  return Boolean(probe.canPlayType('video/webm; codecs="vp8, opus"'))
}

/**
 * Plays the live stream in `videoRef`.
 *
 * - Starts muted (browsers refuse sound before a click) and exposes `unmute`.
 * - If the connection drops or the presenter restarts the recording, it reconnects on its own.
 * - Keeps the viewer close to the live edge: a little faster when behind, a jump when far behind.
 *
 * `state`: 'off' | 'connecting' | 'playing' | 'stalled' | 'unsupported'.
 */
export function useLiveStream({ url, enabled, videoRef }) {
  const [state, setState] = useState('off')
  const [muted, setMuted] = useState(true)
  const [blocked, setBlocked] = useState(false) // the browser refused autoplay

  const [unsupported] = useState(() => !canPlayWebm())

  const attempt = useRef(0)
  const reconnectTimer = useRef(null)
  const stallTimer = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!enabled || !url || !video) return undefined

    if (unsupported) return undefined

    let active = true
    const clearTimers = () => {
      clearTimeout(reconnectTimer.current)
      clearTimeout(stallTimer.current)
      stallTimer.current = null
    }

    const connect = () => {
      if (!active) return
      setState('connecting')
      video.muted = true
      setMuted(true)
      video.src = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`
      video.load()
      video.play().then(
        () => setBlocked(false),
        (error) => {
          // Muted autoplay is normally allowed; a refusal means the viewer must press play.
          if (active && error?.name === 'NotAllowedError') setBlocked(true)
        },
      )
    }

    const reconnect = () => {
      if (!active) return
      clearTimeout(reconnectTimer.current)
      setState('connecting')
      const delay = RECONNECT_DELAYS_MS[Math.min(attempt.current, RECONNECT_DELAYS_MS.length - 1)]
      attempt.current += 1
      reconnectTimer.current = setTimeout(connect, delay)
    }

    const onPlaying = () => {
      attempt.current = 0
      clearTimeout(stallTimer.current)
      stallTimer.current = null
      setBlocked(false)
      setState('playing')
    }
    const onWaiting = () => {
      if (stallTimer.current) return
      stallTimer.current = setTimeout(() => active && setState('stalled'), STALL_NOTICE_MS)
    }

    video.addEventListener('playing', onPlaying)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('error', reconnect)
    video.addEventListener('ended', reconnect)

    const catchUp = setInterval(() => {
      if (video.paused || video.buffered.length === 0) return
      const behind = video.buffered.end(video.buffered.length - 1) - video.currentTime
      if (behind > JUMP_AFTER_S) {
        video.currentTime = video.buffered.end(video.buffered.length - 1) - KEEP_BEHIND_S
      } else {
        video.playbackRate = behind > SPEED_UP_AFTER_S ? 1.1 : 1
      }
    }, 2000)

    connect()

    return () => {
      active = false
      clearInterval(catchUp)
      clearTimers()
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('error', reconnect)
      video.removeEventListener('ended', reconnect)
      video.removeAttribute('src')
      video.load()
      attempt.current = 0
      setState('off')
    }
  }, [enabled, url, videoRef, unsupported])

  const unmute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = false
    setMuted(false)
    video.play().then(() => setBlocked(false), () => {})
  }, [videoRef])

  const play = useCallback(() => {
    videoRef.current?.play().then(() => setBlocked(false), () => {})
  }, [videoRef])

  return { state: unsupported && enabled ? 'unsupported' : state, muted, blocked, unmute, play }
}
