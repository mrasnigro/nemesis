import { Link, useNavigate } from 'react-router-dom'
import {
  CONTACT_TYPE_OPTIONS,
  flattenCriteria,
  totalTemplateWeight,
} from '../data/evaluationTemplates.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

function contactLabel(contactType) {
  return CONTACT_TYPE_OPTIONS.find((item) => item.id === contactType)?.label || contactType
}

export default function TrainingTemplatesPage() {
  const navigate = useNavigate()
  const { evaluationTemplates, canManage, getScenariosForTemplate } = useTrainingAi()

  return (
    <section className="imp-module">
      <header className="training-ai__page-header">
        <div>
          <h2>Templates de avaliação</h2>
          <p>Rubricas com seções, critérios e pesos usados nos relatórios.</p>
        </div>
        <div className="training-ai__page-header-actions">
          {canManage ? (
            <Link to="/modules/training-ai/templates/novo" className="imp-btn imp-btn--primary">
              + Novo template
            </Link>
          ) : null}
        </div>
      </header>

      <div className="imp-panel">
        {evaluationTemplates.length === 0 ? (
          <div className="training-ai__empty">
            <h3>Nenhum template cadastrado</h3>
            <p>Defina uma rubrica para medir desempenho nas simulações.</p>
            <div className="imp-actions">
              {canManage ? (
                <Link
                  to="/modules/training-ai/templates/novo"
                  className="imp-btn imp-btn--primary"
                >
                  + Novo template
                </Link>
              ) : null}
            </div>
          </div>
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
