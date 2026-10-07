import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import TrainingPage from '../components/TrainingPage.jsx'
import {
  CONTACT_TYPE_OPTIONS,
  PASS_RULE_TYPES,
  createEmptyCriterionDraft,
  totalTemplateWeight,
} from '../data/evaluationTemplates.js'
import { SCENARIO_TYPES } from '../data/personas.js'
import WeightRing from '../components/WeightRing.jsx'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import { sectionWeightsFromTemplate } from '../utils/agentDisplay.js'

function newSection(index) {
  return {
    id: `sec_${Date.now()}_${index}`,
    name: '',
    description: '',
    criteria: [createEmptyCriterionDraft(1)],
  }
}

export default function TrainingTemplateFormPage() {
  const { templateId } = useParams()
  const isEdit = Boolean(templateId)
  const navigate = useNavigate()
  const {
    getEvaluationTemplate,
    createTemplate,
    updateTemplate,
    createEmptyTemplateDraft,
    templateToFormState,
    canManage,
  } = useTrainingAi()

  const existing = isEdit ? getEvaluationTemplate(templateId) : null

  const initial = useMemo(() => {
    if (existing) return templateToFormState(existing)
    return createEmptyTemplateDraft()
  }, [createEmptyTemplateDraft, existing, templateToFormState])

  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)

  const weightTotal = totalTemplateWeight(form)
  const sectionWeights = sectionWeightsFromTemplate(form)

  if (!canManage) {
    return (
      <TrainingPage>
        <div className="imp-empty">Sem permissão para gerenciar templates.</div>
      </TrainingPage>
    )
  }

  if (isEdit && !existing) {
    return (
      <TrainingPage>
        <div className="imp-empty">
          Template não encontrado. <Link to="/modules/training-ai/templates">Voltar</Link>
        </div>
      </TrainingPage>
    )
  }

  function patchRoot(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function patchSection(sectionIndex, field, value) {
    setForm((prev) => {
      const sections = prev.sections.map((section, index) =>
        index === sectionIndex ? { ...section, [field]: value } : section,
      )
      return { ...prev, sections }
    })
  }

  function patchCriterion(sectionIndex, criterionIndex, field, value) {
    setForm((prev) => {
      const sections = prev.sections.map((section, sIdx) => {
        if (sIdx !== sectionIndex) return section
        const criteria = section.criteria.map((criterion, cIdx) => {
          if (cIdx !== criterionIndex) return criterion
          if (field === 'passRuleType') {
            return {
              ...criterion,
              passRule: { ...criterion.passRule, type: value },
            }
          }
          return { ...criterion, [field]: value }
        })
        return { ...section, criteria }
      })
      return { ...prev, sections }
    })
  }

  function addSection() {
    setForm((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection(prev.sections.length + 1)],
    }))
  }

  function removeSection(sectionIndex) {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, index) => index !== sectionIndex),
    }))
  }

  function addCriterion(sectionIndex) {
    setForm((prev) => {
      const sections = prev.sections.map((section, index) => {
        if (index !== sectionIndex) return section
        return {
          ...section,
          criteria: [
            ...section.criteria,
            createEmptyCriterionDraft(section.criteria.length + 1),
          ],
        }
      })
      return { ...prev, sections }
    })
  }

  function removeCriterion(sectionIndex, criterionIndex) {
    setForm((prev) => {
      const sections = prev.sections.map((section, index) => {
        if (index !== sectionIndex) return section
        return {
          ...section,
          criteria: section.criteria.filter((_, cIdx) => cIdx !== criterionIndex),
        }
      })
      return { ...prev, sections }
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setErrors([])

    const result = isEdit ? await updateTemplate(templateId, form) : await createTemplate(form)
    setSaving(false)

    if (!result.ok) {
      setErrors(result.errors || [result.error || 'Não foi possível salvar.'])
      return
    }

    navigate(`/modules/training-ai/templates/${result.template.id}`)
  }

  return (
    <TrainingPage>
      <header className="training-ai__page-header">
        <div>
          <h2>{isEdit ? 'Editar playbook' : 'Novo playbook de score'}</h2>
          <p>Organize etapas, critérios auditáveis e pesos (soma 100).</p>
        </div>
        <div className="training-ai__page-header-actions">
          <Link
            to={
              isEdit
                ? `/modules/training-ai/templates/${templateId}`
                : '/modules/training-ai/templates'
            }
            className="imp-btn imp-btn--ghost"
          >
            ← Cancelar
          </Link>
        </div>
      </header>

      <div className="training-ai__playbook-layout">
      <form className="imp-panel training-ai__form" onSubmit={handleSubmit}>
        <div className="imp-panel__header">
          <div>
            <h2>Editor de etapas</h2>
            <p>Critérios com perguntas sim/não e regras por palavras-chave.</p>
          </div>
          <span
            className={`imp-pill ${weightTotal === 100 ? 'imp-pill--green' : 'imp-pill--rose'}`}
          >
            Pesos: {weightTotal}/100
          </span>
        </div>

        {errors.length ? (
          <ul className="training-ai__form-errors">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}

        <div className="training-ai__form-grid">
          <label className="imp-field training-ai__form-span-2">
            <span>Nome</span>
            <input
              value={form.title}
              onChange={(event) => patchRoot('title', event.target.value)}
              required
            />
          </label>

          <label className="imp-field training-ai__form-span-2">
            <span>Descrição</span>
            <textarea
              rows={2}
              value={form.description}
              onChange={(event) => patchRoot('description', event.target.value)}
              required
            />
          </label>

          <label className="imp-field">
            <span>Tipo de contato</span>
            <select
              value={form.contactType}
              onChange={(event) => patchRoot('contactType', event.target.value)}
            >
              {CONTACT_TYPE_OPTIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="imp-field training-ai__form-span-2">
            <legend>Cenários compatíveis</legend>
            <div className="training-ai__chip-row">
              {SCENARIO_TYPES.map((item) => {
                const selected = (form.scenarioTypes || []).includes(item.id)
                return (
                  <label key={item.id} className="training-ai__trait">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {
                        const current = form.scenarioTypes || []
                        patchRoot(
                          'scenarioTypes',
                          selected ? current.filter((id) => id !== item.id) : [...current, item.id],
                        )
                      }}
                    />{' '}
                    {item.label}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <label className="imp-field">
            <span>Publicação</span>
            <select
              value={form.status || 'draft'}
              onChange={(event) => patchRoot('status', event.target.value)}
            >
              <option value="published">Publicado</option>
              <option value="draft">Rascunho</option>
            </select>
          </label>
        </div>

        {(form.sections || []).map((section, sectionIndex) => (
          <div key={section.id || sectionIndex} className="training-ai__template-section">
            <div className="training-ai__template-section-head">
              <label className="imp-field">
                <span>Etapa</span>
                <input
                  value={section.name}
                  onChange={(event) => patchSection(sectionIndex, 'name', event.target.value)}
                  placeholder="Ex.: Abertura"
                  required
                />
              </label>
              <label className="imp-field">
                <span>Descrição da etapa</span>
                <input
                  value={section.description || ''}
                  onChange={(event) =>
                    patchSection(sectionIndex, 'description', event.target.value)
                  }
                  placeholder="Ex.: Estabelecer contato e gerar interesse"
                />
              </label>
              <div className="imp-actions">
                <button
                  type="button"
                  className="imp-btn imp-btn--ghost"
                  onClick={() => addCriterion(sectionIndex)}
                >
                  + Critério
                </button>
                {form.sections.length > 1 ? (
                  <button
                    type="button"
                    className="imp-btn imp-btn--ghost"
                    onClick={() => removeSection(sectionIndex)}
                  >
                    Remover seção
                  </button>
                ) : null}
              </div>
            </div>

            {(section.criteria || []).map((criterion, criterionIndex) => (
              <div
                key={criterion.id || criterionIndex}
                className="training-ai__template-criterion"
              >
                <div className="training-ai__form-grid">
                  <label className="imp-field">
                    <span>Critério</span>
                    <input
                      value={criterion.name}
                      onChange={(event) =>
                        patchCriterion(sectionIndex, criterionIndex, 'name', event.target.value)
                      }
                      required
                    />
                  </label>
                  <label className="imp-field">
                    <span>Peso</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={criterion.weight}
                      onChange={(event) =>
                        patchCriterion(
                          sectionIndex,
                          criterionIndex,
                          'weight',
                          event.target.value,
                        )
                      }
                      required
                    />
                  </label>
                  <label className="imp-field training-ai__form-span-2">
                    <span>Pergunta pass/fail</span>
                    <input
                      value={criterion.yesNoQuestion}
                      onChange={(event) =>
                        patchCriterion(
                          sectionIndex,
                          criterionIndex,
                          'yesNoQuestion',
                          event.target.value,
                        )
                      }
                      placeholder="O vendedor fez X?"
                      required
                    />
                  </label>
                  <label className="imp-field">
                    <span>Regra</span>
                    <select
                      value={criterion.passRule?.type || 'keywords'}
                      onChange={(event) =>
                        patchCriterion(
                          sectionIndex,
                          criterionIndex,
                          'passRuleType',
                          event.target.value,
                        )
                      }
                    >
                      {PASS_RULE_TYPES.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="imp-field">
                    <span>Palavras-chave (uma por linha)</span>
                    <textarea
                      rows={2}
                      value={criterion.keywordsText || ''}
                      onChange={(event) =>
                        patchCriterion(
                          sectionIndex,
                          criterionIndex,
                          'keywordsText',
                          event.target.value,
                        )
                      }
                      required
                    />
                  </label>
                </div>
                {section.criteria.length > 1 ? (
                  <button
                    type="button"
                    className="imp-btn imp-btn--ghost"
                    onClick={() => removeCriterion(sectionIndex, criterionIndex)}
                  >
                    Remover critério
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ))}

        <div className="imp-actions">
          <button type="button" className="imp-btn imp-btn--ghost" onClick={addSection}>
            + Nova etapa
          </button>
          <button type="submit" className="imp-btn imp-btn--primary" disabled={saving}>
            {saving ? 'Salvando…' : isEdit ? 'Publicar alterações' : 'Criar playbook'}
          </button>
        </div>
      </form>

      <aside className="training-ai__playbook-rail">
        <h3>Distribuição ao vivo</h3>
        <WeightRing sections={sectionWeights} />
        <ul className="training-ai__dist-list">
          {sectionWeights.map((item) => (
            <li key={item.id}>
              <span>{item.name || 'Etapa'}</span>
              <strong>{item.weight}%</strong>
            </li>
          ))}
        </ul>
        <p className="training-ai__meta" style={{ textAlign: 'center' }}>
          {weightTotal === 100
            ? 'Pesos prontos para publicar.'
            : `Ajuste os pesos até 100 (atual: ${weightTotal}).`}
        </p>
      </aside>
      </div>
    </TrainingPage>
  )
}
