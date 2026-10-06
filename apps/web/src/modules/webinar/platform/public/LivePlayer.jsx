import { useEffect, useRef } from 'react'
import { useLiveStream } from '../hooks/useLiveStream.js'

const MESSAGES = {
  connecting: 'Aguardando o sinal do apresentador…',
  stalled: 'Sinal fraco. Aguardando a transmissão…',
  unsupported: 'Este navegador não reproduz a transmissão. Use o Chrome, Edge ou Firefox.',
}

/** The live video in the visitor's room. Streams only while `live` is true. */
export default function LivePlayer({ url, live, onPlayingChange }) {
  const videoRef = useRef(null)
  const frameRef = useRef(null)
  const { state, muted, blocked, unmute, play } = useLiveStream({ url, enabled: live, videoRef })

  const playing = state === 'playing'
  useEffect(() => {
    onPlayingChange?.(playing)
    return () => onPlayingChange?.(false)
  }, [playing, onPlayingChange])

  function fullscreen() {
    const frame = frameRef.current
    if (!frame) return
    if (document.fullscreenElement) document.exitFullscreen()
    else frame.requestFullscreen?.()
  }

  const message = MESSAGES[state]

  return (
    <div className="public-player" ref={frameRef}>
      <video ref={videoRef} className="public-player__video" playsInline muted aria-label="Transmissão ao vivo" />

      {blocked ? (
        <button type="button" className="public-player__overlay public-player__play" onClick={play}>
          Toque para assistir
        </button>
      ) : message ? (
        <div className="public-player__overlay" role="status">
          {state === 'unsupported' ? null : <span className="public-player__spinner" aria-hidden="true" />}
          <p>{message}</p>
        </div>
      ) : null}

      {playing || state === 'stalled' ? (
        <div className="public-player__bar">
          {muted ? (
            <button type="button" className="public-player__button" onClick={unmute}>
              Ativar som
            </button>
          ) : null}
          <button type="button" className="public-player__button" onClick={fullscreen}>
            Tela cheia
          </button>
        </div>
      ) : null}
    </div>
  )
}
