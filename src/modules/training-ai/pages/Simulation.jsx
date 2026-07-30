import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

export default function TrainingSimulationPage() {
  const { scenarioId } = useParams()
  const navigate = useNavigate()
  const {
    scenarios,
    selectedScenario,
    messages,
    currentTurn,
    phase,
    canSimulate,
    startSimulation,
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
              <p>{scenario.title}</p>
            </div>
            <span className="imp-pill imp-pill--blue">Ao vivo</span>
          </div>

          <div className="imp-chat">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`imp-chat__bubble imp-chat__bubble--${message.role === 'ai' ? 'ai' : 'user'}`}
              >
                <span className="imp-chat__meta">
                  {message.role === 'ai' ? scenario.persona.name : 'Você'}
                </span>
                {message.text}
              </div>
            ))}
          </div>

          {currentTurn ? (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ margin: '0 0 0.65rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Escolha a melhor resposta:
              </p>
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
        </div>

        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Persona</h2>
              <p>Contexto da simulação</p>
            </div>
          </div>
          <dl style={{ margin: 0, display: 'grid', gap: '0.75rem' }}>
            <div>
              <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Nome</dt>
              <dd style={{ margin: '0.2rem 0 0', fontWeight: 700 }}>{scenario.persona.name}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Cargo</dt>
              <dd style={{ margin: '0.2rem 0 0' }}>{scenario.persona.role}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Empresa</dt>
              <dd style={{ margin: '0.2rem 0 0' }}>{scenario.persona.company}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Humor</dt>
              <dd style={{ margin: '0.2rem 0 0' }}>{scenario.persona.mood}</dd>
            </div>
          </dl>

          <div style={{ marginTop: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Dicas do coach</h3>
            <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-muted)' }}>
              {scenario.scriptHints.map((hint) => (
                <li key={hint} style={{ marginBottom: '0.35rem' }}>
                  {hint}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
