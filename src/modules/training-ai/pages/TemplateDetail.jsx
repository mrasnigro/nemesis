import { Link, useParams } from 'react-router-dom'
import {
  CONTACT_TYPE_OPTIONS,
  flattenCriteria,
  totalTemplateWeight,
} from '../data/evaluationTemplates.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

function contactLabel(contactType) {
  return CONTACT_TYPE_OPTIONS.find((item) => item.id === contactType)?.label || contactType
}

function ruleLabel(passRule) {
  if (!passRule) return '—'
  if (passRule.type === 'avoid_keywords') {
    return `Evitar: ${(passRule.keywords || []).join(', ') || '—'}`
  }
  return `Incluir: ${(passRule.keywords || []).join(', ') || '—'}`
}

export default function TrainingTemplateDetailPage() {
  const { templateId } = useParams()
  const { getEvaluationTemplate, getScenariosForTemplate, canManage } = useTrainingAi()

  const template = getEvaluationTemplate(templateId)
  const linkedScenarios = template ? getScenariosForTemplate(template.id) : []
  const criteria = template ? flattenCriteria(template) : []

  if (!template) {
    return (
      <section className="imp-module">
        <div className="training-ai__empty">
          <h3>Template não encontrado</h3>
          <p>Volte à lista e selecione um template válido.</p>
          <div className="imp-actions">
            <Link to="/modules/training-ai/templates" className="imp-btn imp-btn--primary">
              Voltar aos templates
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="imp-module">
      <header className="training-ai__page-header">
        <div>
          <h2>{template.title}</h2>
          <p>
            {contactLabel(template.contactType)} · {criteria.length} critérios · pesos ={' '}
            {totalTemplateWeight(template)}
          </p>
        </div>
        <div className="training-ai__page-header-actions">
          <Link to="/modules/training-ai/templates" className="imp-btn imp-btn--ghost">
            ← Templates
          </Link>
          {canManage ? (
            <Link
              to={`/modules/training-ai/templates/${template.id}/editar`}
              className="imp-btn imp-btn--primary"
            >
              Editar template
            </Link>
          ) : null}
        </div>
      </header>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Rubrica</h2>
            <p>Seções e critérios usados no relatório</p>
          </div>
          <span className="imp-pill imp-pill--blue">Avaliação</span>
        </div>

        <dl className="training-ai__persona-detail-grid">
          <div>
            <dt>Descrição</dt>
            <dd>{template.description}</dd>
          </div>
          <div>
            <dt>Tipo de contato</dt>
            <dd>{contactLabel(template.contactType)}</dd>
          </div>
        </dl>

        <div className="training-ai__rubric training-ai__rubric--spaced">
          {(template.sections || []).map((section) => (
            <div key={section.id} className="training-ai__rubric-section">
              <div className="training-ai__rubric-section-head">
                <h3>{section.name}</h3>
                <span>
                  {section.criteria.reduce((sum, c) => sum + c.weight, 0)} pts
                </span>
              </div>
              {section.criteria.map((criterion) => (
                <div key={criterion.id} className="training-ai__criterion">
                  <span
                    className="training-ai__criterion-mark is-weight"
                    aria-hidden="true"
                  >
                    {criterion.weight}
                  </span>
                  <div className="training-ai__criterion-body">
                    <strong>{criterion.name}</strong>
                    <p>{criterion.yesNoQuestion}</p>
                    <p className="training-ai__meta">{ruleLabel(criterion.passRule)}</p>
                  </div>
                  <span className="training-ai__criterion-weight">{criterion.weight}%</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Cenários vinculados</h2>
            <p>Sessões usam esta rubrica ao gerar o relatório.</p>
          </div>
        </div>
        {linkedScenarios.length === 0 ? (
          <div className="training-ai__empty">
            <h3>Nenhum cenário vinculado</h3>
            <p>Associe este template a um cenário para usá-lo nas simulações.</p>
          </div>
        ) : (
          <div className="imp-list">
            {linkedScenarios.map((scenario) => (
              <Link
                key={scenario.id}
                to={`/modules/training-ai/cenarios/${scenario.id}`}
                className="imp-list-item"
              >
                <div>
                  <h3>{scenario.title}</h3>
                  <p>
                    {scenario.funnelStage} · {scenario.industry || scenario.segment}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
