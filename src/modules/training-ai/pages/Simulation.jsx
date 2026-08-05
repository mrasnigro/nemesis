import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import '../styles/training-ai.css'

export default function TrainingSimulationPage() {
  const { scenarioId } = useParams()
  const navigate = useNavigate()
  const {
    scenarios,
    selectedScenario,
    selectedPersona,
    messages,
    currentTurn,
    phase,
    canSimulate,
    startSimulation,
    beginConversation,
    chooseOption,
  } = useTrainingAi()

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

  if (!scenario) {
    return (
      <section className="imp-module">
        <div className="imp-empty">Cenário não encontrado.</div>
      </section>
    )
  }

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
            <span className="imp-pill imp-pill--blue">
              {phase === 'briefing' ? 'Briefing' : 'Ao vivo (mock)'}
            </span>
          </div>

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
                <dt>Avaliação</dt>
                <dd>
                  A conversa usa rubrica com critérios e pesos. Escolha as melhores respostas —
                  simulação textual (sem voz/LLM).
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
          ) : (
            <>
              <div className="imp-chat">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`imp-chat__bubble imp-chat__bubble--${
                      message.role === 'ai' ? 'ai' : 'user'
                    }`}
                  >
                    <span className="imp-chat__meta">
                      {message.role === 'ai' ? persona?.name || 'Persona' : 'Você'}
                    </span>
                    {message.text}
                  </div>
                ))}
              </div>

              {currentTurn ? (
                <div className="training-ai__options">
                  <p className="training-ai__options-hint">Escolha a melhor resposta:</p>
                  <div className="imp-list">
                    {currentTurn.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className="imp-list-item"
                        onClick={() => chooseOption(option)}
                      >
                        <div>
                          <h3>{option.label}</h3>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
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
                <dt>Empresa</dt>
                <dd>{persona.company}</dd>
              </div>
              <div>
                <dt>Negociador</dt>
                <dd>{persona.negotiatorType}</dd>
              </div>
              <div>
                <dt>Humor</dt>
                <dd>{persona.mood}</dd>
              </div>
            </dl>
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
