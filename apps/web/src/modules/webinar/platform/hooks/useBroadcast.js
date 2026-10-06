import { useCallback, useEffect, useRef, useState } from 'react'
import { webinarApi } from '../services/webinarPlatformApi.js'
import { createChunkUploader } from '../stream/chunkUploader.js'
import { createCompositor } from '../stream/compositor.js'

/** Viewers decode VP8 everywhere WebM is supported, so it goes first. */
const MIME_TYPES = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm']
const VIDEO_BITS_PER_SECOND = 1_200_000
const AUDIO_BITS_PER_SECOND = 64_000
const TIMESLICE_MS = 1000
/** Never restart the recorder more often than this, so a dead connection does not become a restart loop. */
const MIN_RESTART_GAP_MS = 3000

export function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null
}

function deviceError(error) {
  if (error?.name === 'NotAllowedError') return 'Permissão de câmera/microfone negada. Libere o acesso no navegador e tente de novo.'
  if (error?.name === 'NotFoundError') return 'Nenhuma câmera ou microfone encontrado.'
  if (error?.name === 'NotReadableError') return 'A câmera está em uso por outro programa.'
  return `Não foi possível acessar a câmera: ${error?.message || 'erro desconhecido'}`
}

/**
 * The presenter's side of a live webinar: camera, microphone, screen share, and the recording that is
 * sent to the platform API. What is recorded is exactly what `previewStream` shows.
 *
 * `signal` is the health of the upload: 'idle' (not broadcasting), 'ok', 'retrying' or 'lost'.
 */
export function useBroadcast(webinarId) {
  const [devices, setDevices] = useState({ status: 'idle', error: null }) // idle | requesting | ready | error
  const [previewStream, setPreviewStream] = useState(null)
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [broadcasting, setBroadcasting] = useState(false)
  const [signal, setSignal] = useState('idle')
  const [fatal, setFatal] = useState(null)

  const compositor = useRef(null)
  const cameraStream = useRef(null)
  const screenStream = useRef(null)
  const output = useRef(null)
  const recorder = useRef(null)
  const uploader = useRef(null)
  const wanted = useRef(false) // the presenter wants the recording running
  const lastRestart = useRef(0)
  const watchdog = useRef(null)
  const restartTimer = useRef(null)
  const startRecorder = useRef(null)
  const restartAgain = useRef(null)
  const opening = useRef(null) // the pending camera request, shared by every caller
  const epoch = useRef(0) // bumped when devices are closed, so a late camera answer is ignored

  const stopRecorder = useCallback(() => {
    const current = recorder.current
    recorder.current = null // its remaining data is for a recording that no longer matters
    if (current && current.state !== 'inactive') {
      try {
        current.stop()
      } catch {
        /* already stopped */
      }
    }
  }, [])

  const restartRecorder = useCallback(() => {
    if (!wanted.current) return
    const wait = MIN_RESTART_GAP_MS - (Date.now() - lastRestart.current)
    if (wait > 0) {
      clearTimeout(restartTimer.current)
      restartTimer.current = setTimeout(() => restartAgain.current?.(), wait)
      return
    }
    lastRestart.current = Date.now()
    stopRecorder()
    uploader.current?.reset()
    startRecorder.current?.()
  }, [stopRecorder])

  useEffect(() => {
    restartAgain.current = restartRecorder
  }, [restartRecorder])

  const beginRecorder = useCallback(() => {
    const mimeType = pickMimeType()
    if (!mimeType || !output.current) return
    let first = true
    const next = new MediaRecorder(output.current, {
      mimeType,
      videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
      audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
    })
    next.ondataavailable = (event) => {
      if (recorder.current !== next || event.data.size === 0) return
      uploader.current?.push(event.data, { header: first })
      first = false
    }
    next.onerror = () => {
      if (recorder.current === next) restartRecorder()
    }
    recorder.current = next
    next.start(TIMESLICE_MS)
  }, [restartRecorder])

  useEffect(() => {
    startRecorder.current = beginRecorder
  }, [beginRecorder])

  const acquireDevices = useCallback(async (mine) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      if (epoch.current !== mine) {
        // The page was left while the browser was asking; do not keep the camera on.
        stream.getTracks().forEach((track) => track.stop())
        return false
      }
      cameraStream.current = stream
      compositor.current = createCompositor()
      compositor.current.setCamera(stream)
      output.current = new MediaStream([compositor.current.videoTrack, ...stream.getAudioTracks()])
      setPreviewStream(output.current)
      setMicOn(true)
      setCameraOn(true)
      setDevices({ status: 'ready', error: null })
      return true
    } catch (error) {
      if (epoch.current === mine) setDevices({ status: 'error', error: deviceError(error) })
      return false
    }
  }, [])

  const openDevices = useCallback(() => {
    if (cameraStream.current) return Promise.resolve(true)
    if (opening.current) return opening.current // the page asked twice; one prompt is enough
    const mine = epoch.current
    setDevices({ status: 'requesting', error: null })
    opening.current = acquireDevices(mine).finally(() => {
      if (epoch.current === mine) opening.current = null
    })
    return opening.current
  }, [acquireDevices])

  const stopScreenShare = useCallback(() => {
    screenStream.current?.getTracks().forEach((track) => track.stop())
    screenStream.current = null
    compositor.current?.setScreen(null)
    setSharing(false)
  }, [])

  const startScreenShare = useCallback(async () => {
    if (!compositor.current || screenStream.current) return
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
      screenStream.current = stream
      compositor.current.setScreen(stream)
      setSharing(true)
      // The browser's own "stop sharing" button ends the track.
      stream.getVideoTracks()[0].addEventListener('ended', stopScreenShare)
    } catch (error) {
      if (error?.name !== 'NotAllowedError') setDevices((prev) => ({ ...prev, error: `Não foi possível compartilhar a tela: ${error?.message}` }))
    }
  }, [stopScreenShare])

  const toggleMic = useCallback(() => {
    const tracks = cameraStream.current?.getAudioTracks() ?? []
    const enabled = !tracks.every((track) => track.enabled)
    tracks.forEach((track) => (track.enabled = enabled))
    setMicOn(enabled)
  }, [])

  const toggleCamera = useCallback(() => {
    const tracks = cameraStream.current?.getVideoTracks() ?? []
    const enabled = !tracks.every((track) => track.enabled)
    tracks.forEach((track) => (track.enabled = enabled))
    setCameraOn(enabled)
  }, [])

  /** Starts recording and sending. The webinar must already be live on the server. */
  const startBroadcast = useCallback(() => {
    if (!output.current || wanted.current) return false
    if (!pickMimeType()) {
      setFatal(new Error('Este navegador não grava vídeo WebM. Use o Chrome, Edge ou Firefox para transmitir.'))
      return false
    }
    setFatal(null)
    wanted.current = true
    lastRestart.current = Date.now()
    uploader.current = createChunkUploader({
      send: (blob, { header, signal: abortSignal }) => webinarApi.sendChunk(webinarId, blob, { header, signal: abortSignal }),
      onState: setSignal,
      onRestartNeeded: () => restartRecorder(),
      onFatal: (error) => {
        wanted.current = false
        stopRecorder()
        setBroadcasting(false)
        setSignal('idle')
        setFatal(error)
      },
    })
    setSignal('ok')
    setBroadcasting(true)
    beginRecorder()
    // If the recorder dies on its own (device unplugged, browser hiccup) bring it back.
    clearInterval(watchdog.current)
    watchdog.current = setInterval(() => {
      if (wanted.current && (!recorder.current || recorder.current.state === 'inactive')) restartRecorder()
    }, 5000)
    return true
  }, [beginRecorder, restartRecorder, stopRecorder, webinarId])

  const stopBroadcast = useCallback(() => {
    wanted.current = false
    clearInterval(watchdog.current)
    clearTimeout(restartTimer.current)
    stopRecorder()
    uploader.current?.stop()
    uploader.current = null
    setBroadcasting(false)
    setSignal('idle')
  }, [stopRecorder])

  const closeDevices = useCallback(() => {
    epoch.current += 1
    opening.current = null
    stopBroadcast()
    stopScreenShare()
    cameraStream.current?.getTracks().forEach((track) => track.stop())
    cameraStream.current = null
    compositor.current?.destroy()
    compositor.current = null
    output.current = null
    setPreviewStream(null)
    setDevices({ status: 'idle', error: null })
  }, [stopBroadcast, stopScreenShare])

  // Leaving the page turns the camera off and stops sending.
  useEffect(() => closeDevices, [closeDevices])

  return {
    devices,
    previewStream,
    micOn,
    cameraOn,
    sharing,
    broadcasting,
    signal,
    fatal,
    openDevices,
    closeDevices,
    toggleMic,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    startBroadcast,
    stopBroadcast,
    supported: pickMimeType() !== null,
  }
}
