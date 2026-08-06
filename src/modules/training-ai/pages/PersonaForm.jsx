import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  DIFFICULTY_LABELS,
  INDUSTRY_OPTIONS,
  NEGOTIATOR_TYPES,
  PERSONA_DIFFICULTIES,
} from '../data/personas.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'

export default function TrainingPersonaFormPage() {
  const { personaId } = useParams()
  const isEdit = Boolean(personaId)
  const navigate = useNavigate()
  const {
    getPersona,
    createPersona,
    updatePersona,
    createEmptyPersonaDraft,
    canManage,
  } = useTrainingAi()

  const existing = isEdit ? getPersona(personaId) : null

  const initial = useMemo(() => {
    if (existing) {
      return {
        name: existing.name,
        role: existing.role,
        company: existing.company || '',
        industry: existing.industry || 'SaaS B2B',
        location: existing.location || '',
        negotiatorType: existing.negotiatorType || 'Cliente Analítico',
        behavior: existing.behavior || existing.mood || '',
        difficulty: existing.difficulty || 'beginner',
        mood: existing.mood || '',
        openingLine: existing.openingLine || '',
        objectionsText: (existing.objections || []).join('\n'),
        prioritiesText: (existing.priorities || []).join('\n'),
        trainingObjective: existing.trainingObjective || '',
      }
    }
    const draft = createEmptyPersonaDraft()
    return {
      ...draft,
      objectionsText: '',
      prioritiesText: '',
    }
  }, [createEmptyPersonaDraft, existing])

  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)

  if (!canManage) {
    return (
      <section className="imp-module">
        <div className="imp-empty">Sem permissão para gerenciar personas.</div>
      </section>
    )
  }

  if (isEdit && !existing) {
    return (
      <section className="imp-module">
        <div className="imp-empty">
          Persona não encontrada. <Link to="/modules/training-ai/personas">Voltar</Link>
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

    const result = isEdit ? updatePersona(personaId, form) : createPersona(form)
    setSaving(false)

    if (!result.ok) {
      setErrors(result.errors || [result.error || 'Não foi possível salvar.'])
      return
    }

    navigate(`/modules/training-ai/personas/${result.persona.id}`)
  }

  return (
    <section className="imp-module">
      <div className="imp-actions">
        <Link
          to={isEdit ? `/modules/training-ai/personas/${personaId}` : '/modules/training-ai/personas'}
          className="imp-btn imp-btn--ghost"
        >
          ← Cancelar
        </Link>
      </div>

      <form className="imp-panel training-ai__form" onSubmit={handleSubmit}>
        <div className="imp-panel__header">
          <div>
            <h2>{isEdit ? 'Editar persona' : 'Nova persona'}</h2>
            <p>Defina identidade, comportamento e objetivo de treino.</p>
          </div>
        </div>

        {errors.length ? (
          <ul className="training-ai__form-errors">
            {errors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}

        <div className="training-ai__form-grid">
          <label className="imp-field">
            Nome*
            <input
              value={form.name}
              onChange={(e) => patch('name', e.target.value)}
              placeholder="Ex: Camilo"
              required
            />
          </label>

          <label className="imp-field">
            Cargo / papel*
            <input
              value={form.role}
              onChange={(e) => patch('role', e.target.value)}
              placeholder="Ex: CEO"
              required
            />
          </label>

          <label className="imp-field">
            Indústria / setor*
            <select
              value={form.industry}
              onChange={(e) => patch('industry', e.target.value)}
              required
            >
              {INDUSTRY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="imp-field">
            Dificuldade*
            <select
              value={form.difficulty}
              onChange={(e) => patch('difficulty', e.target.value)}
              required
            >
              {PERSONA_DIFFICULTIES.map((item) => (
                <option key={item} value={item}>
                  {DIFFICULTY_LABELS[item]}
                </option>
              ))}
            </select>
          </label>

          <label className="imp-field">
            Empresa
            <input
              value={form.company}
              onChange={(e) => patch('company', e.target.value)}
              placeholder="Ex: EduNova"
            />
          </label>

          <label className="imp-field">
            Localização
            <input
              value={form.location}
              onChange={(e) => patch('location', e.target.value)}
              placeholder="Ex: Fortaleza, CE"
            />
          </label>

          <label className="imp-field">
            Tipo de negociador
            <select
              value={form.negotiatorType}
              onChange={(e) => patch('negotiatorType', e.target.value)}
            >
              {NEGOTIATOR_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="imp-field training-ai__form-span-2">
            Comportamento*
            <textarea
              rows={3}
              value={form.behavior}
              onChange={(e) => patch('behavior', e.target.value)}
              placeholder="Como a persona age na ligação"
              required
            />
          </label>

          <label className="imp-field training-ai__form-span-2">
            Objeções* (uma por linha)
            <textarea
              rows={4}
              value={form.objectionsText}
              onChange={(e) => patch('objectionsText', e.target.value)}
              placeholder={'Não tenho tempo\nJá tenho fornecedor'}
              required
            />
          </label>

          <label className="imp-field training-ai__form-span-2">
            Objetivo de treinamento*
            <textarea
              rows={3}
              value={form.trainingObjective}
              onChange={(e) => patch('trainingObjective', e.target.value)}
              placeholder="O que o trainee deve praticar com esta persona"
              required
            />
          </label>

          <label className="imp-field training-ai__form-span-2">
            Frase de abertura
            <input
              value={form.openingLine}
              onChange={(e) => patch('openingLine', e.target.value)}
              placeholder="Primeira fala da persona na simulação"
            />
          </label>

          <label className="imp-field training-ai__form-span-2">
            Prioridades (opcional, uma por linha)
            <textarea
              rows={3}
              value={form.prioritiesText}
              onChange={(e) => patch('prioritiesText', e.target.value)}
              placeholder="Reduzir ciclo\nQualificar melhor"
            />
          </label>
        </div>

        <div className="imp-actions">
          <button type="submit" className="imp-btn imp-btn--primary" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar persona'}
          </button>
        </div>
      </form>
    </section>
  )
}
