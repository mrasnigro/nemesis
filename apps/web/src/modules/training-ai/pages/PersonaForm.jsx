import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AgentAvatar from '../components/AgentAvatar.jsx'
import {
  DIFFICULTY_LABELS,
  INDUSTRY_OPTIONS,
  NEGOTIATOR_TYPES,
  PERSONA_DIFFICULTIES,
  SALES_MODELS,
} from '../data/personas.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import { VOICE_OPTIONS } from '../utils/voiceSession.js'

/** Report mockup wizard + video field checklist (awareness, B2B, lists). */
const WIZARD_STEPS = [
  { id: 'basics', label: 'Informações básicas', hint: 'Nome, papel e objetivo' },
  { id: 'scenario', label: 'Construção do cenário', hint: 'Instruções e contexto' },
  { id: 'modes', label: 'Modos de interação', hint: 'Texto ativo · voz stub' },
  { id: 'behavior', label: 'Características comportamentais', hint: 'Objeções e DNA' },
  { id: 'advanced', label: 'Configurações avançadas', hint: 'Consciência e B2B' },
  { id: 'review', label: 'Revisão e publicação', hint: 'Confirme e publique' },
]

function listToText(list) {
  return (list || []).join('\n')
}

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
        language: existing.language || 'pt-BR',
        negotiatorType: existing.negotiatorType || 'Cliente Analítico',
        tone: existing.tone || '',
        behavior: existing.behavior || existing.mood || '',
        difficulty: existing.difficulty || 'beginner',
        mood: existing.mood || '',
        openingLine: existing.openingLine || '',
        objectionsText: listToText(existing.objections),
        prioritiesText: listToText(existing.priorities),
        personalDetailsText: listToText(existing.personalDetails),
        beliefsText: listToText(existing.beliefs),
        problemAwareness: existing.problemAwareness || '',
        solutionAwareness: existing.solutionAwareness || '',
        salesModel: existing.salesModel || 'b2b',
        companyInfo: existing.companyInfo || '',
        trainingObjective: existing.trainingObjective || '',
        status: existing.status || 'active',
        traitsText: listToText(existing.traits),
        interactionMode: existing.interactionMode || 'text',
        voiceRef: existing.voiceRef || 'voice_neutral_f',
        scenarioContext: existing.scenarioContext || '',
      }
    }
    const draft = createEmptyPersonaDraft()
    return {
      ...draft,
      objectionsText: '',
      prioritiesText: '',
      personalDetailsText: '',
      beliefsText: '',
      traitsText: '',
    }
  }, [createEmptyPersonaDraft, existing])

  const [form, setForm] = useState(initial)
  const [stepIndex, setStepIndex] = useState(0)
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)

  if (!canManage) {
    return (
      <section className="imp-module">
        <div className="training-ai__empty">
          <h3>Sem permissão</h3>
          <p>Você não pode gerenciar agentes.</p>
        </div>
      </section>
    )
  }

  if (isEdit && !existing) {
    return (
      <section className="imp-module">
        <div className="training-ai__empty">
          <h3>Agente não encontrado</h3>
          <div className="imp-actions">
            <Link to="/modules/training-ai/personas" className="imp-btn imp-btn--primary">
              Voltar
            </Link>
          </div>
        </div>
      </section>
    )
  }

  function patch(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function save(publishStatus) {
    setSaving(true)
    setErrors([])
    const payload = { ...form, status: publishStatus || form.status }
    const result = isEdit ? await updatePersona(personaId, payload) : await createPersona(payload)
    setSaving(false)
    if (!result.ok) {
      setErrors(result.errors || [result.error || 'Não foi possível salvar.'])
      setStepIndex(0)
      return
    }
    navigate(`/modules/training-ai/personas/${result.persona.id}`)
  }

  function handleSubmit(event) {
    event.preventDefault()
    save(form.status === 'draft' ? 'active' : form.status || 'active')
  }

  const step = WIZARD_STEPS[stepIndex]
  const progress = Math.round(((stepIndex + 1) / WIZARD_STEPS.length) * 100)

  return (
    <section className="imp-module">
      <header className="training-ai__page-header">
        <div>
          <h2>{isEdit ? 'Editar Agente' : 'Criar Novo Agente'}</h2>
          <p>
            Configure o cérebro comportamental — layout alinhado ao mockup IMP; campos extras dos
            vídeos de referência.
          </p>
        </div>
        <div className="training-ai__page-header-actions">
          <Link
            to={
              isEdit
                ? `/modules/training-ai/personas/${personaId}`
                : '/modules/training-ai/personas'
            }
            className="imp-btn imp-btn--ghost"
          >
            ← Cancelar
          </Link>
        </div>
      </header>

      <form className="training-ai__wizard" onSubmit={handleSubmit}>
        <aside className="training-ai__wizard-steps" aria-label="Etapas">
          {WIZARD_STEPS.map((item, index) => {
            const state =
              index < stepIndex ? 'is-done' : index === stepIndex ? 'is-active' : ''
            return (
              <button
                key={item.id}
                type="button"
                className={`training-ai__wizard-step ${state}`}
                onClick={() => setStepIndex(index)}
              >
                <span className="training-ai__wizard-step-index">{index + 1}</span>
                <span>
                  <strong>{item.label}</strong>
                  <span>{item.hint}</span>
                </span>
              </button>
            )
          })}
        </aside>

        <div className="imp-panel training-ai__wizard-main training-ai__form">
          <div className="imp-panel__header">
            <div>
              <h2>{step.label}</h2>
              <p>{step.hint}</p>
            </div>
            <span className="imp-pill imp-pill--amber">{progress}%</span>
          </div>

          {errors.length ? (
            <ul className="training-ai__form-errors">
              {errors.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}

          {step.id === 'basics' ? (
            <div className="training-ai__form-grid">
              <label className="imp-field">
                <span>Nome do agente*</span>
                <input value={form.name} onChange={(e) => patch('name', e.target.value)} required />
              </label>
              <label className="imp-field">
                <span>Função / papel*</span>
                <input value={form.role} onChange={(e) => patch('role', e.target.value)} required />
              </label>
              <label className="imp-field training-ai__form-span-2">
                <span>Objetivo principal*</span>
                <textarea
                  rows={3}
                  value={form.trainingObjective}
                  onChange={(e) => patch('trainingObjective', e.target.value)}
                  required
                />
              </label>
              <label className="imp-field">
                <span>Tom de voz</span>
                <input
                  value={form.tone}
                  onChange={(e) => patch('tone', e.target.value)}
                  placeholder="Ex.: Objetivo, consultivo"
                />
              </label>
              <label className="imp-field">
                <span>Departamento / indústria*</span>
                <select value={form.industry} onChange={(e) => patch('industry', e.target.value)}>
                  {INDUSTRY_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="imp-field">
                <span>Idioma</span>
                <select value={form.language} onChange={(e) => patch('language', e.target.value)}>
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </label>
              <label className="imp-field">
                <span>Dificuldade</span>
                <select
                  value={form.difficulty}
                  onChange={(e) => patch('difficulty', e.target.value)}
                >
                  {PERSONA_DIFFICULTIES.map((item) => (
                    <option key={item} value={item}>
                      {DIFFICULTY_LABELS[item]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="imp-field">
                <span>Empresa</span>
                <input
                  value={form.company}
                  onChange={(e) => patch('company', e.target.value)}
                />
              </label>
              <label className="imp-field">
                <span>Localização</span>
                <input
                  value={form.location}
                  onChange={(e) => patch('location', e.target.value)}
                />
              </label>
            </div>
          ) : null}

          {step.id === 'scenario' ? (
            <div className="training-ai__form-grid">
              <label className="imp-field training-ai__form-span-2">
                <span>Instruções / DNA comportamental* (até ~2000)</span>
                <textarea
                  rows={4}
                  value={form.behavior}
                  onChange={(e) => patch('behavior', e.target.value)}
                  maxLength={2000}
                  required
                />
              </label>
              <label className="imp-field training-ai__form-span-2">
                <span>Contexto do cenário</span>
                <textarea
                  rows={4}
                  value={form.scenarioContext}
                  onChange={(e) => patch('scenarioContext', e.target.value)}
                  maxLength={2000}
                  placeholder="Mercado, público, produto — o que o vendedor precisa saber"
                />
              </label>
              <label className="imp-field training-ai__form-span-2">
                <span>Frase de abertura</span>
                <input
                  value={form.openingLine}
                  onChange={(e) => patch('openingLine', e.target.value)}
                />
              </label>
            </div>
          ) : null}

          {step.id === 'modes' ? (
            <>
              <div className="training-ai__mode-cards">
                <button
                  type="button"
                  className={`training-ai__mode-card ${
                    form.interactionMode === 'text' ? 'is-selected' : ''
                  }`}
                  onClick={() => patch('interactionMode', 'text')}
                >
                  <strong>Texto</strong>
                  <small>Conversa por chat — caminho real do protótipo.</small>
                </button>
                <button
                  type="button"
                  className={`training-ai__mode-card ${
                    form.interactionMode === 'voice' ? 'is-selected' : ''
                  }`}
                  onClick={() => patch('interactionMode', 'voice')}
                >
                  <strong>Voz</strong>
                  <small>Preferência salva + UI stub na simulação (sem STT/TTS).</small>
                </button>
                <button
                  type="button"
                  className={`training-ai__mode-card ${
                    form.interactionMode === 'both' ? 'is-selected' : ''
                  }`}
                  onClick={() => patch('interactionMode', 'both')}
                >
                  <strong>Ambos</strong>
                  <small>Preferência salva; prática continua em texto até o áudio.</small>
                </button>
              </div>
              <div className="training-ai__voice-picker">
                <label className="imp-field">
                  <span>Voz do agente (stub)</span>
                  <select
                    value={form.voiceRef || 'voice_neutral_f'}
                    onChange={(e) => patch('voiceRef', e.target.value)}
                  >
                    {VOICE_OPTIONS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="imp-btn imp-btn--ghost"
                  disabled
                  title="Prévia de áudio indisponível neste protótipo"
                >
                  ▶ Prévia indisponível
                </button>
              </div>
              <p className="training-ai__meta" style={{ marginTop: '0.85rem' }}>
                Report R4: chrome de voz apenas; motor de conversa permanece texto.
              </p>
            </>
          ) : null}

          {step.id === 'behavior' ? (
            <div className="training-ai__form-grid">
              <label className="imp-field">
                <span>Tipo de negociador</span>
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
              <label className="imp-field">
                <span>Status</span>
                <select value={form.status} onChange={(e) => patch('status', e.target.value)}>
                  <option value="active">Ativo</option>
                  <option value="paused">Pausado</option>
                  <option value="inactive">Inativo</option>
                  <option value="draft">Rascunho</option>
                </select>
              </label>
              <label className="imp-field training-ai__form-span-2">
                <span>Traços (até 3 pills no card)</span>
                <textarea
                  rows={2}
                  value={form.traitsText}
                  onChange={(e) => patch('traitsText', e.target.value)}
                  placeholder={'Analítico\nDominante\nConfiante'}
                />
              </label>
              <label className="imp-field training-ai__form-span-2">
                <span>Detalhes pessoais (vídeo — um por linha)</span>
                <textarea
                  rows={3}
                  value={form.personalDetailsText}
                  onChange={(e) => patch('personalDetailsText', e.target.value)}
                />
              </label>
              <label className="imp-field training-ai__form-span-2">
                <span>Objeções* (exatamente como o agente falaria)</span>
                <textarea
                  rows={4}
                  value={form.objectionsText}
                  onChange={(e) => patch('objectionsText', e.target.value)}
                  required
                />
              </label>
              <label className="imp-field training-ai__form-span-2">
                <span>Prioridades</span>
                <textarea
                  rows={3}
                  value={form.prioritiesText}
                  onChange={(e) => patch('prioritiesText', e.target.value)}
                />
              </label>
              <label className="imp-field training-ai__form-span-2">
                <span>Crenças e opiniões</span>
                <textarea
                  rows={3}
                  value={form.beliefsText}
                  onChange={(e) => patch('beliefsText', e.target.value)}
                />
              </label>
            </div>
          ) : null}

          {step.id === 'advanced' ? (
            <div className="training-ai__form-grid">
              <label className="imp-field training-ai__form-span-2">
                <span>Consciência do problema</span>
                <textarea
                  rows={3}
                  value={form.problemAwareness}
                  onChange={(e) => patch('problemAwareness', e.target.value)}
                />
              </label>
              <label className="imp-field training-ai__form-span-2">
                <span>Consciência da solução</span>
                <textarea
                  rows={3}
                  value={form.solutionAwareness}
                  onChange={(e) => patch('solutionAwareness', e.target.value)}
                />
              </label>
              <div className="training-ai__form-span-2 training-ai__mode-cards">
                {SALES_MODELS.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    className={`training-ai__mode-card ${
                      form.salesModel === model.id ? 'is-selected' : ''
                    }`}
                    onClick={() => patch('salesModel', model.id)}
                  >
                    <strong>{model.label}</strong>
                    <small>Contexto de vendas (vídeo).</small>
                  </button>
                ))}
              </div>
              {form.salesModel === 'b2b' ? (
                <label className="imp-field training-ai__form-span-2">
                  <span>Informações da empresa</span>
                  <textarea
                    rows={3}
                    value={form.companyInfo}
                    onChange={(e) => patch('companyInfo', e.target.value)}
                  />
                </label>
              ) : null}
            </div>
          ) : null}

          {step.id === 'review' ? (
            <dl className="training-ai__persona-detail-grid">
              <div>
                <dt>Nome</dt>
                <dd>{form.name || '—'}</dd>
              </div>
              <div>
                <dt>Papel</dt>
                <dd>{form.role || '—'}</dd>
              </div>
              <div>
                <dt>Objetivo</dt>
                <dd>{form.trainingObjective || '—'}</dd>
              </div>
              <div>
                <dt>Modo</dt>
                <dd>Texto</dd>
              </div>
              <div>
                <dt>Modelo</dt>
                <dd>{form.salesModel?.toUpperCase()}</dd>
              </div>
              <div>
                <dt>Objeções</dt>
                <dd>{(form.objectionsText || '').split('\n').filter(Boolean).length}</dd>
              </div>
              <div className="training-ai__form-span-2">
                <dt>DNA</dt>
                <dd>{form.behavior || '—'}</dd>
              </div>
            </dl>
          ) : null}

          <div className="imp-actions" style={{ marginTop: '1rem' }}>
            {stepIndex > 0 ? (
              <button
                type="button"
                className="imp-btn imp-btn--ghost"
                onClick={() => setStepIndex((v) => Math.max(0, v - 1))}
              >
                Voltar
              </button>
            ) : null}
            {stepIndex < WIZARD_STEPS.length - 1 ? (
              <>
                <button
                  type="button"
                  className="imp-btn imp-btn--ghost"
                  onClick={() => save('draft')}
                  disabled={saving}
                >
                  Salvar rascunho
                </button>
                <button
                  type="button"
                  className="imp-btn imp-btn--primary"
                  onClick={() => setStepIndex((v) => Math.min(WIZARD_STEPS.length - 1, v + 1))}
                >
                  Salvar e continuar
                </button>
              </>
            ) : (
              <button type="submit" className="imp-btn imp-btn--primary" disabled={saving}>
                {saving ? 'Publicando…' : 'Publicar agente'}
              </button>
            )}
          </div>
        </div>

        <aside className="training-ai__wizard-resumo">
          <div className="training-ai__chip-row">
            <AgentAvatar id={personaId || form.name} name={form.name || 'NA'} size="md" />
            <div>
              <h3>Resumo do Agente</h3>
              <p className="training-ai__meta">{form.role || 'Papel não informado'}</p>
            </div>
          </div>
          <dl>
            <div>
              <dt>Nome</dt>
              <dd>{form.name || 'Não informado'}</dd>
            </div>
            <div>
              <dt>Objetivo</dt>
              <dd>{form.trainingObjective || 'Não informado'}</dd>
            </div>
            <div>
              <dt>Tom</dt>
              <dd>{form.tone || 'Não informado'}</dd>
            </div>
            <div>
              <dt>Idioma</dt>
              <dd>{form.language === 'pt-BR' ? 'Português (Brasil)' : form.language}</dd>
            </div>
            <div>
              <dt>Modo</dt>
              <dd>Texto</dd>
            </div>
            <div>
              <dt>Progresso</dt>
              <dd>{progress}%</dd>
            </div>
          </dl>
          <div className="imp-progress">
            <span style={{ width: `${progress}%` }} />
          </div>
        </aside>
      </form>
    </section>
  )
}
