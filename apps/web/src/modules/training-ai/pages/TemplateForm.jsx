import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TrainingPage from '../components/TrainingPage.jsx'
import TrainingButton from '../components/TrainingButton.jsx'
import OutlineIcon from '../components/OutlineIcon.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import {
  createEmptyCriterionDraft,
  totalTemplateWeight,
} from '../data/evaluationTemplates.js'
import { SCENARIO_TYPES } from '../data/personas.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

const TEMPLATES_LIST = '/modules/training-ai/templates'

function newSection(name, index) {
  return {
    id: `sec_${Date.now()}_${index}`,
    name: name || '',
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
    const draft = createEmptyTemplateDraft()
    return {
      ...draft,
      scenarioTypes: ['cold_first', 'warm_first', 'inbound', 'discovery'],
      sections: [],
    }
  }, [createEmptyTemplateDraft, existing, templateToFormState])

  const [form, setForm] = useState(initial)
  const [sectionDraft, setSectionDraft] = useState('')
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [editingSectionIndex, setEditingSectionIndex] = useState(null)
  const [editingSectionName, setEditingSectionName] = useState('')

  const weightTotal = totalTemplateWeight(form)
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initial) || Boolean(sectionDraft.trim()),
    [form, initial, sectionDraft],
  )

  function requestLeave() {
    if (isDirty) {
      setDiscardOpen(true)
      return
    }
    navigate(TEMPLATES_LIST)
  }

  function confirmDiscard() {
    setDiscardOpen(false)
    navigate(TEMPLATES_LIST)
  }

  function startEditSection(index, name) {
    setEditingSectionIndex(index)
    setEditingSectionName(name || '')
  }

  function commitEditSection() {
    if (editingSectionIndex == null) return
    patchSection(editingSectionIndex, 'name', editingSectionName.trim())
    setEditingSectionIndex(null)
    setEditingSectionName('')
  }

  function cancelEditSection() {
    setEditingSectionIndex(null)
    setEditingSectionName('')
  }

  if (!canManage) {
    return (
      <TrainingPage>
        <div className="training-ai__empty">
          <h3>Sem permissão</h3>
          <p>Somente o administrador gerencia templates.</p>
        </div>
      </TrainingPage>
    )
  }

  if (isEdit && !existing) {
    return (
      <TrainingPage>
        <div className="training-ai__empty">
          <h3>Template não encontrado</h3>
          <TrainingButton to="/modules/training-ai/templates" variant="primary">
            Voltar
          </TrainingButton>
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
        const criteria = section.criteria.map((criterion, cIdx) =>
          cIdx === criterionIndex ? { ...criterion, [field]: value } : criterion,
        )
        return { ...section, criteria }
      })
      return { ...prev, sections }
    })
  }

  function addSectionFromDraft() {
    const name = sectionDraft.trim()
    if (!name) return
    setForm((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection(name, prev.sections.length + 1)],
    }))
    setSectionDraft('')
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
        if (section.criteria.length <= 1) return section
        return {
          ...section,
          criteria: section.criteria.filter((_, cIdx) => cIdx !== criterionIndex),
        }
      })
      return { ...prev, sections }
    })
  }

  function toggleScenario(id) {
    const current = form.scenarioTypes || []
    const selected = current.includes(id)
    patchRoot(
      'scenarioTypes',
      selected ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setErrors([])

    const prepared = {
      ...form,
      description: form.description?.trim() || form.title.trim() || 'Template de avaliação',
      status: form.status || 'published',
      sections: (form.sections || []).map((section) => ({
        ...section,
        criteria: (section.criteria || []).map((criterion) => ({
          ...criterion,
          keywordsText:
            String(criterion.keywordsText || '').trim()
            || [criterion.name, criterion.yesNoQuestion].filter(Boolean).join('\n'),
          passRule: criterion.passRule || { type: 'keywords', keywords: [] },
        })),
      })),
    }

    const result = isEdit
      ? await updateTemplate(templateId, prepared)
      : await createTemplate(prepared)
    setSaving(false)

    if (!result.ok) {
      setErrors(result.errors || [result.error || 'Não foi possível salvar.'])
      return
    }

    navigate(`/modules/training-ai/templates/${result.template.id}`)
  }

  return (
    <TrainingPage className="training-ai__template-form-page">
      <header className="training-ai__page-header training-ai__template-form-header">
        <div />
        <div className="training-ai__page-header-actions">
          <TrainingButton type="button" variant="primary" onClick={requestLeave}>
            <OutlineIcon name="clipboard" />
            Templates de Avaliação
          </TrainingButton>
        </div>
      </header>

      <form className="training-ai__template-form" onSubmit={handleSubmit}>
        {errors.length ? (
          <ul className="training-ai__form-errors">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}

        <section className="imp-panel training-ai__create-card">
          <div className="training-ai__create-card-head">
            <h3>Informações Básicas</h3>
            <p>Defina o playbook que a IA usará como régua de score da simulação.</p>
          </div>
          <label className="imp-field">
            <span>Nome do template*</span>
            <input
              value={form.title}
              onChange={(event) => patchRoot('title', event.target.value)}
              required
              placeholder="Ex.: Contato Telefônico - Cold"
            />
          </label>
        </section>

        <section className="imp-panel training-ai__create-card">
          <div className="training-ai__create-card-head">
            <h3>Timeline de Vendas</h3>
            <p>
              Organize o roteiro por etapas (Abertura, Rapport, Qualificação, Fechamento). Cada
              critério é uma pergunta de Sim ou Não que a IA verifica na transcrição. Os pesos
              personalizados somam 100 e geram a nota final.
            </p>
            <p className="training-ai__weight-live">
              Pesos totais: {weightTotal}/100
              {weightTotal === 100 ? ' · pronto para salvar' : ' · ajuste até 100'}
            </p>
          </div>

          <div className="training-ai__section-composer">
            <label className="imp-field training-ai__section-composer-field">
              <span>Nome da etapa</span>
              <input
                value={sectionDraft}
                onChange={(event) => setSectionDraft(event.target.value)}
                placeholder="Ex.: Abertura"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addSectionFromDraft()
                  }
                }}
              />
            </label>
            <TrainingButton
              type="button"
              variant="primary"
              iconOnly
              aria-label="Adicionar etapa"
              onClick={addSectionFromDraft}
            >
              <OutlineIcon name="plus" />
            </TrainingButton>
          </div>

          {(form.sections || []).length === 0 ? (
            <p className="training-ai__meta">Adicione uma etapa da timeline para começar os critérios.</p>
          ) : null}

          {(form.sections || []).map((section, sectionIndex) => {
            const isEditing = editingSectionIndex === sectionIndex
            return (
            <div key={section.id || sectionIndex} className="training-ai__template-section-block">
              <div className="training-ai__template-section-title">
                {isEditing ? (
                  <div className="training-ai__section-name-input is-editing">
                    <input
                      value={editingSectionName}
                      onChange={(event) => setEditingSectionName(event.target.value)}
                      onBlur={commitEditSection}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          event.currentTarget.blur()
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault()
                          cancelEditSection()
                        }
                      }}
                      placeholder="Ex: Qualificação"
                      autoFocus
                      aria-label="Editar nome da seção"
                    />
                    <button
                      type="button"
                      className="training-ai__section-name-clear"
                      aria-label="Cancelar edição"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={cancelEditSection}
                    >
                      <OutlineIcon name="x" />
                    </button>
                  </div>
                ) : (
                  <div className="training-ai__section-name-display">
                    <span>{section.name || `Seção ${sectionIndex + 1}`}</span>
                  </div>
                )}
                <div className="training-ai__template-section-actions">
                  {!isEditing ? (
                    <TrainingButton
                      type="button"
                      variant="ghost"
                      iconOnly
                      aria-label="Editar nome da seção"
                      onClick={() => startEditSection(sectionIndex, section.name)}
                    >
                      <OutlineIcon name="pencil" />
                    </TrainingButton>
                  ) : null}
                  <TrainingButton
                    type="button"
                    variant="ghost"
                    iconOnly
                    className="training-ai__btn-danger-icon"
                    aria-label="Remover seção"
                    onClick={() => {
                      if (isEditing) cancelEditSection()
                      removeSection(sectionIndex)
                    }}
                  >
                    <OutlineIcon name="x" />
                  </TrainingButton>
                </div>
              </div>

              {(section.criteria || []).map((criterion, criterionIndex) => (
                <div
                  key={criterion.id || criterionIndex}
                  className="training-ai__template-criterion-row"
                >
                  <div className="training-ai__template-criterion-fields">
                    <label className="imp-field">
                      <span>Nome do Critério*</span>
                      <input
                        value={criterion.name}
                        onChange={(event) =>
                          patchCriterion(sectionIndex, criterionIndex, 'name', event.target.value)
                        }
                        required
                      />
                    </label>
                    <label className="imp-field training-ai__field-weight">
                      <span>Peso*</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        step={0.1}
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
                      <span>Pergunta (Sim ou Não)*</span>
                      <textarea
                        rows={3}
                        value={criterion.yesNoQuestion}
                        onChange={(event) =>
                          patchCriterion(
                            sectionIndex,
                            criterionIndex,
                            'yesNoQuestion',
                            event.target.value,
                          )
                        }
                        required
                      />
                    </label>
                  </div>
                  <div className="training-ai__template-criterion-actions">
                    <TrainingButton
                      type="button"
                      variant="ghost"
                      iconOnly
                      className="training-ai__btn-danger-icon"
                      aria-label="Remover critério"
                      onClick={() => removeCriterion(sectionIndex, criterionIndex)}
                      disabled={section.criteria.length <= 1}
                    >
                      <OutlineIcon name="minus" />
                    </TrainingButton>
                    <TrainingButton
                      type="button"
                      variant="primary"
                      iconOnly
                      aria-label="Adicionar critério"
                      onClick={() => addCriterion(sectionIndex)}
                    >
                      <OutlineIcon name="plus" />
                    </TrainingButton>
                  </div>
                </div>
              ))}
            </div>
            )
          })}
        </section>

        <section className="imp-panel training-ai__create-card">
          <div className="training-ai__create-card-head">
            <h3>Cenários Compatíveis</h3>
            <p>Selecione os cenários de simulação onde este template pode ser utilizado.</p>
          </div>
          <div className="training-ai__scenario-check-grid">
            {SCENARIO_TYPES.map((item) => {
              const selected = (form.scenarioTypes || []).includes(item.id)
              return (
                <label key={item.id} className={`training-ai__scenario-check ${selected ? 'is-selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleScenario(item.id)}
                  />
                  <span>{item.label}</span>
                </label>
              )
            })}
          </div>
        </section>

        <div className="training-ai__create-footer">
          <button type="button" className="imp-btn training-ai__btn-cancel" onClick={requestLeave}>
            <OutlineIcon name="x" />
            Cancelar
          </button>
          <TrainingButton type="submit" variant="primary" disabled={saving}>
            <OutlineIcon name="save" />
            {saving ? 'Salvando…' : 'Salvar'}
          </TrainingButton>
        </div>
      </form>

      <ConfirmDialog
        open={discardOpen}
        title="Descartar alterações?"
        message="Você tem alterações não salvas. Deseja descartar e voltar para a listagem?"
        cancelLabel="Continuar editando"
        confirmLabel="Descartar"
        onCancel={() => setDiscardOpen(false)}
        onConfirm={confirmDiscard}
      />
    </TrainingPage>
  )
}
