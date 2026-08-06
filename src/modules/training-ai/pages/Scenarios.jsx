import { Link, useNavigate } from 'react-router-dom'
import { DIFFICULTY_LABELS } from '../data/catalogs.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

export default function TrainingScenariosPage() {
  const navigate = useNavigate()
  const { scenarios, canManage, getPersona, getEvaluationTemplate } = useTrainingAi()

  return (
    <section className="imp-module">
      <header className="training-ai__page-header">
        <div>
          <h2>Cenários</h2>
          <p>Treinamentos que ligam persona, objetivo e rubrica de avaliação.</p>
        </div>
        <div className="training-ai__page-header-actions">
          {canManage ? (
            <Link to="/modules/training-ai/cenarios/novo" className="imp-btn imp-btn--primary">
              + Novo cenário
            </Link>
          ) : null}
        </div>
      </header>

      <div className="imp-panel">
        {scenarios.length === 0 ? (
          <div className="training-ai__empty">
            <h3>Nenhum cenário cadastrado</h3>
            <p>Crie um cenário para disponibilizar treinos no catálogo.</p>
            <div className="imp-actions">
              {canManage ? (
                <Link to="/modules/training-ai/cenarios/novo" className="imp-btn imp-btn--primary">
                  + Novo cenário
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="training-ai__scenario-catalog">
            {scenarios.map((scenario) => {
              const persona = getPersona(scenario.personaId)
              const template = getEvaluationTemplate(scenario.evaluationTemplateId)
              return (
                <article key={scenario.id} className="training-ai__scenario-card">
                  <header className="training-ai__scenario-card-head">
                    <div>
                      <h3>{scenario.title}</h3>
                      <p>
                        {scenario.funnelStage} · {scenario.industry || scenario.segment} ·{' '}
                        {scenario.durationMin} min
                      </p>
                    </div>
                    <span className="imp-pill imp-pill--amber">
                      {DIFFICULTY_LABELS[scenario.difficulty] || scenario.difficulty}
                    </span>
                  </header>
                  <p className="training-ai__scenario-card-desc">{scenario.description}</p>
                  <p className="training-ai__meta">Objetivo: {scenario.objective}</p>
                  <p className="training-ai__meta">
                    Persona: {persona?.name || '—'} · Template: {template?.title || '—'}
                  </p>
                  <div className="imp-actions">
                    <button
                      type="button"
                      className="imp-btn imp-btn--ghost"
                      onClick={() => navigate(`/modules/training-ai/cenarios/${scenario.id}`)}
                    >
                      Abrir
                    </button>
                    {canManage ? (
                      <button
                        type="button"
                        className="imp-btn imp-btn--ghost"
                        onClick={() =>
                          navigate(`/modules/training-ai/cenarios/${scenario.id}/editar`)
                        }
                      >
                        Editar
                      </button>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
