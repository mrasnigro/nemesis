import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  DIFFICULTY_LABELS,
  FUNNEL_STAGE_OPTIONS,
  INDUSTRY_OPTIONS,
  SCENARIO_DIFFICULTIES,
} from '../data/scenarios.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import '../styles/training-ai.css'

export default function TrainingScenarioFormPage() {
  const { scenarioId } = useParams()
  const isEdit = Boolean(scenarioId)
  const navigate = useNavigate()
  const {
    getScenario,
    createScenario,
    updateScenario,
    createEmptyScenarioDraft,
    personas,
    evaluationTemplates,
    canManage,
  } = useTrainingAi()

  const existing = isEdit ? getScenario(scenarioId) : null

  const initial = useMemo(() => {
    if (existing) {
      return {
        title: existing.title,
        description: existing.description || '',
        industry: existing.industry || existing.segment || 'SaaS B2B',
        objective: existing.objective || '',
        difficulty: existing.difficulty || 'beginner',
        durationMin: existing.durationMin || 10,
        funnelStage: existing.funnelStage || FUNNEL_STAGE_OPTIONS[0],
        personaId: existing.personaId || '',
        evaluationTemplateId: existing.evaluationTemplateId || evaluationTemplates[0]?.id || '',
        sellerInstructions: existing.sellerInstructions || '',
        scriptHintsText: (existing.scriptHints || []).join('\n'),
        focusText: (existing.focus || []).join('\n'),
      }
    }
    const draft = createEmptyScenarioDraft({
      personaId: personas[0]?.id || '',
      evaluationTemplateId: evaluationTemplates[0]?.id || '',
    })
    return {
      ...draft,
      scriptHintsText: '',
      focusText: '',
    }
  }, [createEmptyScenarioDraft, evaluationTemplates, existing, personas])

  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)

  if (!canManage) {
    return (
      <section className="imp-module">
        <div className="imp-empty">Sem permissão para gerenciar cenários.</div>
      </section>
    )
  }

  if (isEdit && !existing) {
    return (
      <section className="imp-module">
        <div className="imp-empty">
          Cenário não encontrado. <Link to="/modules/training-ai/cenarios">Voltar</Link>
        </div>
      </section>
    )
  }

  function patch(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setErrors([])

    const result = isEdit ? updateScenario(scenarioId, form) : createScenario(form)
    setSaving(false)

    if (!result.ok) {
      setErrors(result.errors || [result.error || 'Não foi possível salvar.'])
      return
    }

    navigate(`/modules/training-ai/cenarios/${result.scenario.id}`)
  }

  return (
    <section className="imp-module">
      <div className="imp-actions">
        <Link
          to={
            isEdit
              ? `/modules/training-ai/cenarios/${scenarioId}`
              : '/modules/training-ai/cenarios'
          }
          className="imp-btn imp-btn--ghost"
        >
          ← Voltar
        </Link>
      </div>

      <form className="imp-panel training-ai__persona-form" onSubmit={handleSubmit}>
        <div className="imp-panel__header">
          <div>
            <h2>{isEdit ? 'Editar cenário' : 'Novo cenário'}</h2>
            <p>Protótipo de configuração — liga persona, rubrica e sessão de treino.</p>
          </div>
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
              onChange={(event) => patch('title', event.target.value)}
              required
            />
          </label>

          <label className="imp-field training-ai__form-span-2">
            <span>Descrição</span>
            <textarea
              rows={2}
              value={form.description}
              onChange={(event) => patch('description', event.target.value)}
              required
            />
          </label>

          <label className="imp-field">
            <span>Indústria</span>
            <select
              value={form.industry}
              onChange={(event) => patch('industry', event.target.value)}
            >
              {INDUSTRY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="imp-field">
            <span>Dificuldade</span>
            <select
              value={form.difficulty}
              onChange={(event) => patch('difficulty', event.target.value)}
            >
              {SCENARIO_DIFFICULTIES.map((item) => (
                <option key={item} value={item}>
                  {DIFFICULTY_LABELS[item] || item}
                </option>
              ))}
            </select>
          </label>

          <label className="imp-field">
            <span>Estágio do funil</span>
            <select
              value={form.funnelStage}
              onChange={(event) => patch('funnelStage', event.target.value)}
            >
              {FUNNEL_STAGE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="imp-field">
            <span>Duração (min)</span>
            <input
              type="number"
              min={5}
              max={60}
              value={form.durationMin}
              onChange={(event) => patch('durationMin', event.target.value)}
            />
          </label>

          <label className="imp-field training-ai__form-span-2">
            <span>Objetivo</span>
            <textarea
              rows={2}
              value={form.objective}
              onChange={(event) => patch('objective', event.target.value)}
              required
            />
          </label>

          <label className="imp-field">
            <span>Persona vinculada</span>
            <select
              value={form.personaId}
              onChange={(event) => patch('personaId', event.target.value)}
              required
            >
              <option value="">Selecione…</option>
              {personas.map((persona) => (
                <option key={persona.id} value={persona.id}>
                  {persona.name} — {persona.role}
                </option>
              ))}
            </select>
          </label>

          <label className="imp-field">
            <span>Template de avaliação</span>
            <select
              value={form.evaluationTemplateId}
              onChange={(event) => patch('evaluationTemplateId', event.target.value)}
              required
            >
              {evaluationTemplates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>

          <label className="imp-field training-ai__form-span-2">
            <span>Instruções da conversa</span>
            <textarea
              rows={3}
              value={form.sellerInstructions}
              onChange={(event) => patch('sellerInstructions', event.target.value)}
              required
            />
          </label>

          <label className="imp-field training-ai__form-span-2">
            <span>Focos (um por linha)</span>
            <textarea
              rows={2}
              value={form.focusText}
              onChange={(event) => patch('focusText', event.target.value)}
            />
          </label>

          <label className="imp-field training-ai__form-span-2">
            <span>Dicas do coach (uma por linha)</span>
            <textarea
              rows={3}
              value={form.scriptHintsText}
              onChange={(event) => patch('scriptHintsText', event.target.value)}
            />
          </label>
        </div>

        <div className="imp-actions">
          <button type="submit" className="imp-btn imp-btn--primary" disabled={saving}>
            {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar cenário'}
          </button>
        </div>
      </form>
    </section>
  )
}
