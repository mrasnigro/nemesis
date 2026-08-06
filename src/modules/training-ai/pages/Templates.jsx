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
          <h2>Playbooks de Score</h2>
          <p>Defina etapas, critérios e pesos — a régua que audita cada simulação.</p>
        </div>
        <div className="training-ai__page-header-actions">
          {canManage ? (
            <Link to="/modules/training-ai/templates/novo" className="imp-btn imp-btn--primary">
              + Novo playbook
            </Link>
          ) : null}
        </div>
      </header>

      <div className="imp-panel">
        {evaluationTemplates.length === 0 ? (
          <div className="training-ai__empty">
            <h3>Nenhum playbook cadastrado</h3>
            <p>Crie uma rubrica com etapas e pesos para gerar notas 0–100.</p>
            <div className="imp-actions">
              {canManage ? (
                <Link
                  to="/modules/training-ai/templates/novo"
                  className="imp-btn imp-btn--primary"
                >
                  + Novo playbook
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="training-ai__scenario-catalog">
            {evaluationTemplates.map((template) => {
              const criteria = flattenCriteria(template)
              const linked = getScenariosForTemplate(template.id)
              const stages = template.sections?.length || 0
              return (
                <article key={template.id} className="training-ai__scenario-card">
                  <header className="training-ai__scenario-card-head">
                    <div>
                      <h3>{template.title}</h3>
                      <p>
                        {contactLabel(template.contactType)} · {stages} etapa
                        {stages === 1 ? '' : 's'} · {criteria.length} critérios
                      </p>
                    </div>
                    <span className="imp-pill imp-pill--green">Ativo</span>
                  </header>
                  <p className="training-ai__scenario-card-desc">{template.description}</p>
                  <p className="training-ai__meta">
                    Score máximo {totalTemplateWeight(template)} · {linked.length} cenário
                    {linked.length === 1 ? '' : 's'}
                  </p>
                  <div className="imp-actions">
                    <button
                      type="button"
                      className="imp-btn imp-btn--ghost"
                      onClick={() => navigate(`/modules/training-ai/templates/${template.id}`)}
                    >
                      Abrir timeline
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
