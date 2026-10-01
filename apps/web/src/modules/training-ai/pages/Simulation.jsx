import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import PersonaCallStage from '../components/PersonaCallStage.jsx'
import VoicePracticeChrome from '../components/VoicePracticeChrome.jsx'
import { DIFFICULTY_LABELS } from '../data/catalogs.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import { getAvatarEngine } from '../services/avatar/index.js'

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
  const { scenarioId } = useParams()
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
    selectPersonaForSession,
    confirmPersonaSetup,
    beginConversation,
    setPracticeMediaMode,
    practiceMediaMode,
    sendMessage,
    finishSession,
    isGeneratingReply,
    isJudging,
    evaluation,
  } = useTrainingAi()

  const [draft, setDraft] = useState('')
  const [finishHint, setFinishHint] = useState('')
  const [listening, setListening] = useState(false)
  const [busyHint, setBusyHint] = useState('')
  const [speakingLocal, setSpeakingLocal] = useState(false)
  const [caption, setCaption] = useState('')
  const [showTranscript, setShowTranscript] = useState(false)
  const [bootError, setBootError] = useState('')
  const lastSpokenMessageIdRef = useRef(null)
  const bootAttemptRef = useRef(null)

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
      return
    }

    // Avoid retry loops if start already failed for this scenarioId.
    if (bootAttemptRef.current === scenarioId) return
    bootAttemptRef.current = scenarioId
    setBootError('')

    try {
      const personaIdFromNav = location.state?.personaId
      const started = startSimulation(
        scenarioId,
        personaIdFromNav ? { personaId: personaIdFromNav } : {},
      )
      if (!started) {
        setBootError('Não foi possível iniciar este cenário. Volte ao catálogo e tente de novo.')
      }
    } catch (error) {
      console.error('[training-ai] startSimulation failed', error)
      setBootError('Erro ao iniciar a simulação. Veja o console para detalhes.')
    }
  }, [
    canSimulate,
    location.state,
    phase,
    scenarioId,
    selectedScenario?.id,
    startSimulation,
  ])

  // Drive the persona call stage: whenever a new AI line lands while in
  // voice mode, have the (mock, for now) avatar engine "speak" it so the
  // stage can animate + caption in sync.
  useEffect(() => {
    if (phase !== 'running' || practiceMediaMode !== 'voice') return
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'ai') return
    if (lastSpokenMessageIdRef.current === lastMessage.id) return
    lastSpokenMessageIdRef.current = lastMessage.id

    let cancelled = false
    setCaption(lastMessage.text || '')
    setSpeakingLocal(true)
    getAvatarEngine()
      .speak(selectedPersona, lastMessage.text || '')
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setSpeakingLocal(false)
      })

    return () => {
      cancelled = true
    }
  }, [messages, phase, practiceMediaMode, selectedPersona])

  useEffect(() => {
    if (phase !== 'running') {
      setCaption('')
      setSpeakingLocal(false)
      setShowTranscript(false)
      lastSpokenMessageIdRef.current = null
    }
  }, [phase])

  useEffect(() => {
    if (phase === 'finished' && evaluation?.sessionId) {
      navigate(`/modules/training-ai/relatorio/sessao/${evaluation.sessionId}`, { replace: true })
    } else if (phase === 'finished') {
      navigate(`/modules/training-ai/relatorio/${scenarioId}`, { replace: true })
    }
  }, [evaluation, navigate, phase, scenarioId])

  const scenario =
    selectedScenario || scenarios.find((item) => item.id === scenarioId) || null
  const persona = selectedPersona
  const linkedDefaultId = scenario?.personaId

  async function handleSend(event) {
    event.preventDefault()
    if (isGeneratingReply || isJudging) return
    setBusyHint('')
    const ok = await sendMessage(draft)
    if (ok) {
      setDraft('')
      setFinishHint('')
    } else {
      setBusyHint('Não foi possível gerar a resposta do agente. Tente de novo.')
    }
  }

  async function handleFinish() {
    if (isGeneratingReply || isJudging) return
    setBusyHint('')
    const ok = await finishSession()
    if (!ok) {
      setFinishHint('Envie ao menos uma resposta antes de encerrar o treino.')
    }
  }

  if (bootError) {
    return (
      <section className="imp-module">
        <div className="training-ai__empty">
          <h3>Não foi possível iniciar</h3>
          <p>{bootError}</p>
          <div className="imp-actions">
            <Link to="/modules/training-ai" className="imp-btn imp-btn--primary">
              Voltar ao catálogo
            </Link>
          </div>
        </div>
      </section>
    )
  }

  if (!scenario || phase === 'idle') {
    return (
      <section className="imp-module">
        <div className="training-ai__empty">
          <h3>{scenario ? 'Preparando simulação…' : 'Cenário não encontrado'}</h3>
          <p>
            {scenario
              ? 'Carregando agente e briefing.'
              : 'Volte ao catálogo e selecione um treinamento válido.'}
          </p>
          {!scenario ? (
            <div className="imp-actions">
              <Link to="/modules/training-ai" className="imp-btn imp-btn--primary">
                Ir ao catálogo
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    )
  }

  const phaseLabel =
    phase === 'setup'
      ? 'Escolher agente'
      : phase === 'briefing'
        ? 'Briefing'
        : practiceMediaMode === 'voice'
          ? 'Conversa · Voz (avatar mock)'
          : 'Conversa por texto'

  const callState = isGeneratingReply
    ? 'connecting'
    : speakingLocal
      ? 'speaking'
      : listening
        ? 'listening'
        : 'idle'

  return (
    <section className="imp-module">
      <header className="training-ai__page-header">
        <div>
          <h2>Simulação IA</h2>
          <p>
            {scenario.title} · {scenario.funnelStage}
          </p>
        </div>
        <div className="training-ai__page-header-actions">
          <span className="imp-pill imp-pill--blue">{phaseLabel}</span>
          <Link to="/modules/training-ai" className="imp-btn imp-btn--ghost">
            ← Catálogo
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
                {personas.map((item) => {
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
                  Escolha Texto ou Voz (chrome stub). O motor permanece texto até STT/TTS; ao
                  final o playbook gera score na Central de Insights.
                </dd>
              </dl>
              <VoicePracticeChrome
                mediaMode={practiceMediaMode}
                onMediaModeChange={setPracticeMediaMode}
                listening={false}
                onListeningChange={() => {}}
              />
              <button
                type="button"
                className="imp-btn imp-btn--primary"
                onClick={beginConversation}
                style={{ marginTop: '1rem' }}
              >
                Iniciar conversa
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
                  onListeningChange={setListening}
                  onFinish={handleFinish}
                  showTranscript={showTranscript}
                  onToggleTranscript={setShowTranscript}
                />
              ) : (
                <VoicePracticeChrome
                  mediaMode={practiceMediaMode}
                  onMediaModeChange={setPracticeMediaMode}
                  listening={listening}
                  onListeningChange={setListening}
                />
              )}

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
                      Resposta em andamento (provider async)
                    </div>
                  ) : null}
                </div>
              ) : null}

              <form className="training-ai__composer" onSubmit={handleSend}>
                <label className="imp-field training-ai__composer-field">
                  <span>
                    {practiceMediaMode === 'voice'
                      ? 'O que você falaria (texto até STT)'
                      : 'Sua resposta'}
                  </span>
                  <textarea
                    rows={3}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    disabled={isGeneratingReply || isJudging}
                    placeholder={
                      practiceMediaMode === 'voice'
                        ? 'Digite a fala que gravaria — áudio real ainda não conectado…'
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
    </section>
  )
}
