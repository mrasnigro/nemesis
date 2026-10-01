import { Link, useNavigate, useParams } from 'react-router-dom'
import DeleteAction from '../components/DeleteAction.jsx'
import { DIFFICULTY_LABELS } from '../data/catalogs.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

export default function TrainingScenarioDetailPage() {
  const { scenarioId } = useParams()
  const navigate = useNavigate()
  const {
    getScenario,
    getPersona,
    getEvaluationTemplate,
    canManage,
    canSimulate,
    deleteScenario,
  } = useTrainingAi()

  const scenario = getScenario(scenarioId)
  const persona = scenario ? getPersona(scenario.personaId) : null
  const template = scenario
    ? getEvaluationTemplate(scenario.evaluationTemplateId)
    : null

  if (!scenario) {
    return (
      <section className="imp-module">
        <div className="training-ai__empty">
          <h3>Cenário não encontrado</h3>
          <p>Volte à lista e selecione um cenário válido.</p>
          <div className="imp-actions">
            <Link to="/modules/training-ai/cenarios" className="imp-btn imp-btn--primary">
              Voltar aos cenários
            </Link>
          </div>
        </div>
      </section>
    )
  }

  function handleStart() {
    navigate(`/modules/training-ai/simulacao/${scenario.id}`)
  }

  return (
    <section className="imp-module">
      <header className="training-ai__page-header">
        <div>
          <h2>{scenario.title}</h2>
          <p>
            {scenario.funnelStage} · {scenario.industry || scenario.segment}
            {scenario.durationMin ? ` · ${scenario.durationMin} min` : ''}
          </p>
        </div>
        <div className="training-ai__page-header-actions">
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
          {canManage ? (
            <DeleteAction
              confirmText={`Excluir o cenário "${scenario.title}"? Essa ação não pode ser desfeita.`}
              onDelete={() => deleteScenario(scenario.id)}
              onDeleted={() => navigate('/modules/training-ai/cenarios')}
            />
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
      </header>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Detalhes do cenário</h2>
            <p>Objetivo, vínculos e briefing do treino</p>
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
            <dd>
              {template ? (
                <Link to={`/modules/training-ai/templates/${template.id}`}>
                  {template.title}
                </Link>
              ) : (
                scenario.evaluationTemplateId
              )}
            </dd>
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
