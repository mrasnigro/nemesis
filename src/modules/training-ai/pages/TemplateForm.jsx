import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  CONTACT_TYPE_OPTIONS,
  PASS_RULE_TYPES,
  createEmptyCriterionDraft,
  totalTemplateWeight,
} from '../data/evaluationTemplates.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

function newSection(index) {
  return {
    id: `sec_${Date.now()}_${index}`,
    name: '',
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

  if (!canManage) {
    return (
      <section className="imp-module">
        <div className="imp-empty">Sem permissão para gerenciar templates.</div>
      </section>
    )
  }

  if (isEdit && !existing) {
    return (
      <section className="imp-module">
        <div className="imp-empty">
          Template não encontrado. <Link to="/modules/training-ai/templates">Voltar</Link>
        </div>
      </section>
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

  function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setErrors([])

    const result = isEdit ? updateTemplate(templateId, form) : createTemplate(form)
    setSaving(false)

    if (!result.ok) {
      setErrors(result.errors || [result.error || 'Não foi possível salvar.'])
      return
    }

    navigate(`/modules/training-ai/templates/${result.template.id}`)
  }

  return (
    <section className="imp-module">
      <div className="imp-actions">
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

      <form className="imp-panel training-ai__form" onSubmit={handleSubmit}>
        <div className="imp-panel__header">
          <div>
            <h2>{isEdit ? 'Editar template' : 'Novo template'}</h2>
            <p>Critérios com pesos (soma 100) e regras pass/fail por palavras-chave.</p>
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
        </div>

        {(form.sections || []).map((section, sectionIndex) => (
          <div key={section.id || sectionIndex} className="training-ai__template-section">
            <div className="training-ai__template-section-head">
              <label className="imp-field">
                <span>Seção</span>
                <input
                  value={section.name}
                  onChange={(event) => patchSection(sectionIndex, 'name', event.target.value)}
                  placeholder="Ex.: Abertura"
                  required
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
            + Seção
          </button>
          <button type="submit" className="imp-btn imp-btn--primary" disabled={saving}>
            {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar template'}
          </button>
        </div>
      </form>
    </section>
  )
}
