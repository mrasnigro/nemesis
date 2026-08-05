import { Link, useNavigate } from 'react-router-dom'
import { CONTACT_TYPE_OPTIONS, flattenCriteria, totalTemplateWeight } from '../data/evaluationTemplates.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import '../styles/training-ai.css'

function contactLabel(contactType) {
  return CONTACT_TYPE_OPTIONS.find((item) => item.id === contactType)?.label || contactType
}

export default function TrainingTemplatesPage() {
  const navigate = useNavigate()
  const { evaluationTemplates, canManage, getScenariosForTemplate } = useTrainingAi()

  return (
    <section className="imp-module">
      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Templates de avaliação</h2>
            <p>Rubricas configuráveis ligadas a cenários e relatórios (mock).</p>
          </div>
          {canManage ? (
            <Link to="/modules/training-ai/templates/novo" className="imp-btn imp-btn--primary">
              + Novo template
            </Link>
          ) : null}
        </div>

        {evaluationTemplates.length === 0 ? (
          <div className="imp-empty">Nenhum template cadastrado.</div>
        ) : (
          <div className="training-ai__scenario-catalog">
            {evaluationTemplates.map((template) => {
              const criteria = flattenCriteria(template)
              const linked = getScenariosForTemplate(template.id)
              return (
                <article key={template.id} className="training-ai__scenario-card">
                  <header className="training-ai__scenario-card-head">
                    <div>
                      <h3>{template.title}</h3>
                      <p>
                        {contactLabel(template.contactType)} · {criteria.length} critério
                        {criteria.length === 1 ? '' : 's'} · peso {totalTemplateWeight(template)}
                      </p>
                    </div>
                    <span className="imp-pill imp-pill--blue">Rubrica</span>
                  </header>
                  <p className="training-ai__scenario-card-desc">{template.description}</p>
                  <p className="training-ai__meta">
                    {linked.length} cenário{linked.length === 1 ? '' : 's'} vinculado
                    {linked.length === 1 ? '' : 's'}
                  </p>
                  <div className="imp-actions">
                    <button
                      type="button"
                      className="imp-btn imp-btn--ghost"
                      onClick={() => navigate(`/modules/training-ai/templates/${template.id}`)}
                    >
                      Abrir
                    </button>
                    {canManage ? (
                      <button
                        type="button"
                        className="imp-btn imp-btn--ghost"
                        onClick={() =>
                          navigate(`/modules/training-ai/templates/${template.id}/editar`)
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
