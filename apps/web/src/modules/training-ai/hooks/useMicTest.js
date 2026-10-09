import { useCallback, useEffect, useRef, useState } from 'react'

async function listAudioDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return { mics: [], speakers: [] }
  }
  const devices = await navigator.mediaDevices.enumerateDevices()
  return {
    mics: devices.filter((item) => item.kind === 'audioinput'),
    speakers: devices.filter((item) => item.kind === 'audiooutput'),
  }
}

/**
 * Mic/speaker device picks + short test recording with a live level meter.
 * Used by the Ligação preflight screens before the real simulation starts.
 */
export default function useMicTest({ enabled = true } = {}) {
  const [mics, setMics] = useState([])
  const [speakers, setSpeakers] = useState([])
  const [micId, setMicId] = useState('')
  const [speakerId, setSpeakerId] = useState('')
  const [level, setLevel] = useState(0)
  const [recording, setRecording] = useState(false)
  const [testBlob, setTestBlob] = useState(null)
  const [testUrl, setTestUrl] = useState('')
  const [testDuration, setTestDuration] = useState(0)
  const [error, setError] = useState('')

  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const analyserRef = useRef(null)
  const audioCtxRef = useRef(null)
  const rafRef = useRef(0)
  const startedAtRef = useRef(0)
  const cancelledRef = useRef(false)

  const refreshDevices = useCallback(async () => {
    try {
      // Permission unlocks device labels in most browsers.
      if (navigator.mediaDevices?.getUserMedia) {
        const probe = await navigator.mediaDevices.getUserMedia({ audio: true })
        probe.getTracks().forEach((track) => track.stop())
      }
      const next = await listAudioDevices()
      setMics(next.mics)
      setSpeakers(next.speakers)
      setMicId((current) => current || next.mics[0]?.deviceId || '')
      setSpeakerId((current) => current || next.speakers[0]?.deviceId || '')
    } catch {
      setError('Não foi possível acessar o microfone. Verifique as permissões do navegador.')
    }
  }, [])

  // Device labels need microphone permission, so only probe once the call screen is actually shown.
  useEffect(() => {
    if (enabled) refreshDevices()
  }, [enabled, refreshDevices])

  const testUrlRef = useRef('')
  useEffect(() => {
    testUrlRef.current = testUrl
  }, [testUrl])

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      audioCtxRef.current?.close().catch(() => null)
      if (testUrlRef.current) URL.revokeObjectURL(testUrlRef.current)
    },
    [],
  )

  function stopMeter() {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    setLevel(0)
    analyserRef.current = null
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => null)
      audioCtxRef.current = null
    }
  }

  function startMeter(stream) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    audioCtxRef.current = ctx
    analyserRef.current = analyser
    const data = new Uint8Array(analyser.frequencyBinCount)

    const tick = () => {
      analyser.getByteFrequencyData(data)
      let sum = 0
      for (let i = 0; i < data.length; i += 1) sum += data[i]
      const avg = sum / (data.length * 255)
      setLevel(Math.min(1, avg * 2.2))
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
  }

  async function startTest() {
    cancelledRef.current = false
    setError('')
    setTestBlob(null)
    if (testUrl) {
      URL.revokeObjectURL(testUrl)
      setTestUrl('')
    }
    setTestDuration(0)
    try {
      const constraints = {
        audio: micId ? { deviceId: { exact: micId } } : true,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (cancelledRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return false
      }
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data?.size) chunksRef.current.push(event.data)
      })
      recorder.addEventListener('stop', () => {
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        stopMeter()
        setRecording(false)
        if (cancelledRef.current) return
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        const elapsed = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
        setTestDuration(elapsed)
        setTestBlob(blob.size ? blob : null)
        if (blob.size) setTestUrl(URL.createObjectURL(blob))
      })
      startedAtRef.current = Date.now()
      recorder.start()
      startMeter(stream)
      setRecording(true)
      return true
    } catch {
      setError('Não foi possível iniciar o teste de microfone.')
      setRecording(false)
      return false
    }
  }

  function stopTest() {
    cancelledRef.current = false
    const recorder = recorderRef.current
    recorderRef.current = null
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    else {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      stopMeter()
      setRecording(false)
    }
  }

  function cancelTest() {
    cancelledRef.current = true
    const recorder = recorderRef.current
    recorderRef.current = null
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch {
        /* ignore */
      }
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    chunksRef.current = []
    stopMeter()
    setRecording(false)
    setTestBlob(null)
    if (testUrl) URL.revokeObjectURL(testUrl)
    setTestUrl('')
    setTestDuration(0)
  }

  function clearTest() {
    cancelTest()
  }

  function formatDuration(seconds) {
    const safe = Math.max(0, Number(seconds) || 0)
    const m = Math.floor(safe / 60)
    const s = safe % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return {
    mics,
    speakers,
    micId,
    speakerId,
    setMicId,
    setSpeakerId,
    level,
    recording,
    testBlob,
    testUrl,
    testDuration,
    testDurationLabel: formatDuration(testDuration),
    error,
    refreshDevices,
    startTest,
    stopTest,
    cancelTest,
    clearTest,
  }
}
