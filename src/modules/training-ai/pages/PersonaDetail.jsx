import { Link, useNavigate, useParams } from 'react-router-dom'
import { DIFFICULTY_LABELS } from '../data/catalogs.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import '../styles/training-ai.css'

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
        <div className="imp-empty">
          Persona não encontrada. <Link to="/modules/training-ai/personas">Voltar</Link>
        </div>
      </section>
    )
  }

  function handleStart(scenarioId) {
    const started = startSimulation(scenarioId, { personaId: persona.id })
    if (started) navigate(`/modules/training-ai/simulacao/${scenarioId}`)
  }

  return (
    <section className="imp-module">
      <div className="imp-actions">
        <Link to="/modules/training-ai/personas" className="imp-btn imp-btn--ghost">
          ← Personas
        </Link>
        {canManage ? (
          <Link
            to={`/modules/training-ai/personas/${persona.id}/editar`}
            className="imp-btn imp-btn--primary"
          >
            Editar persona
          </Link>
        ) : null}
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>{persona.name}</h2>
            <p>
              {persona.role} · {persona.industry}
              {persona.location ? ` · ${persona.location}` : ''}
            </p>
          </div>
          <span className="imp-pill imp-pill--amber">
            {DIFFICULTY_LABELS[persona.difficulty] || persona.difficulty}
          </span>
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
          <div>
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
            <p>Simulações conectadas a esta persona.</p>
          </div>
        </div>
        {linkedScenarios.length === 0 ? (
          <div className="imp-empty">
            Nenhum cenário seed aponta para esta persona ainda. Você ainda pode usá-la como
            referência de configuração.
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
                  <p>{scenario.objective || scenario.description}</p>
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
