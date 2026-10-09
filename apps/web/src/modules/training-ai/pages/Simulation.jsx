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
import { createSpeechRecognizer, isSpeechRecognitionSupported } from '../services/voice/speechRecognition.js'

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
    finishSession,
    isStarting,
    isGeneratingReply,
    isJudging,
    evaluation,
    aiReady,
    aiUnavailableReason,
    aiStatus,
  } = useTrainingAi()

  const [draft, setDraft] = useState('')
  const [finishHint, setFinishHint] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceNotice, setVoiceNotice] = useState('')
  const [startError, setStartError] = useState('')
  const [busyHint, setBusyHint] = useState('')
  const draftRef = useRef('')
  const sttSupported = isSpeechRecognitionSupported()
  const [speakingLocal, setSpeakingLocal] = useState(false)
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
  const recorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const startCancelledRef = useRef(false)
  // Hands-free voice: while on, the microphone reopens each time the persona finishes speaking.
  const autoListenRef = useRef(false)
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
      setBootError('')
      return
    }

    // Finished sessions navigate to the report via another effect.
    if (phase === 'finished' && selectedScenario?.id === scenarioId) {
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
    location.state,
    phase,
    scenarioId,
    selectedScenario?.id,
    startSimulation,
  ])

  useEffect(() => {
    if (!personaRouteId || scenarioId) return
    if (selectedPersona?.id === personaRouteId && (phase === 'briefing' || phase === 'running')) return
    if (phase === 'finished' && selectedPersona?.id === personaRouteId) return
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
    setListening(false) // the microphone would pick up the persona's own voice
    setCaption(lastMessage.text || '')
    setSpeakingLocal(true)
    getAvatarEngine()
      .speak(selectedPersona, lastMessage.text || '')
      .catch(() => null)
      .finally(() => {
        if (cancelled) return
        setSpeakingLocal(false)
        if (autoListenRef.current && sttSupported) setListening(true)
      })

    return () => {
      cancelled = true
    }
  }, [messages, phase, practiceMediaMode, selectedPersona, sttSupported])

  useEffect(() => {
    if (phase !== 'running') {
      setCaption('')
      setSpeakingLocal(false)
      setListening(false)
      setTurnsLeft(null)
      lastSpokenMessageIdRef.current = null
      getAvatarEngine().stopSession()
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
  useEffect(() => {
    if (!listening) return undefined
    if (!sttSupported) {
      setListening(false)
      setVoiceNotice('Este navegador não reconhece voz. Use o Chrome ou o Edge, ou digite a resposta.')
      return undefined
    }
    setVoiceNotice('')
    const recognizer = createSpeechRecognizer({
      lang: personaLanguage,
      onText: (text) => setDraft(text),
      onEnd: () => setListening(false),
      onError: (message) => setVoiceNotice(message),
    })
    recognizer.start(draftRef.current)
    return () => recognizer.stop()
  }, [listening, personaLanguage, sttSupported])

  useEffect(() => {
    if (phase === 'finished' && evaluation?.sessionId) {
      navigate(`/modules/training-ai/relatorio/sessao/${evaluation.sessionId}`, { replace: true })
    }
  }, [evaluation, navigate, phase])

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
    if (isGeneratingReply || isJudging || !draft.trim()) return
    setBusyHint('')
    setListening(false)
    const result = await sendMessage(draft)
    if (result.ok) {
      setDraft('')
      setFinishHint('')
      if (typeof result.turnsLeft === 'number') setTurnsLeft(result.turnsLeft)
    } else if (result.error) {
      setBusyHint(result.error) // the text stays in the box so nothing is lost
    }
  }

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
        resolve(blob.size ? blob : null)
      }, { once: true })
      recorder.stop()
      recorder.stream?.getTracks().forEach((track) => track.stop())
    })
  }

  async function handleFinish() {
    if (isGeneratingReply || isJudging) return
    setBusyHint('')
    setFinishHint('')
    setListening(false)
    const audioBlob = await stopRecorder()
    const result = await finishSession(audioBlob)
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
    if (micArmed) autoListenRef.current = true
    await startSessionRecorder()
    return result
  }

  async function handleStartCallSimulation() {
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

  const callState = isGeneratingReply
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
                  listening={listening}
                  onListeningChange={setVoiceListening}
                  onFinish={handleFinish}
                  showTranscript={showTranscript}
                  onToggleTranscript={setShowTranscript}
                  sttSupported={sttSupported}
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
