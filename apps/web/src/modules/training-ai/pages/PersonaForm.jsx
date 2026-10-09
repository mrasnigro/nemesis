import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import TrainingPage from '../components/TrainingPage.jsx'
import AgentAvatar from '../components/AgentAvatar.jsx'
import OutlineIcon from '../components/OutlineIcon.jsx'
import AvatarPickerModal from '../components/AvatarPickerModal.jsx'
import ChipListInput from '../components/ChipListInput.jsx'
import {
  INTERACTION_MODE_OPTIONS,
  LANGUAGE_OPTIONS,
  NEGOTIATOR_TYPES,
  SALES_MODEL_OPTIONS,
  SCENARIO_TYPES,
  VISIBILITY_OPTIONS,
} from '../data/personas.js'
import { trainingApi } from '../services/api/client.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import { getVoiceOption, sampleTextFor, VOICE_OPTIONS } from '../utils/voiceSession.js'
import { speakVoiceSample, stopVoiceSample } from '../services/avatar/browserAvatarProvider.js'

const PERSONA_STATUS_OPTIONS = [
  { id: 'active', label: 'Ativa' },
  { id: 'paused', label: 'Pausada' },
  { id: 'inactive', label: 'Inativa' },
  { id: 'draft', label: 'Rascunho' },
]

function languageBadge(code = 'pt-BR') {
  if (code.startsWith('en')) return 'EN-US'
  if (code.startsWith('es')) return 'ES'
  return 'PT-BR'
}

function Section({ title, description, children }) {
  return (
    <section className="training-ai__cp-section">
      <aside className="training-ai__cp-section-aside">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </aside>
      <div className="training-ai__cp-section-body">{children}</div>
    </section>
  )
}

function TagPicker({ values = [], knownTags = [], onChange }) {
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const options = useMemo(() => {
    const merged = Array.from(new Set([...(knownTags || []), ...values].map((item) => String(item).trim()).filter(Boolean)))
    const q = query.trim().toLowerCase()
    return q ? merged.filter((item) => item.toLowerCase().includes(q)) : merged
  }, [knownTags, query, values])

  function toggle(tag) {
    if (values.includes(tag)) onChange(values.filter((item) => item !== tag))
    else onChange([...values, tag])
  }

  function createTag() {
    const next = draft.trim()
    if (!next) return
    if (!values.includes(next)) onChange([...values, next])
    setDraft('')
    setQuery('')
  }

  return (
    <div className={`training-ai__tag-picker${open ? ' is-open' : ''}`} ref={rootRef}>
      <button type="button" className="training-ai__tag-picker-trigger" onClick={() => setOpen((v) => !v)}>
        <span>
          {values.length
            ? values.map((tag) => (
                <em key={tag} className="training-ai__tag-chip">
                  {tag}
                </em>
              ))
            : 'Selecionar etiquetas'}
        </span>
        <OutlineIcon name="chevronDown" size={16} />
      </button>
      {open ? (
        <div className="training-ai__tag-picker-panel" role="dialog" aria-label="Etiquetas">
          <label className="training-ai__tag-picker-search">
            <span>Pesquisar</span>
            <span className="training-ai__tag-picker-search-row">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Pesquisar etiqueta..."
              />
              <span className="training-ai__tag-picker-search-icon" aria-hidden="true">
                <OutlineIcon name="search" size={14} />
              </span>
            </span>
          </label>
          <ul className="training-ai__tag-picker-options">
            {options.map((tag) => {
              const selected = values.includes(tag)
              return (
                <li key={tag}>
                  <button type="button" className={selected ? 'is-selected' : ''} onClick={() => toggle(tag)}>
                    {tag}
                  </button>
                </li>
              )
            })}
            {!options.length ? <li className="training-ai__tag-picker-empty">Nenhuma etiqueta</li> : null}
          </ul>
          <label className="training-ai__tag-picker-create">
            <span>Criar etiqueta</span>
            <span className="training-ai__tag-picker-create-row">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Insira o nome da nova etiqueta..."
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    createTag()
                  }
                }}
              />
              <button type="button" onClick={createTag} disabled={!draft.trim()}>
                Criar
              </button>
            </span>
          </label>
        </div>
      ) : null}
    </div>
  )
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
    evaluationTemplates,
    personas,
    canManage,
  } = useTrainingAi()
  const [groups, setGroups] = useState([])
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [errors, setErrors] = useState([])
  const [saving, setSaving] = useState(false)
  const [previewPlaying, setPreviewPlaying] = useState(false)

  useEffect(() => {
    if (!canManage) return undefined
    let cancelled = false
    trainingApi
      .listGroups()
      .then((rows) => {
        if (!cancelled) setGroups(rows || [])
      })
      .catch(() => {
        if (!cancelled) setGroups([])
      })
    return () => {
      cancelled = true
    }
  }, [canManage])

  const existing = isEdit ? getPersona(personaId) : null

  const initial = useMemo(() => {
    if (existing) {
      return {
        ...createEmptyPersonaDraft(),
        name: existing.name || '',
        role: existing.role || '',
        company: existing.company || '',
        industry: existing.industry || '',
        location: existing.location || '',
        language: existing.language || 'pt-BR',
        negotiatorType: existing.negotiatorType || '',
        difficulty: existing.difficulty || 'beginner',
        openingLine: existing.openingLine || '',
        personalDetails: existing.personalDetails || [],
        objections: existing.objections || [],
        priorities: existing.priorities || [],
        beliefs: existing.beliefs || [],
        problemAwareness: existing.problemAwareness || '',
        solutionAwareness: existing.solutionAwareness || '',
        salesModel: existing.salesModel || 'b2b',
        companyInfo: existing.companyInfo || '',
        companyFacts: existing.companyFacts || [],
        trainingObjective: existing.trainingObjective || '',
        behavior: existing.behavior || '',
        status: existing.status || 'active',
        traits: existing.traits || [],
        interactionMode: existing.interactionMode || 'voice',
        voiceRef: existing.voiceRef || 'borges',
        scenarioContext: existing.scenarioContext || '',
        scenarioType: existing.scenarioType || 'cold_first',
        evaluationTemplateId: existing.evaluationTemplateId || '',
        sellerInstructions: existing.sellerInstructions || '',
        visibility: existing.visibility || 'individual',
        groupId: existing.groupId || '',
        tags: existing.tags || [],
        avatarData: existing.avatarData || '',
      }
    }
    return {
      ...createEmptyPersonaDraft(),
      status: 'active',
      negotiatorType: '',
      scenarioType: '',
    }
  }, [createEmptyPersonaDraft, existing])

  const [form, setForm] = useState(initial)

  useEffect(() => {
    setForm(initial)
  }, [initial])

  useEffect(() => () => stopVoiceSample(), [])

  const knownTags = useMemo(() => {
    const set = new Set()
    ;(personas || []).forEach((persona) => {
      ;(persona.tags || []).forEach((tag) => {
        if (tag) set.add(String(tag))
      })
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [personas])

  const filteredTemplates = useMemo(() => {
    const scenario = form.scenarioType
    return (evaluationTemplates || []).filter((template) => {
      const types = template.scenarioTypes
      if (!Array.isArray(types) || types.length === 0) return true
      if (!scenario) return true
      return types.includes(scenario)
    })
  }, [evaluationTemplates, form.scenarioType])

  const voiceLabel = VOICE_OPTIONS.find((item) => item.id === form.voiceRef)?.label || 'Voz'

  function patch(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function previewVoice() {
    if (previewPlaying) {
      stopVoiceSample()
      setPreviewPlaying(false)
      return
    }
    const option = getVoiceOption(form.voiceRef)
    const lang = option?.lang || form.language || 'pt-BR'
    setPreviewPlaying(true)
    speakVoiceSample({
      voiceRef: form.voiceRef,
      text: sampleTextFor(lang),
      onEnd: () => setPreviewPlaying(false),
      onError: () => setPreviewPlaying(false),
    })
  }

  async function save() {
    setSaving(true)
    setErrors([])
    const payload = {
      ...form,
      status: form.status || 'active',
      company: form.salesModel === 'b2c' ? form.company || form.name || 'Pessoa Física' : form.company,
      industry: form.salesModel === 'b2c' ? form.industry || 'Consumidor' : form.industry,
      negotiatorType: form.negotiatorType || 'Cliente Analítico',
      scenarioType: form.scenarioType || 'cold_first',
    }
    const result = isEdit ? await updatePersona(personaId, payload) : await createPersona(payload)
    setSaving(false)
    if (!result.ok) {
      setErrors(result.errors || [result.error || 'Não foi possível salvar.'])
      return
    }
    navigate('/modules/training-ai/personas')
  }

  function handleSubmit(event) {
    event.preventDefault()
    save()
  }

  if (!canManage) {
    return (
      <TrainingPage>
        <div className="training-ai__empty">
          <h3>Sem permissão</h3>
          <p>Você não pode gerenciar personas.</p>
        </div>
      </TrainingPage>
    )
  }

  if (isEdit && !existing) {
    return (
      <TrainingPage>
        <div className="training-ai__empty">
          <h3>Persona não encontrada</h3>
          <div className="imp-actions">
            <Link to="/modules/training-ai/personas" className="imp-btn imp-btn--primary">
              Voltar
            </Link>
          </div>
        </div>
      </TrainingPage>
    )
  }

  return (
    <TrainingPage className="training-ai__persona-create">
      <header className="training-ai__page-header training-ai__persona-create-header">
        <div>
          <h2>{isEdit ? 'Editar Persona' : '+ Criar Persona'}</h2>
        </div>
        <div className="training-ai__page-header-actions">
          <Link to="/modules/training-ai/personas" className="imp-btn imp-btn--primary training-ai__back-personas-btn">
            <OutlineIcon name="user" />
            Minhas personas
          </Link>
        </div>
      </header>

      {errors.length ? (
        <ul className="training-ai__form-errors">
          {errors.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      <form className="training-ai__cp-form" onSubmit={handleSubmit}>
        <Section
          title="Configurações de acesso"
          description="Selecione o escopo designado à persona."
        >
          <div className="imp-field">
            <span>
              Escopo da persona<em>*</em>
            </span>
            <div className="training-ai__cp-scope-grid" role="radiogroup" aria-label="Escopo da persona">
              {VISIBILITY_OPTIONS.map((item) => {
                const selected = form.visibility === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`training-ai__cp-scope-card${selected ? ' is-selected' : ''}`}
                    onClick={() => patch('visibility', item.id)}
                    aria-pressed={selected}
                  >
                    <span className="training-ai__cp-scope-radio" aria-hidden="true" />
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </button>
                )
              })}
            </div>
          </div>
          {form.visibility === 'group' ? (
            <label className="imp-field">
              <span>
                Grupo<em>*</em>
              </span>
              <select value={form.groupId || ''} onChange={(event) => patch('groupId', event.target.value)} required>
                <option value="">Selecionar grupo</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="imp-field">
            <span>Status</span>
            <select value={form.status || 'active'} onChange={(event) => patch('status', event.target.value)}>
              {PERSONA_STATUS_OPTIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <small className="training-ai__meta">Somente personas ativas aparecem liberadas para simulação.</small>
          </label>
        </Section>

        <Section title="Informações básicas" description="Reúna os dados primários da persona.">
          <div className="training-ai__cp-basics-grid">
            <label className="imp-field">
              <span>
                Nome<em>*</em>
              </span>
              <input
                value={form.name}
                onChange={(event) => patch('name', event.target.value)}
                placeholder="Ex: Maria Silva"
                required
              />
            </label>
            <label className="imp-field">
              <span>
                Localização<em>*</em>
              </span>
              <input
                value={form.location}
                onChange={(event) => patch('location', event.target.value)}
                placeholder="Ex: São Paulo, SP"
                required
              />
            </label>
            <label className="imp-field">
              <span>
                Tipo de negociador<em>*</em>
              </span>
              <select
                value={form.negotiatorType}
                onChange={(event) => patch('negotiatorType', event.target.value)}
                required
              >
                <option value="">Selecionar</option>
                {NEGOTIATOR_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <div className="training-ai__cp-lang-avatar">
              <label className="imp-field">
                <span>
                  Idioma<em>*</em>
                </span>
                <select value={form.language} onChange={(event) => patch('language', event.target.value)}>
                  {LANGUAGE_OPTIONS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="training-ai__cp-avatar-btn" onClick={() => setAvatarOpen(true)}>
                Escolher Avatar
              </button>
            </div>
          </div>

          <div className="imp-field">
            <span>
              Visualizar avatar<em>*</em>
            </span>
            <div className="training-ai__cp-avatar-preview">
              <AgentAvatar
                id={personaId || form.name || 'new'}
                name={form.name || 'Persona'}
                size="lg"
                photo={form.avatarData}
              />
              <div className="training-ai__cp-avatar-preview-meta">
                <strong>{form.name || 'Nome da persona'}</strong>
                <span className="training-ai__cp-avatar-location">{form.location || 'Localização'}</span>
                <span className="training-ai__cp-lang-badge">{languageBadge(form.language)}</span>
                <div className="training-ai__cp-voice-bar">
                  <button
                    type="button"
                    className="training-ai__cp-voice-play"
                    onClick={previewVoice}
                    aria-label={previewPlaying ? 'Parar preview' : `Ouvir ${voiceLabel}`}
                  >
                    <OutlineIcon name={previewPlaying ? 'minus' : 'play'} size={14} />
                  </button>
                  <span
                    className={`training-ai__cp-voice-track${previewPlaying ? ' is-playing' : ''}`}
                    aria-hidden="true"
                  />
                  <small aria-live="polite">{previewPlaying ? 'Tocando…' : voiceLabel}</small>
                </div>
              </div>
            </div>
          </div>

          <div className="imp-field">
            <span>Etiquetas</span>
            <TagPicker values={form.tags || []} knownTags={knownTags} onChange={(tags) => patch('tags', tags)} />
          </div>
        </Section>

        <Section
          title="Construção do cenário"
          description="Escolha o cenário da simulação e o template de avaliação. No contexto da simulação, detalhe a situação específica, o cenário e os objetivos, que o vendedor verá antes de iniciar a conversa."
        >
          <div className="training-ai__cp-basics-grid">
            <label className="imp-field">
              <span>
                Cenário da Simulação<em>*</em>
              </span>
              <select
                value={form.scenarioType}
                onChange={(event) => patch('scenarioType', event.target.value)}
                required
              >
                <option value="">Selecionar</option>
                {SCENARIO_TYPES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="imp-field">
              <span>
                Template de avaliação<em>*</em>
              </span>
              <select
                value={form.evaluationTemplateId || ''}
                onChange={(event) => patch('evaluationTemplateId', event.target.value)}
                required
              >
                <option value="">Selecionar</option>
                {filteredTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="imp-field">
            <span>
              Instruções ao Vendedor<em>*</em>
            </span>
            <textarea
              rows={3}
              value={form.sellerInstructions}
              onChange={(event) => patch('sellerInstructions', event.target.value)}
              placeholder="Ex: O prospect baixou um ebook e agendou uma call de apresentação sobre o produto. Ajude-o a entender as funcionalidades e a escolher o melhor plano para ele."
              required
            />
          </label>
          <label className="imp-field">
            <span>Contexto Adicional ao Cenário</span>
            <textarea
              rows={3}
              value={form.scenarioContext}
              onChange={(event) => patch('scenarioContext', event.target.value)}
              placeholder="Ex: Você baixou um ebook sobre automação de vendas e se interessou pela solução apresentada. Esta é uma reunião agendada por videochamada."
            />
          </label>
        </Section>

        <Section
          title="Modos de interação"
          description="Escolha como a conversa acontecerá entre o vendedor e a persona: por texto, voz ou ambos. As opções disponíveis dependem do cenário selecionado."
        >
          <div className="imp-field">
            <span>
              Simulação<em>*</em>
            </span>
            <div className="training-ai__cp-mode-grid" role="radiogroup" aria-label="Modo de simulação">
              {INTERACTION_MODE_OPTIONS.map((item) => {
                const selected = form.interactionMode === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`training-ai__cp-mode-card${selected ? ' is-selected' : ''}`}
                    onClick={() => patch('interactionMode', item.id)}
                    aria-pressed={selected}
                  >
                    <span className="training-ai__cp-mode-icon" aria-hidden="true">
                      <OutlineIcon name={item.icon} size={18} />
                    </span>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </button>
                )
              })}
            </div>
          </div>
        </Section>

        <Section
          title="Abordagem e consciência (opcional)"
          description="Defina a frase de abertura da persona e informe o quanto ela entende sobre o problema e a solução."
        >
          <label className="imp-field">
            <span>Frase de Abertura</span>
            <input
              value={form.openingLine}
              onChange={(event) => patch('openingLine', event.target.value)}
              placeholder="Ex: Olá, gostaria de saber mais sobre suas soluções"
            />
          </label>
          <label className="imp-field">
            <span>Consciência do problema</span>
            <textarea
              rows={2}
              value={form.problemAwareness}
              onChange={(event) => patch('problemAwareness', event.target.value)}
              placeholder="Ex: Você sabe que precisa reduzir custos operacionais e aumentar a eficiência"
            />
          </label>
          <label className="imp-field">
            <span>Consciência da solução</span>
            <textarea
              rows={2}
              value={form.solutionAwareness}
              onChange={(event) => patch('solutionAwareness', event.target.value)}
              placeholder="Ex: Você já considerou automação e sistemas de gestão integrados"
            />
          </label>
        </Section>

        <Section
          title="Contexto de vendas"
          description="Selecione o modelo de negócio e, para o B2B, podem ser incluídas informações sobre o contexto empresarial, tendo os dados preservados ao alternar entre os formatos."
        >
          <div className="imp-field">
            <span>Modelo de Negócio</span>
            <div className="training-ai__sales-model-grid" role="radiogroup" aria-label="Modelo de negócio">
              {SALES_MODEL_OPTIONS.map((item) => {
                const selected = form.salesModel === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`training-ai__sales-model-card${selected ? ' is-selected' : ''}`}
                    onClick={() => patch('salesModel', item.id)}
                    aria-pressed={selected}
                  >
                    <OutlineIcon name={item.icon} />
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </button>
                )
              })}
            </div>
          </div>

          {form.salesModel === 'b2b' ? (
            <div className="training-ai__cp-b2b-grid">
              <label className="imp-field">
                <span>
                  Nome da Empresa<em>*</em>
                </span>
                <input
                  value={form.company}
                  onChange={(event) => patch('company', event.target.value)}
                  placeholder="Ex: LuftarCorp LTDA"
                  required
                />
              </label>
              <label className="imp-field">
                <span>
                  Setor da Empresa<em>*</em>
                </span>
                <input
                  value={form.industry}
                  onChange={(event) => patch('industry', event.target.value)}
                  placeholder="Ex: Tecnologia"
                  required
                />
              </label>
              <label className="imp-field training-ai__cp-span-2">
                <span>
                  Cargo/ Posição<em>*</em>
                </span>
                <input
                  value={form.role}
                  onChange={(event) => patch('role', event.target.value)}
                  placeholder="Ex: Gerente de Vendas"
                  required
                />
              </label>
              <div className="training-ai__cp-span-2">
                <ChipListInput
                  label="Informações da Empresa"
                  required
                  placeholder="Ex: Você responde diretamente ao CEO"
                  values={form.companyFacts || []}
                  onChange={(companyFacts) => patch('companyFacts', companyFacts)}
                />
              </div>
            </div>
          ) : (
            <label className="imp-field">
              <span>
                Cargo/ Posição<em>*</em>
              </span>
              <input
                value={form.role}
                onChange={(event) => patch('role', event.target.value)}
                placeholder="Ex: Comprador / Decisor"
                required
              />
            </label>
          )}
        </Section>

        <Section
          title="Características comportamentais"
          description="Descreva os detalhes, prioridades e crenças em terceira pessoa, e registre as objeções exatamente como a persona as falaria."
        >
          <ChipListInput
            label="Detalhes Pessoais"
            required
            placeholder="Ex: Você gosta de fazer corridas pela manhã"
            values={form.personalDetails || []}
            onChange={(personalDetails) => patch('personalDetails', personalDetails)}
          />
          <ChipListInput
            label="Objeções Comuns"
            required
            placeholder="Ex: Não tenho disponibilidade de tempo agora"
            values={form.objections || []}
            onChange={(objections) => patch('objections', objections)}
          />
          <ChipListInput
            label="Prioridades"
            required
            placeholder="Ex: Você tem como prioridade aumentar o faturamento da empresa"
            values={form.priorities || []}
            onChange={(priorities) => patch('priorities', priorities)}
          />
          <ChipListInput
            label="Crenças e opiniões"
            required
            placeholder="Ex: Você acredita que soluções com IA são difíceis de implementar"
            values={form.beliefs || []}
            onChange={(beliefs) => patch('beliefs', beliefs)}
          />
        </Section>

        <footer className="training-ai__cp-footer">
          <Link to="/modules/training-ai/personas" className="imp-btn training-ai__btn-cancel">
            <OutlineIcon name="x" />
            Cancelar
          </Link>
          <button type="submit" className="imp-btn imp-btn--primary" disabled={saving}>
            <OutlineIcon name="save" />
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </footer>
      </form>

      <AvatarPickerModal
        open={avatarOpen}
        avatarData={form.avatarData}
        voiceRef={form.voiceRef}
        language={form.language}
        onClose={() => setAvatarOpen(false)}
        onSave={({ avatarData, voiceRef }) => {
          setForm((prev) => ({ ...prev, avatarData, voiceRef }))
        }}
      />
    </TrainingPage>
  )
}
