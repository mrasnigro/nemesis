import { Link, useNavigate, useParams } from 'react-router-dom'
import { DIFFICULTY_LABELS } from '../data/catalogs.js'
import { getEvaluationTemplate } from '../data/evaluationTemplates.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import '../styles/training-ai.css'

export default function TrainingScenarioDetailPage() {
  const { scenarioId } = useParams()
  const navigate = useNavigate()
  const {
    getScenario,
    getPersona,
    canManage,
    canSimulate,
    startSimulation,
  } = useTrainingAi()

  const scenario = getScenario(scenarioId)
  const persona = scenario ? getPersona(scenario.personaId) : null
  const template = scenario
    ? getEvaluationTemplate(scenario.evaluationTemplateId)
    : null

  if (!scenario) {
    return (
      <section className="imp-module">
        <div className="imp-empty">
          Cenário não encontrado. <Link to="/modules/training-ai/cenarios">Voltar</Link>
        </div>
      </section>
    )
  }

  function handleStart() {
    const started = startSimulation(scenario.id)
    if (started) navigate(`/modules/training-ai/simulacao/${scenario.id}`)
  }

  return (
    <section className="imp-module">
      <div className="imp-actions">
        <Link to="/modules/training-ai/cenarios" className="imp-btn imp-btn--ghost">
          ← Cenários
        </Link>
        {canManage ? (
          <Link
            to={`/modules/training-ai/cenarios/${scenario.id}/editar`}
            className="imp-btn imp-btn--ghost"
          >
            Editar cenário
          </Link>
        ) : null}
        <button
          type="button"
          className="imp-btn imp-btn--primary"
          disabled={!canSimulate}
          onClick={handleStart}
        >
          Treinar
        </button>
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>{scenario.title}</h2>
            <p>
              {scenario.funnelStage} · {scenario.industry || scenario.segment}
              {scenario.durationMin ? ` · ${scenario.durationMin} min` : ''}
            </p>
          </div>
          <span className="imp-pill imp-pill--amber">
            {DIFFICULTY_LABELS[scenario.difficulty] || scenario.difficulty}
          </span>
        </div>

        <dl className="training-ai__persona-detail-grid">
          <div>
            <dt>Descrição</dt>
            <dd>{scenario.description}</dd>
          </div>
          <div>
            <dt>Objetivo</dt>
            <dd>{scenario.objective}</dd>
          </div>
          <div>
            <dt>Indústria</dt>
            <dd>{scenario.industry || scenario.segment}</dd>
          </div>
          <div>
            <dt>Estágio do funil</dt>
            <dd>{scenario.funnelStage}</dd>
          </div>
          <div>
            <dt>Persona vinculada</dt>
            <dd>
              {persona ? (
                <Link to={`/modules/training-ai/personas/${persona.id}`}>{persona.name}</Link>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt>Template de avaliação</dt>
            <dd>{template?.title || scenario.evaluationTemplateId}</dd>
          </div>
          <div className="training-ai__form-span-2">
            <dt>Instruções da conversa</dt>
            <dd>{scenario.sellerInstructions}</dd>
          </div>
        </dl>

        {scenario.focus?.length ? (
          <div className="training-ai__hints">
            <h3>Focos</h3>
            <ul>
              {scenario.focus.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {scenario.scriptHints?.length ? (
          <div className="training-ai__hints">
            <h3>Dicas do coach</h3>
            <ul>
              {scenario.scriptHints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  )
}
