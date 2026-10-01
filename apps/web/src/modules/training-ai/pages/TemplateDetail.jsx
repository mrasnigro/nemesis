import { Link, useParams } from 'react-router-dom'
import WeightRing from '../components/WeightRing.jsx'
import {
  CONTACT_TYPE_OPTIONS,
  flattenCriteria,
  totalTemplateWeight,
} from '../data/evaluationTemplates.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import { sectionWeightsFromTemplate } from '../utils/agentDisplay.js'

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
  const sectionWeights = template ? sectionWeightsFromTemplate(template) : []

  if (!template) {
    return (
      <section className="imp-module">
        <div className="training-ai__empty">
          <h3>Playbook não encontrado</h3>
          <div className="imp-actions">
            <Link to="/modules/training-ai/templates" className="imp-btn imp-btn--primary">
              Voltar aos playbooks
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
            Modelo ativo · {contactLabel(template.contactType)} ·{' '}
            {template.sections?.length || 0} etapas · {criteria.length} critérios · score{' '}
            {totalTemplateWeight(template)}
          </p>
        </div>
        <div className="training-ai__page-header-actions">
          <Link to="/modules/training-ai/templates" className="imp-btn imp-btn--ghost">
            ← Playbooks
          </Link>
          {canManage ? (
            <Link
              to={`/modules/training-ai/templates/${template.id}/editar`}
              className="imp-btn imp-btn--primary"
            >
              Editar playbook
            </Link>
          ) : null}
        </div>
      </header>

      <div className="imp-module__metrics">
        <article className="imp-metric">
          <p>Modelo ativo</p>
          <strong className="accent">Ativo</strong>
          <span>{template.title}</span>
        </article>
        <article className="imp-metric">
          <p>Total de etapas</p>
          <strong>{template.sections?.length || 0}</strong>
          <span>Timeline de vendas</span>
        </article>
        <article className="imp-metric">
          <p>Score máximo</p>
          <strong>{totalTemplateWeight(template)}%</strong>
          <span>Soma dos pesos</span>
        </article>
        <article className="imp-metric">
          <p>Critérios ativos</p>
          <strong>{criteria.length}</strong>
          <span>Perguntas sim/não</span>
        </article>
      </div>

      <div className="training-ai__playbook-layout">
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Timeline de etapas</h2>
              <p>{template.description}</p>
            </div>
            <span className="imp-pill imp-pill--blue">Lista</span>
          </div>

          <div className="training-ai__timeline">
            {(template.sections || []).map((section, index) => {
              const sectionWeight = (section.criteria || []).reduce(
                (sum, c) => sum + (Number(c.weight) || 0),
                0,
              )
              return (
                <div
                  key={section.id}
                  className="training-ai__timeline-stage"
                  data-index={index + 1}
                >
                  <div className="training-ai__rubric-section">
                    <div className="training-ai__rubric-section-head">
                      <div>
                        <h3>{section.name}</h3>
                        {section.description ? (
                          <p className="training-ai__meta">{section.description}</p>
                        ) : null}
                      </div>
                      <span>{sectionWeight}%</span>
                    </div>
                    {(section.criteria || []).map((criterion) => (
                      <div key={criterion.id} className="training-ai__criterion">
                        <span className="training-ai__criterion-mark is-weight">
                          {criterion.weight}
                        </span>
                        <div className="training-ai__criterion-body">
                          <strong>{criterion.name}</strong>
                          <p>{criterion.yesNoQuestion}</p>
                          <p className="training-ai__meta">{ruleLabel(criterion.passRule)}</p>
                        </div>
                        <span className="training-ai__criterion-weight">
                          {criterion.weight}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <aside className="training-ai__playbook-rail">
          <h3>Distribuição por etapa</h3>
          <WeightRing sections={sectionWeights} />
          <ul className="training-ai__dist-list">
            {sectionWeights.map((item) => (
              <li key={item.id}>
                <span>{item.name}</span>
                <strong>{item.weight}%</strong>
              </li>
            ))}
          </ul>
          <p className="training-ai__meta" style={{ textAlign: 'center' }}>
            Playbook publicado para uso em cenários.
          </p>
        </aside>
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Cenários vinculados</h2>
            <p>Sessões usam este playbook ao gerar o relatório.</p>
          </div>
        </div>
        {linkedScenarios.length === 0 ? (
          <div className="training-ai__empty">
            <h3>Nenhum cenário vinculado</h3>
            <p>Associe este playbook a um cenário de treino.</p>
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
