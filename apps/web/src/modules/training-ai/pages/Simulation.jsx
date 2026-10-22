import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import TrainingPage from '../components/TrainingPage.jsx'
import PersonaCallStage from '../components/PersonaCallStage.jsx'
import VoicePracticeChrome from '../components/VoicePracticeChrome.jsx'
import CallPreflight, { LimitExceededModal, PreparingCallOverlay } from '../components/CallPreflight.jsx'
import { DIFFICULTY_LABELS } from '../data/catalogs.js'
import { scenarioTypeLabel } from '../data/personas.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import useMicTest from '../hooks/useMicTest.js'
import { getAvatarEngine } from '../services/avatar/index.js'
import { setBrowserSpeechSpeed } from '../services/avatar/browserAvatarProvider.js'
import { createSpeechRecognizer, isSpeechRecognitionSupported } from '../services/voice/speechRecognition.js'
import { isServerCaptureSupported, micErrorMessage, openVadMic } from '../services/voice/vadCapture.js'
import {
  createSpeechQueue,
  isLikelyHallucination,
  personaGender,
  playServerSpeech,
  stopServerSpeech,
  unlockServerAudio,
  setServerPlaybackBlockedHandler,
  setServerSpeechSpeed,
} from '../services/voice/serverVoice.js'
import { trainingApi } from '../services/api/client.js'

/**
 * Quiet time that ends a turn. A sales call has thinking pauses of well over a second; 0.7s was closing the
 * microphone between phrases. Two seconds still feels like a conversation and leaves room to breathe.
 */
const TURN_PAUSE_MS = 2000
const SILENCE_SEND_MS = TURN_PAUSE_MS
const END_OF_TURN_MS = TURN_PAUSE_MS

/**
 * Logs where the time of one spoken turn went, in the browser console ("[voice-latency]"), measured from the
 * moment the recording of the turn was handed over. Add `silenceMs` to get the time from the end of the voice.
 */
function reportLatency(ref, stage) {
  const mark = ref.current
  if (!mark) return
  const now = performance.now()
  if (stage === 'sentence' && !mark.sentenceAt) mark.sentenceAt = now
  if (stage !== 'play' || mark.reported || !mark.sentenceAt) return
  mark.reported = true
  console.info('[voice-latency]', {
    endOfSpeechWaitMs: END_OF_TURN_MS,
    transcribeMs: Math.round(mark.transcribedAt - mark.segmentAt),
    serverStt: mark.server,
    audioBytes: mark.bytes,
    replyFirstSentenceMs: Math.round(mark.sentenceAt - mark.transcribedAt),
    sentenceToSoundMs: Math.round(now - mark.sentenceAt),
    handoverToSoundMs: Math.round(now - mark.segmentAt),
    fromEndOfVoiceMs: Math.round(now - mark.segmentAt) + END_OF_TURN_MS,
  })
}

/** Stops the persona's server speech: the streamed reply being played and the request still producing it. */
function silenceRefs(queueRef, turnAbortRef) {
  const queue = queueRef.current
  queueRef.current = null
  queue?.stop()
  turnAbortRef.current?.abort()
  turnAbortRef.current = null
  stopServerSpeech()
}

/** `ref.current` holds the promise of the open microphone, so a close during opening is not lost. */
function closeMic(ref) {
  const opening = ref.current
  ref.current = null
  opening?.then((mic) => mic.close()).catch(() => {})
}

function formatTime(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ''
  }
}

const STEPS = [
  { id: 'setup', label: 'Agente' },
  { id: 'briefing', label: 'Briefing' },
  { id: 'running', label: 'Conversa' },
]

function stepState(phase, stepId) {
  const order = STEPS.map((item) => item.id)
  const current = phase === 'finished' ? 'running' : phase
  const currentIndex = order.indexOf(current)
  const stepIndex = order.indexOf(stepId)
  if (stepIndex < 0) return ''
  if (stepIndex < currentIndex) return 'is-done'
  if (stepIndex === currentIndex) return 'is-active'
  return ''
}

export default function TrainingSimulationPage() {
  const { scenarioId, personaId: personaRouteId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const {
    scenarios,
    personas,
    selectedScenario,
    selectedPersona,
    draftPersonaId,
    messages,
    phase,
    userMessageCount,
    canSimulate,
    startSimulation,
    startPersonaSimulation,
    ensurePersona,
    catalogReady,
    selectPersonaForSession,
    confirmPersonaSetup,
    beginConversation,
    setPracticeMediaMode,
    practiceMediaMode,
    sendMessage,
    sendSpokenTurn,
    finishSession,
    isStarting,
    isGeneratingReply,
    isJudging,
    evaluation,
    aiReady,
    aiUnavailableReason,
    aiStatus,
    session,
  } = useTrainingAi()

  const [draft, setDraft] = useState('')
  const [finishHint, setFinishHint] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceNotice, setVoiceNotice] = useState('')
  const [startError, setStartError] = useState('')
  const [busyHint, setBusyHint] = useState('')
  const draftRef = useRef('')
  const sttSupported = isSpeechRecognitionSupported()
  // Server voice: the API listens (STT) and speaks (TTS). The browser's own voice is the fallback.
  const [serverVoiceOff, setServerVoiceOff] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const serverVoice =
    practiceMediaMode === 'voice' &&
    Boolean(aiStatus?.voice?.stt && aiStatus?.voice?.tts) &&
    isServerCaptureSupported() &&
    !serverVoiceOff
  const canListen = serverVoice || sttSupported
  const serverFailuresRef = useRef(0)
  const micRef = useRef(null)
  const micIdRef = useRef('')
  // Read inside long-lived callbacks (speech playback, mic segments) so a mid-line change cannot cancel them.
  const voiceCfgRef = useRef({ serverVoice: false, canListen: false, sessionId: null })
  useEffect(() => {
    voiceCfgRef.current = { serverVoice, canListen, sessionId: session?.id ?? null }
  })
  // Set when the browser refuses to play the persona's voice; any tap on the page clears it and unlocks the sound.
  const [soundBlocked, setSoundBlocked] = useState(false)
  // Phones play sound only after a tap: the first tap on this page unlocks the persona's audio for the whole call.
  useEffect(() => {
    setServerPlaybackBlockedHandler(setSoundBlocked)
    const events = ['pointerdown', 'touchend', 'click']
    const unlock = () => unlockServerAudio()
    events.forEach((name) => window.addEventListener(name, unlock, true))
    return () => {
      setServerPlaybackBlockedHandler(null)
      events.forEach((name) => window.removeEventListener(name, unlock, true))
    }
  }, [])
  // One setting (TTS_SPEED on the server) sets the pace of the recorded voice and of the browser's fallback voice.
  const voiceSpeed = aiStatus?.voice?.speed
  useEffect(() => {
    setServerSpeechSpeed(voiceSpeed)
    setBrowserSpeechSpeed(voiceSpeed)
  }, [voiceSpeed])
  const [speakingLocal, setSpeakingLocal] = useState(false)
  // Barge-in: the trainee can talk over the persona, who stops. Needs the server voice and, in practice, headphones.
  const [bargeIn, setBargeIn] = useState(true)
  const micOpen = listening || (serverVoice && bargeIn && speakingLocal)
  // The persona's streamed reply being played, and the request that is producing it.
  const queueRef = useRef(null)
  const latencyRef = useRef(null)
  const turnAbortRef = useRef(null)
  const [caption, setCaption] = useState('')
  const [showTranscript, setShowTranscript] = useState(false)
  const [bootError, setBootError] = useState('')
  const [callStep, setCallStep] = useState('setup')
  const [preparing, setPreparing] = useState(false)
  const [limitExceeded, setLimitExceeded] = useState('')
  const [micArmed, setMicArmed] = useState(false)
  const [turnsLeft, setTurnsLeft] = useState(null)
  const lastSpokenMessageIdRef = useRef(null)
  const bootAttemptRef = useRef(null)
  const simulationRouteKeyRef = useRef(null)
  const recorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTokenRef = useRef(null)
  const startCancelledRef = useRef(false)
  // Hands-free voice: while on, the microphone reopens each time the persona finishes speaking.
  const autoListenRef = useRef(false)
  // Voice turn taking: send on silence, reopen the mic after the persona answers.
  const sendRef = useRef(null)
  const sendingRef = useRef(false)
  const silenceTimerRef = useRef(null)
  const micFailedRef = useRef(false)
  const liveRef = useRef({ speaking: false, busy: false, running: false })
  const voiceCallEntry = Boolean(personaRouteId) && practiceMediaMode === 'voice' && phase === 'briefing'
  const micTest = useMicTest({ enabled: voiceCallEntry })
  const handleCallStepChange = useCallback((next) => setCallStep(next), [])
  const maxTurns = aiStatus?.maxTurns ?? null

  // Own the simulation boot here. Entry points only navigate to this route —
  // never bounce silently back to the catalog on a failed/racy start.
  useEffect(() => {
    if (!scenarioId) return

    if (bootAttemptRef.current && bootAttemptRef.current !== scenarioId) {
      bootAttemptRef.current = null
    }

    const hasActiveSession =
      selectedScenario?.id === scenarioId &&
      (phase === 'setup' || phase === 'briefing' || phase === 'running')

    if (hasActiveSession) {
      simulationRouteKeyRef.current = location.key
      setBootError('')
      return
    }

    if (
      phase === 'finished' &&
      selectedScenario?.id === scenarioId &&
      simulationRouteKeyRef.current === location.key
    ) {
      return
    }

    if (!canSimulate) {
      setBootError('Sem permissão para iniciar simulações.')
      return undefined
    }

    // The catalog arrives after the first paint. Failing before that locks the page
    // on "not found" because the attempt ref would block the retry.
    if (!catalogReady) return undefined

    // Avoid retry loops if start already failed for this scenarioId.
    if (bootAttemptRef.current === scenarioId) return undefined
    bootAttemptRef.current = scenarioId
    setBootError('')

    try {
      const personaIdFromNav = location.state?.personaId
      const started = startSimulation(
        scenarioId,
        personaIdFromNav ? { personaId: personaIdFromNav } : {},
      )
      if (!started) {
        setBootError('Não foi possível iniciar este cenário. Volte às personas e tente de novo.')
        return undefined
      }
      simulationRouteKeyRef.current = location.key
    } catch (error) {
      console.error('[training-ai] startSimulation failed', error)
      setBootError('Erro ao iniciar a simulação. Veja o console para detalhes.')
      return undefined
    }

    return () => {
      // Development runs this effect twice. Drop the in-flight mark so the second run can start.
      if (bootAttemptRef.current === scenarioId) bootAttemptRef.current = null
    }
  }, [
    canSimulate,
    catalogReady,
    location.key,
    location.state,
    phase,
    scenarioId,
    selectedScenario?.id,
    startSimulation,
  ])

  useEffect(() => {
    if (!personaRouteId || scenarioId) return
    if (selectedPersona?.id === personaRouteId && (phase === 'briefing' || phase === 'running')) {
      simulationRouteKeyRef.current = location.key
      return
    }
    if (
      phase === 'finished' &&
      selectedPersona?.id === personaRouteId &&
      simulationRouteKeyRef.current === location.key
    ) {
      return
    }
    if (!canSimulate) {
      setBootError('Sem permissão para iniciar simulações.')
      return
    }
    if (!catalogReady) return undefined
    if (bootAttemptRef.current === personaRouteId) return undefined
    bootAttemptRef.current = personaRouteId
    setCallStep('setup')
    setPreparing(false)
    setLimitExceeded('')
    let cancelled = false
    ;(async () => {
      await ensurePersona(personaRouteId)
      if (cancelled) return
      const started = startPersonaSimulation(personaRouteId, location.state?.mediaMode)
      if (cancelled) return
      if (!started) setBootError('Não foi possível abrir esta persona.')
      else simulationRouteKeyRef.current = location.key
    })()
    return () => {
      cancelled = true
      // The first run is cancelled while the persona is still loading. Clearing the mark
      // lets the replay (and a catalog refresh) open the briefing instead of staying idle.
      if (bootAttemptRef.current === personaRouteId) bootAttemptRef.current = null
    }
  }, [
    canSimulate,
    catalogReady,
    ensurePersona,
    location.key,
    location.state,
    personaRouteId,
    phase,
    scenarioId,
    selectedPersona?.id,
    startPersonaSimulation,
  ])

  // Drive the persona call stage: whenever a new AI line lands while in voice mode, the avatar engine
  // speaks it (browser voice, or silent timing where the browser cannot speak) so the stage can animate
  // and caption in sync.
  useEffect(() => {
    if (phase !== 'running' || practiceMediaMode !== 'voice') return
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'ai') return
    if (lastSpokenMessageIdRef.current === lastMessage.id) return
    lastSpokenMessageIdRef.current = lastMessage.id

    let cancelled = false
    const line = lastMessage.text || ''
    setListening(false) // the microphone would pick up the persona's own voice
    setCaption(line)
    setSpeakingLocal(true)

    const { serverVoice: useServer, sessionId } = voiceCfgRef.current
    const browserVoice = () => getAvatarEngine().speak(selectedPersona, line)
    const speech =
      useServer && sessionId
        ? trainingApi
            .speakSession(sessionId, line, personaGender(selectedPersona?.voiceRef))
            .then((audio) => playServerSpeech(audio))
            .then(() => {
              serverFailuresRef.current = 0
            })
            .catch((error) => {
              if (error?.name === 'NotAllowedError') setSoundBlocked(true)
              // One bad line falls back to the browser voice; repeated failures turn server voice off for the call.
              serverFailuresRef.current += 1
              if (serverFailuresRef.current >= 2) {
                setServerVoiceOff(true)
                setVoiceNotice('A voz do servidor falhou. Usando a voz do navegador nesta conversa.')
              }
              return browserVoice()
            })
        : browserVoice()

    speech
      .catch(() => null)
      .finally(() => {
        if (cancelled) return
        setSpeakingLocal(false)
        if (autoListenRef.current && voiceCfgRef.current.canListen) setListening(true)
      })

    return () => {
      cancelled = true
    }
  }, [messages, phase, practiceMediaMode, selectedPersona])

  useEffect(() => {
    if (phase !== 'running') {
      setCaption('')
      setSpeakingLocal(false)
      setListening(false)
      setTurnsLeft(null)
      lastSpokenMessageIdRef.current = null
      getAvatarEngine().stopSession()
      silenceRefs(queueRef, turnAbortRef)
      closeMic(micRef)
    }
    if (phase === 'finished' || phase === 'idle') {
      setShowTranscript(false)
      autoListenRef.current = false
      setMicArmed(false)
    }
  }, [phase])

  // Leaving the page must silence the persona and release the microphone.
  useEffect(
    () => () => {
      getAvatarEngine().stopSession()
      silenceRefs(queueRef, turnAbortRef)
      closeMic(micRef)
      const recorder = recorderRef.current
      recorderRef.current = null
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop()
        } catch {
          /* already stopped */
        }
      }
      recorder?.stream?.getTracks().forEach((track) => track.stop())
    },
    [],
  )

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  // Dictation: while the microphone is on, the recognised speech fills the answer box. The trainee reviews
  // it and sends it, as with typed text.
  const personaLanguage = selectedPersona?.language || 'pt-BR'

  // Server listening: each turn is recorded, closed on a pause, transcribed by the API and then sent like typed text.
  useEffect(() => {
    if (!micOpen || !serverVoice) return undefined
    let cancelled = false
    let stopListening = null
    setVoiceNotice('')
    micFailedRef.current = false

    // The trainee spoke over the persona: she goes quiet at once and what is left of her reply is dropped.
    function interrupt() {
      const queue = queueRef.current
      queueRef.current = null // cleared first: stopping the queue must not look like a finished reply
      queue?.stop()
      turnAbortRef.current?.abort()
      stopServerSpeech()
      getAvatarEngine().stopSession()
      setSpeakingLocal(false)
      setCaption('')
    }

    function reopen() {
      window.setTimeout(() => {
        const live = liveRef.current
        if (live.running && !live.speaking && !live.busy && autoListenRef.current) setListening(true)
      }, 250)
    }

    async function handleSegment(blob) {
      const { sessionId } = voiceCfgRef.current
      if (cancelled || !sessionId) return
      if (liveRef.current.speaking) interrupt()
      setListening(false)
      setTranscribing(true)
      try {
        const segmentAt = performance.now()
        const { text, timing, recordingToken } = await trainingApi.transcribeSessionAudio(sessionId, blob)
        latencyRef.current = { segmentAt, transcribedAt: performance.now(), server: timing, bytes: blob.size }
        serverFailuresRef.current = 0
        const heard = text.trim()
        if (heard.length < 2 || isLikelyHallucination(heard)) {
          reopen() // nothing intelligible: keep the call open
          return
        }
        recordingTokenRef.current = recordingToken
        draftRef.current = heard
        setDraft(heard)
        await sendRef.current?.()
      } catch (error) {
        serverFailuresRef.current += 1
        setVoiceNotice(error?.message || 'Não foi possível transcrever a sua fala.')
        if (serverFailuresRef.current >= 2) setServerVoiceOff(true)
        reopen()
      } finally {
        setTranscribing(false)
      }
    }

    if (!micRef.current) {
        micRef.current = openVadMic({ deviceId: micIdRef.current || undefined, silenceMs: END_OF_TURN_MS })
    }
    micRef.current
      .then((mic) => {
        if (cancelled) return
        stopListening = mic.listen({
          onSegment: handleSegment,
          onSpeechStart: () => {
            if (liveRef.current.speaking) interrupt()
          },
          bargeGate: () => liveRef.current.speaking,
        })
      })
      .catch((error) => {
        micRef.current = null
        micFailedRef.current = true
        setVoiceNotice(micErrorMessage(error))
        setListening(false)
      })

    return () => {
      cancelled = true
      stopListening?.()
    }
  }, [micOpen, serverVoice])

  useEffect(() => {
    if (!listening || serverVoice) return undefined
    if (!sttSupported) {
      setListening(false)
      setVoiceNotice('Este navegador não reconhece voz. Use o Chrome ou o Edge, ou digite a resposta.')
      return undefined
    }
    setVoiceNotice('')
    micFailedRef.current = false
    const handsFree = practiceMediaMode === 'voice'
    const recognizer = createSpeechRecognizer({
      lang: personaLanguage,
      onText: (text) => {
        setDraft(text)
        if (!handsFree) return
        // The turn ends after a short pause: send what was said without a click.
        window.clearTimeout(silenceTimerRef.current)
        if (text.trim().length >= 2) {
          silenceTimerRef.current = window.setTimeout(() => sendRef.current?.(), SILENCE_SEND_MS)
        }
      },
      onEnd: () => {
        // The browser ends recognition on a short quiet spell. That is not the end of the turn: the pause
        // timer is. Reopen the microphone and keep what was already heard.
        setListening(false)
        if (!handsFree || !autoListenRef.current || micFailedRef.current) {
          window.clearTimeout(silenceTimerRef.current)
          return
        }
        window.setTimeout(() => {
          const live = liveRef.current
          if (live.running && !live.speaking && !live.busy && autoListenRef.current) setListening(true)
        }, 250)
      },
      onError: (message) => {
        micFailedRef.current = true
        setVoiceNotice(message)
      },
    })
    recognizer.start(draftRef.current)
    return () => {
      window.clearTimeout(silenceTimerRef.current)
      recognizer.stop()
    }
  }, [listening, serverVoice, personaLanguage, sttSupported, practiceMediaMode])

  useEffect(() => {
    if (phase === 'finished' && evaluation?.sessionId) {
      if (simulationRouteKeyRef.current !== location.key) return
      navigate(`/modules/training-ai/relatorio/sessao/${evaluation.sessionId}`, { replace: true })
    }
  }, [evaluation, location.key, navigate, phase])

  const scenario =
    selectedScenario ||
    scenarios.find((item) => item.id === scenarioId) ||
    (selectedPersona
      ? {
          id: null,
          title: scenarioTypeLabel(selectedPersona.scenarioType),
          sellerInstructions:
            selectedPersona.sellerInstructions ||
            selectedPersona.trainingObjective ||
            'Siga o contexto desta persona.',
          objective: selectedPersona.trainingObjective,
          personaId: selectedPersona.id,
          difficulty: selectedPersona.difficulty,
        }
      : null)
  const persona = selectedPersona
  const linkedDefaultId = scenario?.personaId

  function setVoiceListening(next) {
    autoListenRef.current = next
    setListening(next)
  }

  async function handleSend(event) {
    event?.preventDefault()
    const text = draftRef.current.trim()
    if (sendingRef.current || isGeneratingReply || isJudging || !text) return
    sendingRef.current = true
    setBusyHint('')
    setListening(false)
    const { serverVoice: useServer } = voiceCfgRef.current
    const streamed = useServer && practiceMediaMode === 'voice'
    let queue = null
    let sendFailed = false // after a failure the microphone stays shut: no loop of failing requests
    try {
      let result
      if (streamed) {
        // The persona starts talking with the first sentence, while the rest is still being written.
        const abort = new AbortController()
        turnAbortRef.current = abort
        const fallbackLine = (line) => getAvatarEngine().speak(selectedPersona, line)
        const ownQueue = createSpeechQueue({
          onSentence: (line) => {
            if (queueRef.current !== ownQueue) return
            reportLatency(latencyRef, 'play')
            setCaption(line)
            setSpeakingLocal(true)
          },
          onIdle: () => {
            if (queueRef.current !== ownQueue) return // interrupted, or replaced
            queueRef.current = null
            setSpeakingLocal(false)
            // With server voice a new sentence replaces the old draft, so listening again cannot loop on a failure.
            if ((!sendFailed || useServer) && autoListenRef.current && voiceCfgRef.current.canListen) {
              setListening(true)
            }
          },
          onError: (error) => {
            if (error?.name === 'NotAllowedError') setSoundBlocked(true)
          },
          speakFallback: fallbackLine,
        })
        queue = ownQueue
        queueRef.current = ownQueue
        result = await sendSpokenTurn(text, {
          gender: personaGender(selectedPersona?.voiceRef),
          signal: abort.signal,
          recordingToken: recordingTokenRef.current,
          onSentence: (sentence) => {
            reportLatency(latencyRef, 'sentence')
            ownQueue.push(sentence)
          },
          onTurn: (aiMessage) => {
            lastSpokenMessageIdRef.current = aiMessage.id // already spoken: the line effect must not repeat it
          },
        })
        if (turnAbortRef.current === abort) turnAbortRef.current = null
      } else {
        result = await sendMessage(text)
      }
      if (result.ok) {
        if (draftRef.current.trim() === text) {
          draftRef.current = ''
          setDraft('')
        }
        setFinishHint('')
        if (typeof result.turnsLeft === 'number') setTurnsLeft(result.turnsLeft)
      } else if (result.error) {
        setBusyHint(result.error) // the text stays in the box so nothing is lost
      }
      sendFailed = !result.ok
    } finally {
      sendingRef.current = false
      recordingTokenRef.current = null
      queue?.close() // the reply is complete: the queue goes idle after its last sentence
    }
  }
  // Timers and recognizer callbacks outlive a render: they read the latest handler and call state from refs.
  useEffect(() => {
    sendRef.current = handleSend
    micIdRef.current = micTest.micId || ''
    liveRef.current = {
      speaking: speakingLocal,
      busy: isGeneratingReply || isJudging,
      running: phase === 'running',
    }
  })

  // The call never waits for a click: whenever nobody is talking, thinking or sending, the microphone reopens.
  // Only the trainee's own "Pausar microfone" (which clears autoListenRef) or a microphone error keeps it shut.
  useEffect(() => {
    if (!serverVoice || phase !== 'running') return undefined
    if (listening || speakingLocal || isGeneratingReply || isJudging || transcribing) return undefined
    const timer = window.setTimeout(() => {
      if (autoListenRef.current && !micFailedRef.current && !sendingRef.current && !queueRef.current) {
        setListening(true)
      }
    }, 800)
    return () => window.clearTimeout(timer)
  }, [serverVoice, phase, listening, speakingLocal, isGeneratingReply, isJudging, transcribing])

  function handleComposerKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      handleSend()
    }
  }

  function stopRecorder() {
    const recorder = recorderRef.current
    recorderRef.current = null
    if (!recorder || recorder.state === 'inactive') return Promise.resolve(null)
    return new Promise((resolve) => {
      recorder.addEventListener('stop', () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        recorder.stream?.getTracks().forEach((track) => track.stop())
        resolve(blob.size ? blob : null)
      }, { once: true })
      recorder.stop()
    })
  }

  async function handleFinish() {
    if (isGeneratingReply || isJudging) return
    setBusyHint('')
    setFinishHint('')
    autoListenRef.current = false
    silenceRefs(queueRef, turnAbortRef)
    sendingRef.current = true // a pending dictation must not slip in after the call ends
    setListening(false)
    const audioBlob = await stopRecorder()
    const result = await finishSession(audioBlob)
    sendingRef.current = false
    if (!result.ok && result.error) setFinishHint(result.error)
  }

  async function startSessionRecorder() {
    if (practiceMediaMode !== 'voice' || !navigator.mediaDevices?.getUserMedia) return
    try {
      const audioConstraint = micTest.micId ? { deviceId: { exact: micTest.micId } } : true
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data?.size) audioChunksRef.current.push(event.data)
      })
      recorder.start()
      recorderRef.current = recorder
    } catch {
      setVoiceNotice('O microfone não foi gravado. A transcrição da conversa continua disponível.')
    }
  }

  async function handleBegin() {
    unlockServerAudio()
    if (startCancelledRef.current) return { ok: false, cancelled: true }
    setStartError('')
    setLimitExceeded('')
    const result = await beginConversation()
    if (startCancelledRef.current) return { ok: false, cancelled: true }
    if (!result.ok) {
      if (result.code === 'GROUP_QUOTA_EXCEEDED') {
        setPreparing(false)
        setLimitExceeded(result.error || 'Limite de minutos do grupo atingido.')
        return result
      }
      if (result.error) setStartError(result.error)
      setPreparing(false)
      return result
    }
    setPreparing(false)
    // A voice call is hands-free by default: the mic opens after each persona line.
    if (micArmed || practiceMediaMode === 'voice') autoListenRef.current = true
    // With the server voice every line of the call is stored by the API, one recording per message. A second
    // microphone stream next to the call's own would only fight it for the device (it can mute the call on phones).
    if (!serverVoice) await startSessionRecorder()
    return result
  }

  async function handleStartCallSimulation() {
    unlockServerAudio()
    startCancelledRef.current = false
    setStartError('')
    setLimitExceeded('')
    setPreparing(true)
    micTest.cancelTest()
    // Brief connection beat so the "Preparando sua chamada" screen is visible.
    await new Promise((resolve) => window.setTimeout(resolve, 1200))
    if (startCancelledRef.current) {
      setPreparing(false)
      return
    }
    await handleBegin()
  }

  function handleHangupPreparing() {
    startCancelledRef.current = true
    setPreparing(false)
    setCallStep('setup')
    navigate('/modules/training-ai/personas')
  }

  if (bootError) {
    return (
      <TrainingPage>
        <div className="training-ai__empty">
          <h3>Não foi possível iniciar</h3>
          <p>{bootError}</p>
          <div className="imp-actions">
            <Link to="/modules/training-ai/personas" className="imp-btn imp-btn--primary">
              Voltar às personas
            </Link>
          </div>
        </div>
      </TrainingPage>
    )
  }

  const waitingForCatalog = Boolean(scenarioId || personaRouteId) && !catalogReady && !bootError
  const waitingForPersona = Boolean(personaRouteId) && !scenarioId && phase === 'idle' && !bootError
  if (waitingForCatalog || waitingForPersona || (scenario && phase === 'idle')) {
    return (
      <TrainingPage>
        <div className="training-ai__empty">
          <h3>Preparando simulação…</h3>
          <p>Carregando agente e briefing.</p>
        </div>
      </TrainingPage>
    )
  }

  if (!scenario || phase === 'idle') {
    return (
      <TrainingPage>
        <div className="training-ai__empty">
          <h3>Cenário não encontrado</h3>
          <p>Essa simulação não está disponível. Volte às personas e escolha um agente ativo.</p>
          <div className="imp-actions">
            <Link to="/modules/training-ai/personas" className="imp-btn imp-btn--primary">
              Ir às personas
            </Link>
          </div>
        </div>
      </TrainingPage>
    )
  }

  const phaseLabel =
    phase === 'setup'
      ? 'Escolher agente'
      : phase === 'briefing'
        ? 'Briefing'
        : practiceMediaMode === 'voice'
          ? 'Conversa por voz'
          : 'Conversa por texto'

  // The script stays on the call screen: the trainee follows it without leaving the call or clicking anything.
  const callScript = {
    objective: scenario?.objective || '',
    instructions: String(scenario?.sellerInstructions || '')
      .split(/\r?\n+/)
      .map((item) => item.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
      .filter(Boolean),
    hints: scenario?.scriptHints || [],
  }

  const callState = isGeneratingReply || transcribing
    ? 'connecting'
    : speakingLocal
      ? 'speaking'
      : listening
        ? 'listening'
        : 'idle'

  if (limitExceeded) {
    return (
      <TrainingPage className="training-ai__sim-page">
        <LimitExceededModal open message={limitExceeded} onHome={() => navigate('/modules/training-ai/personas')} />
      </TrainingPage>
    )
  }

  if (preparing && voiceCallEntry) {
    return (
      <TrainingPage className="training-ai__sim-page">
        <PreparingCallOverlay
          personaName={persona?.name}
          listening={micArmed}
          chatOpen={showTranscript}
          micSupported={sttSupported}
          onToggleMic={() => setMicArmed((value) => !value)}
          onToggleChat={() => setShowTranscript((value) => !value)}
          onHangup={handleHangupPreparing}
        />
      </TrainingPage>
    )
  }

  if (voiceCallEntry) {
    return (
      <TrainingPage className="training-ai__sim-page">
        <CallPreflight
          persona={persona}
          step={callStep}
          mic={micTest}
          onStepChange={handleCallStepChange}
          onStartSimulation={handleStartCallSimulation}
          starting={isStarting || preparing}
        />
        {startError ? <p className="training-ai__composer-hint">{startError}</p> : null}
      </TrainingPage>
    )
  }

  return (
    <TrainingPage>
      <header className="training-ai__page-header">
        <div>
          <h2>Simulação IA</h2>
          <p>{[scenario.title, scenario.funnelStage].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="training-ai__page-header-actions">
          <span className="imp-pill imp-pill--blue">{phaseLabel}</span>
          <Link to="/modules/training-ai/personas" className="imp-btn imp-btn--ghost">
            ← Minhas Personas
          </Link>
        </div>
      </header>

      <nav className="training-ai__stepper" aria-label="Etapas da simulação">
        {STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`training-ai__step ${stepState(phase, step.id)}`}
          >
            <span className="training-ai__step-index">{index + 1}</span>
            {step.label}
          </div>
        ))}
      </nav>

      <div className="imp-grid-2 training-ai__sim-workspace">
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>
                {phase === 'setup'
                  ? 'Escolher agente'
                  : phase === 'briefing'
                    ? 'Briefing'
                    : 'Conversa'}
              </h2>
              <p>
                {phase === 'running'
                  ? 'Responda como falaria com o cliente e encerre quando concluir.'
                  : 'Siga as etapas para iniciar o treino com o agente.'}
              </p>
            </div>
          </div>

          {phase === 'setup' ? (
            <div className="training-ai__briefing">
              <dl className="training-ai__briefing-block">
                <dt>Cenário selecionado</dt>
                <dd>{scenario.description}</dd>
              </dl>
              <p className="training-ai__options-hint">
                Escolha o agente com quem você vai praticar a conversa.
              </p>
              <div className="training-ai__persona-picker">
                {personas.filter((item) => item.status === 'active').map((item) => {
                  const selected = (draftPersonaId || scenario.personaId) === item.id
                  const linked = item.id === linkedDefaultId
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`training-ai__persona-pick ${selected ? 'is-selected' : ''}`}
                      onClick={() => selectPersonaForSession(item.id)}
                    >
                      <strong>{item.name}</strong>
                      <span>
                        {item.role} · {item.industry}
                      </span>
                      <span>
                        {DIFFICULTY_LABELS[item.difficulty] || item.difficulty}
                        {linked ? ' · sugerida' : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                className="imp-btn imp-btn--primary"
                onClick={confirmPersonaSetup}
                disabled={!draftPersonaId && !scenario.personaId}
              >
                Continuar para briefing
              </button>
            </div>
          ) : null}

          {phase === 'briefing' ? (
            <div className="training-ai__briefing">
              <dl className="training-ai__briefing-block">
                <dt>Instruções ao vendedor</dt>
                <dd>{scenario.sellerInstructions}</dd>
              </dl>
              {scenario.objective ? (
                <dl className="training-ai__briefing-block">
                  <dt>Objetivo</dt>
                  <dd>{scenario.objective}</dd>
                </dl>
              ) : null}
              <dl className="training-ai__briefing-block">
                <dt>Agente</dt>
                <dd>
                  {persona?.name} — {persona?.role} em {persona?.company} (
                  {persona?.negotiatorType})
                </dd>
              </dl>
              {persona?.objections?.length ? (
                <dl className="training-ai__briefing-block">
                  <dt>Objeções esperadas</dt>
                  <dd>{persona.objections.join(' · ')}</dd>
                </dl>
              ) : null}
              {persona?.openingLine ? (
                <dl className="training-ai__briefing-block">
                  <dt>Abertura do agente</dt>
                  <dd>{persona.openingLine}</dd>
                </dl>
              ) : null}
              <dl className="training-ai__briefing-block">
                <dt>Modo de mídia</dt>
                <dd>
                  Escolha Texto ou Voz. Na voz, o agente fala as respostas e você pode ditar as suas;
                  ao final o template gera o score no Histórico.
                </dd>
              </dl>
              <VoicePracticeChrome
                mediaMode={practiceMediaMode}
                onMediaModeChange={setPracticeMediaMode}
                listening={false}
                showMic={false}
                sttSupported={sttSupported}
              />
              {!aiReady ? (
                <p className="training-ai__composer-hint">{aiUnavailableReason}</p>
              ) : null}
              {startError ? <p className="training-ai__composer-hint">{startError}</p> : null}
              <button
                type="button"
                className="imp-btn imp-btn--primary"
                onClick={handleBegin}
                disabled={isStarting || !aiReady}
                style={{ marginTop: '1rem' }}
              >
                {isStarting ? 'Iniciando…' : 'Iniciar conversa'}
              </button>
            </div>
          ) : null}

          {phase === 'running' ? (
            <>
              {practiceMediaMode === 'voice' ? (
                <PersonaCallStage
                  persona={persona}
                  callState={callState}
                  caption={caption}
                  liveText={listening || isGeneratingReply || transcribing ? draft : ''}
                  listening={listening}
                  onListeningChange={setVoiceListening}
                  onFinish={handleFinish}
                  showTranscript={showTranscript}
                  onToggleTranscript={setShowTranscript}
                  sttSupported={canListen}
                  script={callScript}
                  soundNotice={
                    soundBlocked
                      ? 'O celular bloqueou o som. Toque em qualquer lugar da tela para ativar a voz do agente.'
                      : ''
                  }
                  bargeInAvailable={serverVoice}
                  bargeIn={bargeIn}
                  onToggleBargeIn={setBargeIn}
                  audioOnly={location.state?.audioOnly === true}
                />
              ) : (
                <VoicePracticeChrome
                  mediaMode={practiceMediaMode}
                  onMediaModeChange={setPracticeMediaMode}
                  listening={listening}
                  onListeningChange={setListening}
                  sttSupported={sttSupported}
                />
              )}
              {voiceNotice ? <p className="training-ai__composer-hint">{voiceNotice}</p> : null}

              {practiceMediaMode !== 'voice' || showTranscript ? (
                <div className="imp-chat training-ai__chat-scroll">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`imp-chat__bubble imp-chat__bubble--${
                        message.role === 'ai' ? 'ai' : 'user'
                      }`}
                    >
                      <span className="imp-chat__meta">
                        {message.speaker ||
                          (message.role === 'ai' ? persona?.name || 'Persona' : 'Você')}
                        {message.timestamp ? ` · ${formatTime(message.timestamp)}` : ''}
                      </span>
                      {message.text}
                    </div>
                  ))}
                  {isGeneratingReply ? (
                    <div className="imp-chat__bubble imp-chat__bubble--ai training-ai__typing">
                      <span className="imp-chat__meta">{persona?.name || 'Agente'} · gerando…</span>
                      Preparando a resposta…
                    </div>
                  ) : null}
                </div>
              ) : null}

              {practiceMediaMode === 'voice' && canListen ? (
                // Voice call: speech is the only input. The turn is sent on its own after a pause.
                <div className="training-ai__composer-hints">
                  {finishHint ? <p className="training-ai__composer-hint">{finishHint}</p> : null}
                  {busyHint ? <p className="training-ai__composer-hint">{busyHint}</p> : null}
                  {busyHint && draft.trim() ? (
                    <button
                      type="button"
                      className="imp-btn imp-btn--ghost"
                      onClick={() => sendRef.current?.()}
                      disabled={isGeneratingReply || isJudging}
                    >
                      Tentar enviar de novo
                    </button>
                  ) : null}
                </div>
              ) : (
              <form className="training-ai__composer" onSubmit={handleSend}>
                <label className="imp-field training-ai__composer-field">
                  <span>
                    {practiceMediaMode === 'voice'
                      ? 'Sua fala (dite pelo microfone ou digite)'
                      : 'Sua resposta'}
                  </span>
                  <textarea
                    rows={3}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    disabled={isGeneratingReply || isJudging}
                    placeholder={
                      practiceMediaMode === 'voice'
                        ? sttSupported
                          ? 'Ative o microfone para ditar ou digite a sua fala…'
                          : 'Digite a sua fala (ditado por voz indisponível neste navegador)…'
                        : 'Escreva como falaria com o cliente…'
                    }
                  />
                </label>
                <div className="training-ai__composer-actions">
                  <button
                    type="submit"
                    className="imp-btn imp-btn--primary"
                    disabled={!draft.trim() || isGeneratingReply || isJudging}
                  >
                    {isGeneratingReply ? 'Aguardando…' : 'Enviar'}
                  </button>
                  <button
                    type="button"
                    className="imp-btn imp-btn--ghost"
                    onClick={handleFinish}
                    disabled={isGeneratingReply || isJudging}
                  >
                    {isJudging ? 'Avaliando rubrica…' : 'Encerrar treinamento'}
                  </button>
                  <span className="training-ai__meta">
                    {userMessageCount} mensagem{userMessageCount === 1 ? '' : 'ens'} sua
                    {userMessageCount === 1 ? '' : 's'}
                    {(() => {
                      const left = turnsLeft ?? (maxTurns != null ? Math.max(0, maxTurns - userMessageCount) : null)
                      if (left == null) return null
                      if (left === 0) return ' · limite atingido, encerre para ver a avaliação'
                      return ` · ${left} restante${left === 1 ? '' : 's'}`
                    })()}
                  </span>
                </div>
                {finishHint ? <p className="training-ai__composer-hint">{finishHint}</p> : null}
                {busyHint ? <p className="training-ai__composer-hint">{busyHint}</p> : null}
              </form>
              )}
            </>
          ) : null}
        </div>

        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Agente</h2>
              <p>Contexto da simulação</p>
            </div>
          </div>
          {persona ? (
            <dl className="training-ai__persona-grid">
              <div>
                <dt>Nome</dt>
                <dd className="is-strong">{persona.name}</dd>
              </div>
              <div>
                <dt>Cargo</dt>
                <dd>{persona.role}</dd>
              </div>
              <div>
                <dt>Indústria</dt>
                <dd>{persona.industry}</dd>
              </div>
              <div>
                <dt>Empresa</dt>
                <dd>{persona.company}</dd>
              </div>
              <div>
                <dt>Negociador</dt>
                <dd>{persona.negotiatorType}</dd>
              </div>
              <div>
                <dt>Comportamento</dt>
                <dd>{persona.behavior || persona.mood}</dd>
              </div>
              <div>
                <dt>Objetivo</dt>
                <dd>{persona.trainingObjective}</dd>
              </div>
            </dl>
          ) : (
            <div className="training-ai__empty">
              <h3>Selecione um agente</h3>
              <p>O contexto aparece aqui após a escolha.</p>
            </div>
          )}

          {persona?.objections?.length ? (
            <div className="training-ai__hints">
              <h3>Objeções típicas</h3>
              <ul>
                {persona.objections.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {scenario.scriptHints?.length ? (
            <div className="training-ai__hints">
              <h3>Dicas do coach</h3>
              <ul>
                {scenario.scriptHints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </TrainingPage>
  )
}
