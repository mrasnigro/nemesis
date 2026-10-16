/**
 * Hands-free microphone for server voice calls (speech-to-text on the API).
 * The microphone stays open for the whole call. While the trainee's turn is open it listens for speech,
 * records it, and hands over one audio segment as soon as they pause. No button is involved.
 */

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']

const DEFAULTS = {
  /** Quiet time after speech that ends the turn. */
  silenceMs: 1000,
  /** Sound shorter than this is a cough or a click, not a turn. */
  minSpeechMs: 250,
  /** A turn never runs longer than this. */
  maxSegmentMs: 30_000,
  /** While nobody speaks the recording restarts this often, so it never carries a long silence. */
  idleResetMs: 4000,
  tickMs: 50,
  /** Smallest level that counts as a voice, whatever the room noise. */
  minThreshold: 0.02,
  /** A voice has to be this many times louder than the room noise. */
  noiseRatio: 3,
  /** While the persona talks (barge-in): louder, longer, and a fresher recording. */
  bargeBoost: 2.5,
  bargeMinThreshold: 0.06,
  bargeMinSpeechMs: 450,
  bargeResetMs: 1200,
}

export function isServerCaptureSupported(scope = globalThis) {
  return Boolean(
    scope?.navigator?.mediaDevices?.getUserMedia &&
      scope?.MediaRecorder &&
      (scope?.AudioContext || scope?.webkitAudioContext),
  )
}

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return ''
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

const MIC_ERRORS = {
  NotAllowedError: 'O navegador bloqueou o microfone. Libere o acesso para conversar por voz.',
  SecurityError: 'O navegador bloqueou o microfone. Libere o acesso para conversar por voz.',
  NotFoundError: 'Nenhum microfone foi encontrado.',
  NotReadableError: 'O microfone está em uso por outro aplicativo.',
}

export function micErrorMessage(error) {
  return MIC_ERRORS[error?.name] || 'Não foi possível usar o microfone.'
}

/**
 * @param {{ deviceId?: string } & Partial<typeof DEFAULTS>} [options]
 * @returns {Promise<{ listen: (handlers: { onSegment: (blob: Blob) => void, onSpeechStart?: () => void, onLevel?: (level: number) => void, bargeGate?: () => boolean }) => () => void, close: () => void }>}
 */
export async function openVadMic({ deviceId, ...tuning } = {}) {
  const settings = { ...DEFAULTS, ...tuning }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  })
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  const context = new AudioContextClass()
  if (context.state === 'suspended') await context.resume().catch(() => {})
  if (context.state === 'suspended') {
    // Phones keep a new AudioContext suspended until a tap; the level meter reads zero until then.
    const wake = () => {
      context.resume().catch(() => {})
      if (context.state === 'running') {
        ;['pointerdown', 'touchend', 'click'].forEach((name) => window.removeEventListener(name, wake, true))
      }
    }
    ;['pointerdown', 'touchend', 'click'].forEach((name) => window.addEventListener(name, wake, true))
  }
  const analyser = context.createAnalyser()
  analyser.fftSize = 1024
  context.createMediaStreamSource(stream).connect(analyser)
  const samples = new Float32Array(analyser.fftSize)
  const mimeType = pickMimeType()

  function level() {
    analyser.getFloatTimeDomainData(samples)
    let sum = 0
    for (let index = 0; index < samples.length; index += 1) sum += samples[index] * samples[index]
    return Math.sqrt(sum / samples.length)
  }

  /**
   * `bargeGate()` is asked on every tick. It returns true while the persona is talking: the voice then has to be
   * clearly louder and last longer, so the persona's own sound leaking into the mic is not taken for an interruption.
   */
  function listen({ onSegment, onSpeechStart, onLevel, bargeGate } = {}) {
    let recorder = null
    let chunks = []
    let windowStart = 0
    let segmentStart = 0
    let lastVoiceAt = 0
    let lastTick = Date.now()
    let speechMs = 0
    let speaking = false
    let noiseFloor = 0.008
    let done = false

    function startRecorder() {
      chunks = []
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data)
      }
      recorder.start(250)
      windowStart = Date.now()
    }

    function discardRecorder() {
      const current = recorder
      recorder = null
      if (!current) return
      current.ondataavailable = null
      current.onstop = null
      if (current.state !== 'inactive') {
        try {
          current.stop()
        } catch {
          // already stopped
        }
      }
    }

    function finish() {
      if (done) return
      done = true
      window.clearInterval(timer)
      const current = recorder
      recorder = null
      if (!current || current.state === 'inactive') return
      current.onstop = () => {
        const blob = new Blob(chunks, { type: current.mimeType || mimeType || 'audio/webm' })
        if (blob.size) onSegment?.(blob)
      }
      try {
        current.stop()
      } catch {
        // already stopped
      }
    }

    function tick() {
      const now = Date.now()
      const elapsed = now - lastTick
      lastTick = now
      const current = level()
      const guarded = Boolean(bargeGate?.())
      const base = Math.max(settings.minThreshold, noiseFloor * settings.noiseRatio)
      const threshold = guarded ? Math.max(settings.bargeMinThreshold, base * settings.bargeBoost) : base
      const minSpeechMs = guarded ? settings.bargeMinSpeechMs : settings.minSpeechMs
      const voiced = current > threshold
      // The persona's own sound is not room noise: it must not raise the floor for the trainee's next turn.
      if (!voiced && !guarded) noiseFloor = noiseFloor * 0.9 + current * 0.1
      onLevel?.(current)

      if (voiced) {
        speechMs += elapsed
        lastVoiceAt = now
        if (!speaking && speechMs >= minSpeechMs) {
          speaking = true
          segmentStart = now
          onSpeechStart?.()
        }
      } else {
        const quiet = now - lastVoiceAt
        if (speaking && quiet >= settings.silenceMs) return finish()
        if (!speaking && speechMs > 0 && quiet >= settings.silenceMs) speechMs = 0
      }
      if (speaking && now - segmentStart >= settings.maxSegmentMs) return finish()
      // While the persona talks the recording restarts quickly, so an interruption does not carry her voice.
      const resetAfter = guarded ? settings.bargeResetMs : settings.idleResetMs
      if (!speaking && speechMs === 0 && now - windowStart >= resetAfter) {
        discardRecorder()
        startRecorder()
      }
    }

    startRecorder()
    const timer = window.setInterval(tick, settings.tickMs)

    return function stopListening() {
      done = true
      window.clearInterval(timer)
      discardRecorder()
    }
  }

  function close() {
    stream.getTracks().forEach((track) => track.stop())
    context.close().catch(() => {})
  }

  return { listen, close }
}
