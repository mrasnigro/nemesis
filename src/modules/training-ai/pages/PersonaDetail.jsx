import { Link, useNavigate, useParams } from 'react-router-dom'
import AgentAvatar from '../components/AgentAvatar.jsx'
import { DIFFICULTY_LABELS } from '../data/catalogs.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import { derivePersonaTraits, personaStatus } from '../utils/agentDisplay.js'

export default function TrainingPersonaDetailPage() {
  const { personaId } = useParams()
  const navigate = useNavigate()
  const {
    getPersona,
    getScenariosForPersona,
    canManage,
    canSimulate,
    startSimulation,
  } = useTrainingAi()

  const persona = getPersona(personaId)
  const linkedScenarios = getScenariosForPersona(personaId)

  if (!persona) {
    return (
      <section className="imp-module">
        <div className="training-ai__empty">
          <h3>Agente não encontrado</h3>
          <p>Volte à lista e selecione um agente válido.</p>
          <div className="imp-actions">
            <Link to="/modules/training-ai/personas" className="imp-btn imp-btn--primary">
              Voltar aos agentes
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const status = personaStatus(persona)
  const traits = derivePersonaTraits(persona)

  function handleStart(scenarioId) {
    const started = startSimulation(scenarioId, { personaId: persona.id })
    if (started) navigate(`/modules/training-ai/simulacao/${scenarioId}`)
  }

  return (
    <section className="imp-module">
      <header className="training-ai__page-header">
        <div className="training-ai__chip-row">
          <AgentAvatar id={persona.id} name={persona.name} size="lg" />
          <div>
            <h2>{persona.name}</h2>
            <p>
              {persona.role} · {persona.industry}
              {persona.location ? ` · ${persona.location}` : ''}
            </p>
            <div className="training-ai__chip-row" style={{ marginTop: '0.55rem' }}>
              <span className={`training-ai__status-dot training-ai__status-dot--${status.tone}`}>
                {status.label}
              </span>
              <span className="imp-pill imp-pill--amber">
                {DIFFICULTY_LABELS[persona.difficulty] || persona.difficulty}
              </span>
              {traits.map((trait, index) => (
                <span
                  key={trait}
                  className={`training-ai__trait training-ai__trait--${index % 3}`}
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="training-ai__page-header-actions">
          <Link to="/modules/training-ai/personas" className="imp-btn imp-btn--ghost">
            ← Agentes
          </Link>
          {canManage ? (
            <Link
              to={`/modules/training-ai/personas/${persona.id}/editar`}
              className="imp-btn imp-btn--primary"
            >
              Editar agente
            </Link>
          ) : null}
        </div>
      </header>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>DNA comportamental</h2>
            <p>Perfil usado nas simulações de treino</p>
          </div>
        </div>

        <dl className="training-ai__persona-detail-grid">
          <div>
            <dt>Empresa</dt>
            <dd>{persona.company || '—'}</dd>
          </div>
          <div>
            <dt>Tipo de negociador</dt>
            <dd>{persona.negotiatorType}</dd>
          </div>
          <div>
            <dt>Comportamento</dt>
            <dd>{persona.behavior}</dd>
          </div>
          <div>
            <dt>Objetivo de treinamento</dt>
            <dd>{persona.trainingObjective}</dd>
          </div>
          <div className="training-ai__form-span-2">
            <dt>Frase de abertura</dt>
            <dd>{persona.openingLine}</dd>
          </div>
          <div>
            <dt>Objeções</dt>
            <dd>
              <ul className="training-ai__list training-ai__list--muted">
                {persona.objections.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </dd>
          </div>
          {persona.priorities?.length ? (
            <div>
              <dt>Prioridades</dt>
              <dd>
                <ul className="training-ai__list training-ai__list--muted">
                  {persona.priorities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Cenários vinculados</h2>
            <p>Simulações conectadas a este agente.</p>
          </div>
        </div>
        {linkedScenarios.length === 0 ? (
          <div className="training-ai__empty">
            <h3>Nenhum cenário vinculado</h3>
            <p>Associe este agente a um cenário ou inicie treinos pelo catálogo.</p>
          </div>
        ) : (
          <div className="imp-list">
            {linkedScenarios.map((scenario) => (
              <div key={scenario.id} className="imp-list-item">
                <div>
                  <h3>
                    <Link to={`/modules/training-ai/cenarios/${scenario.id}`}>
                      {scenario.title}
                    </Link>
                  </h3>
                  <p>
                    {scenario.funnelStage} · {scenario.industry || scenario.segment} ·{' '}
                    {scenario.durationMin} min
                  </p>
                </div>
                <button
                  type="button"
                  className="imp-btn imp-btn--primary"
                  disabled={!canSimulate}
                  onClick={() => handleStart(scenario.id)}
                >
                  Treinar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
