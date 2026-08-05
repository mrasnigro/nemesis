import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { DIFFICULTY_LABELS } from '../data/catalogs.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import '../styles/training-ai.css'

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

export default function TrainingSimulationPage() {
  const { scenarioId } = useParams()
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
    sendMessage,
    finishSession,
  } = useTrainingAi()

  const [draft, setDraft] = useState('')
  const [finishHint, setFinishHint] = useState('')

  useEffect(() => {
    if (!canSimulate) return
    if (!selectedScenario || selectedScenario.id !== scenarioId) {
      const started = startSimulation(scenarioId)
      if (!started) navigate('/modules/training-ai')
    }
  }, [canSimulate, navigate, scenarioId, selectedScenario, startSimulation])

  useEffect(() => {
    if (phase === 'finished') {
      navigate(`/modules/training-ai/relatorio/${scenarioId}`, { replace: true })
    }
  }, [navigate, phase, scenarioId])

  const scenario =
    selectedScenario || scenarios.find((item) => item.id === scenarioId) || null
  const persona = selectedPersona
  const linkedDefaultId = scenario?.personaId

  function handleSend(event) {
    event.preventDefault()
    const ok = sendMessage(draft)
    if (ok) {
      setDraft('')
      setFinishHint('')
    }
  }

  function handleFinish() {
    const ok = finishSession()
    if (!ok) {
      setFinishHint('Envie ao menos uma resposta antes de encerrar o treino.')
    }
  }

  if (!scenario) {
    return (
      <section className="imp-module">
        <div className="imp-empty">Cenário não encontrado.</div>
      </section>
    )
  }

  const phaseLabel =
    phase === 'setup'
      ? 'Escolher persona'
      : phase === 'briefing'
        ? 'Briefing'
        : 'Conversa livre (mock)'

  return (
    <section className="imp-module">
      <div className="imp-actions">
        <Link to="/modules/training-ai" className="imp-btn imp-btn--ghost">
          ← Voltar ao catálogo
        </Link>
      </div>

      <div className="imp-grid-2">
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Simulação IA</h2>
              <p>
                {scenario.title} · {scenario.funnelStage}
              </p>
            </div>
            <span className="imp-pill imp-pill--blue">{phaseLabel}</span>
          </div>

          {phase === 'setup' ? (
            <div className="training-ai__briefing">
              <dl className="training-ai__briefing-block">
                <dt>Cenário selecionado</dt>
                <dd>{scenario.description}</dd>
              </dl>
              <p className="training-ai__options-hint">
                Escolha a persona com quem você vai praticar a conversa livre.
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
              <dl className="training-ai__briefing-block">
                <dt>Persona</dt>
                <dd>
                  {persona?.name} — {persona?.role} em {persona?.company} (
                  {persona?.negotiatorType})
                </dd>
              </dl>
              <dl className="training-ai__briefing-block">
                <dt>Modo</dt>
                <dd>
                  Conversa livre por texto. Respostas da persona são mock (sem LLM, voz ou
                  avatar). Ao final, a rubrica avalia as suas falas por palavras-chave.
                </dd>
              </dl>
              <button
                type="button"
                className="imp-btn imp-btn--primary"
                onClick={beginConversation}
              >
                Iniciar conversa
              </button>
            </div>
          ) : null}

          {phase === 'running' ? (
            <>
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
              </div>

              <form className="training-ai__composer" onSubmit={handleSend}>
                <label className="imp-field training-ai__composer-field">
                  <span>Sua resposta</span>
                  <textarea
                    rows={3}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Escreva como falaria com o cliente…"
                  />
                </label>
                <div className="training-ai__composer-actions">
                  <button
                    type="submit"
                    className="imp-btn imp-btn--primary"
                    disabled={!draft.trim()}
                  >
                    Enviar
                  </button>
                  <button
                    type="button"
                    className="imp-btn imp-btn--ghost"
                    onClick={handleFinish}
                  >
                    Encerrar treinamento
                  </button>
                  <span className="training-ai__meta">
                    {userMessageCount} mensagem{userMessageCount === 1 ? '' : 'ens'} sua
                    {userMessageCount === 1 ? '' : 's'}
                  </span>
                </div>
                {finishHint ? <p className="training-ai__composer-hint">{finishHint}</p> : null}
              </form>
            </>
          ) : null}
        </div>

        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Persona</h2>
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
            <div className="imp-empty">Selecione uma persona para ver o contexto.</div>
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

          <div className="training-ai__hints">
            <h3>Dicas do coach</h3>
            <ul>
              {scenario.scriptHints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
