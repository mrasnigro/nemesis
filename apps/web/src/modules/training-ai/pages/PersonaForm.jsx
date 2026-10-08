import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import TrainingPage from '../components/TrainingPage.jsx'
import AgentAvatar from '../components/AgentAvatar.jsx'
import OutlineIcon from '../components/OutlineIcon.jsx'
import {
  DIFFICULTY_LABELS,
  INDUSTRY_OPTIONS,
  LANGUAGE_OPTIONS,
  NEGOTIATOR_TYPES,
  PERSONA_DIFFICULTIES,
  PROBLEM_AWARENESS_OPTIONS,
  SALES_MODEL_OPTIONS,
  SALES_MODELS,
  SCENARIO_TYPES,
  VISIBILITY_OPTIONS,
} from '../data/personas.js'
import { trainingApi } from '../services/api/client.js'
import { useTrainingAi } from '../context/TrainingAiContext.jsx'
import { VOICE_OPTIONS } from '../utils/voiceSession.js'

/** Steps of the agent wizard. */
const WIZARD_STEPS = [
  { id: 'basics', label: 'Informações básicas', hint: 'Nome, papel e objetivo' },
  { id: 'scenario', label: 'Construção do cenário', hint: 'Instruções e contexto' },
  { id: 'modes', label: 'Modos de interação', hint: 'Texto ou voz' },
  { id: 'behavior', label: 'DNA comportamental', hint: 'Traços, objeções e consciência' },
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
    evaluationTemplates,
    canManage,
  } = useTrainingAi()
  const [groups, setGroups] = useState([])

  useEffect(() => {
    if (!canManage) return undefined
    let cancelled = false
    trainingApi.listGroups().then((rows) => {
      if (!cancelled) setGroups(rows || [])
    }).catch(() => {
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
        voiceRef: existing.voiceRef || 'borges',
        scenarioContext: existing.scenarioContext || '',
        scenarioType: existing.scenarioType || 'cold_first',
        evaluationTemplateId: existing.evaluationTemplateId || '',
        sellerInstructions: existing.sellerInstructions || '',
        visibility: existing.visibility || 'company',
        groupId: existing.groupId || '',
        tagsText: listToText(existing.tags),
        companyFactsText: listToText(existing.companyFacts),
        avatarData: existing.avatarData || '',
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
  const [createMode, setCreateMode] = useState(isEdit ? 'wizard' : 'brief')
  const [brief, setBrief] = useState({
    scenarioType: initial.scenarioType || 'cold_first',
    description: '',
    transcriptName: '',
    problemAwareness: PROBLEM_AWARENESS_OPTIONS[1]?.id || 'aware_lives_with',
    language: initial.language || 'pt-BR',
    salesModel: initial.salesModel || 'b2b',
    productDescription: '',
    catalogName: '',
  })

  function patchBrief(field, value) {
    setBrief((prev) => ({ ...prev, [field]: value }))
  }

  function applyBriefToForm() {
    const awareness = PROBLEM_AWARENESS_OPTIONS.find((item) => item.id === brief.problemAwareness)
    const derivedName = brief.description
      .split(/[.!\n]/)
      .map((part) => part.trim())
      .find(Boolean)
    setForm((prev) => ({
      ...prev,
      scenarioType: brief.scenarioType,
      language: brief.language,
      salesModel: brief.salesModel,
      trainingObjective: brief.description.trim() || prev.trainingObjective,
      behavior: brief.description.trim() || prev.behavior,
      companyInfo: brief.productDescription.trim() || prev.companyInfo,
      problemAwareness: awareness?.label || prev.problemAwareness,
      name: prev.name || (derivedName ? derivedName.slice(0, 48) : ''),
      role: prev.role || 'Decisor',
    }))
  }

  function goToManualWizard() {
    applyBriefToForm()
    setCreateMode('wizard')
    setStepIndex(0)
    setErrors([])
  }

  function handleBriefNext() {
    if (!brief.description.trim()) {
      setErrors(['Descreva a persona para continuar.'])
      return
    }
    goToManualWizard()
  }

  function handleFilePick(field, event) {
    const file = event.target.files?.[0]
    patchBrief(field, file ? file.name : '')
    event.target.value = ''
  }

  if (!canManage) {
    return (
      <TrainingPage>
        <div className="training-ai__empty">
          <h3>Sem permissão</h3>
          <p>Você não pode gerenciar agentes.</p>
        </div>
      </TrainingPage>
    )
  }

  if (isEdit && !existing) {
    return (
      <TrainingPage>
        <div className="training-ai__empty">
          <h3>Agente não encontrado</h3>
          <div className="imp-actions">
            <Link to="/modules/training-ai/personas" className="imp-btn imp-btn--primary">
              Voltar
            </Link>
          </div>
        </div>
      </TrainingPage>
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
  const selectedAwareness = PROBLEM_AWARENESS_OPTIONS.find((item) => item.id === brief.problemAwareness)

  if (!isEdit && createMode === 'brief') {
    return (
      <TrainingPage className="training-ai__persona-create">
        <header className="training-ai__page-header training-ai__persona-create-header">
          <div>
            <h2>+ Criar Agente</h2>
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

        <section className="imp-panel training-ai__create-card">
          <div className="training-ai__create-card-head">
            <h3>Selecione o cenário</h3>
            <p>Selecione o escopo designado à persona.</p>
          </div>
          <div className="training-ai__scenario-choice-grid" role="radiogroup" aria-label="Cenário">
            {SCENARIO_TYPES.map((item) => {
              const selected = brief.scenarioType === item.id
              return (
                <label
                  key={item.id}
                  className={`training-ai__scenario-choice ${selected ? 'is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="scenarioType"
                    checked={selected}
                    onChange={() => patchBrief('scenarioType', item.id)}
                  />
                  <span className="training-ai__scenario-choice-mark" aria-hidden="true" />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                </label>
              )
            })}
          </div>
        </section>

        <section className="imp-panel training-ai__create-card">
          <div className="training-ai__create-card-head">
            <h3>Criar a persona com IA</h3>
            <p>
              Forneça as informações que você possui sobre o cliente e o produto. A IA combina esses dados
              para criar uma persona completa, com perfil, objetivos, comportamentos e necessidades. Ou se
              preferir preencha a persona manualmente.
            </p>
          </div>

          <div className="training-ai__create-fields">
            <label className="imp-field">
              <span>Descreva a persona*</span>
              <textarea
                rows={5}
                value={brief.description}
                onChange={(event) => patchBrief('description', event.target.value)}
                placeholder="Ex: Gerente comercial de uma empresa de médio porte, busca automatizar o processo de vendas e melhorar o acompanhamento da equipe. Tem pouco tempo, valoriza soluções práticas e costuma pesquisar diferentes ferramentas antes de tomar uma decisão."
              />
            </label>

            <div className="imp-field">
              <span>Anexe transcrição da ligação ou arquivo de ICP (Opcional)</span>
              <label className="training-ai__file-drop">
                <input
                  type="file"
                  accept=".txt,.pdf,text/plain,application/pdf"
                  onChange={(event) => handleFilePick('transcriptName', event)}
                />
                <OutlineIcon name="paperclip" />
                <span>
                  {brief.transcriptName
                    ? brief.transcriptName
                    : 'Clique ou arraste um arquivo. Formatos aceitos: TXT ou PDF. Tamanho máximo: 30 MB.'}
                </span>
              </label>
            </div>

            <label className="imp-field">
              <span>Como ele encara esse problema hoje?</span>
              <select
                value={brief.problemAwareness}
                onChange={(event) => patchBrief('problemAwareness', event.target.value)}
              >
                {PROBLEM_AWARENESS_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
              {selectedAwareness ? (
                <small className="training-ai__field-hint">{selectedAwareness.hint}</small>
              ) : null}
            </label>

            <label className="imp-field">
              <span>Idioma*</span>
              <select
                value={brief.language}
                onChange={(event) => patchBrief('language', event.target.value)}
              >
                {LANGUAGE_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </label>

            <div className="imp-field">
              <span>Modelo de negócio*</span>
              <div className="training-ai__sales-model-grid" role="radiogroup" aria-label="Modelo de negócio">
                {SALES_MODEL_OPTIONS.map((item) => {
                  const selected = brief.salesModel === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`training-ai__sales-model-card ${selected ? 'is-selected' : ''}`}
                      onClick={() => patchBrief('salesModel', item.id)}
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

            <label className="imp-field">
              <span>Descreva o catálogo ou produto (Opcional)</span>
              <textarea
                rows={3}
                value={brief.productDescription}
                onChange={(event) => patchBrief('productDescription', event.target.value)}
                placeholder="Ex: Software de gestão financeira para pequenas empresas, com emissão de boletos e controle de fluxo de caixa."
              />
            </label>

            <div className="imp-field">
              <span>Anexe o catálogo ou produto (Opcional)</span>
              <label className="training-ai__file-drop">
                <input
                  type="file"
                  accept=".txt,.pdf,text/plain,application/pdf"
                  onChange={(event) => handleFilePick('catalogName', event)}
                />
                <OutlineIcon name="paperclip" />
                <span>
                  {brief.catalogName
                    ? brief.catalogName
                    : 'Clique ou arraste um arquivo. Formatos aceitos: TXT ou PDF. Tamanho máximo: 30 MB.'}
                </span>
              </label>
            </div>
          </div>
        </section>

        <div className="training-ai__create-footer">
          <Link to="/modules/training-ai/personas" className="imp-btn training-ai__btn-cancel">
            <OutlineIcon name="x" />
            Cancelar
          </Link>
          <button type="button" className="imp-btn imp-btn--ghost" onClick={goToManualWizard}>
            Preencher Manualmente
          </button>
          <button type="button" className="imp-btn imp-btn--primary" onClick={handleBriefNext}>
            Próximo
          </button>
        </div>
      </TrainingPage>
    )
  }

  return (
    <TrainingPage>
      <header className="training-ai__page-header">
        <div>
          <h2>{isEdit ? 'Editar Agente' : '+ Criar Agente'}</h2>
          <p>
            Configure o comportamento do agente: quem ele é, como reage e quais objeções levanta.
          </p>
        </div>
        <div className="training-ai__page-header-actions">
          {!isEdit ? (
            <button type="button" className="imp-btn imp-btn--ghost" onClick={() => setCreateMode('brief')}>
              ← Voltar
            </button>
          ) : null}
          <Link
            to={
              isEdit
                ? `/modules/training-ai/personas/${personaId}`
                : '/modules/training-ai/personas'
            }
            className="imp-btn imp-btn--primary training-ai__back-personas-btn"
          >
            <OutlineIcon name="user" />
            Minhas personas
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
              <label className="imp-field training-ai__form-span-2">
                <span>Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => {
                      const image = new Image()
                      image.onload = () => {
                        const canvas = document.createElement('canvas')
                        const scale = Math.min(1, 320 / Math.max(image.width, image.height))
                        canvas.width = Math.max(1, Math.round(image.width * scale))
                        canvas.height = Math.max(1, Math.round(image.height * scale))
                        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
                        patch('avatarData', canvas.toDataURL('image/jpeg', 0.72))
                      }
                      image.src = String(reader.result)
                    }
                    reader.readAsDataURL(file)
                  }}
                />
                {form.avatarData ? <img src={form.avatarData} alt="" width="72" height="72" /> : null}
              </label>
            </div>
          ) : null}

          {step.id === 'scenario' ? (
            <div className="training-ai__form-grid">
              <label className="imp-field">
                <span>Quem pode ver</span>
                <select value={form.visibility || 'company'} onChange={(e) => patch('visibility', e.target.value)}>
                  {VISIBILITY_OPTIONS.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>
              {form.visibility === 'group' ? (
                <label className="imp-field">
                  <span>Grupo</span>
                  <select value={form.groupId || ''} onChange={(e) => patch('groupId', e.target.value)}>
                    <option value="">Selecione</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="imp-field">
                <span>Cenário da simulação</span>
                <select value={form.scenarioType || 'cold_first'} onChange={(e) => patch('scenarioType', e.target.value)}>
                  {SCENARIO_TYPES.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="imp-field">
                <span>Template de avaliação</span>
                <select
                  value={form.evaluationTemplateId || ''}
                  onChange={(e) => patch('evaluationTemplateId', e.target.value)}
                >
                  <option value="">Selecione</option>
                  {evaluationTemplates
                    .filter((template) => {
                      const types = template.scenarioTypes
                      if (!Array.isArray(types) || types.length === 0) return true
                      return types.includes(form.scenarioType || 'cold_first')
                    })
                    .map((template) => (
                      <option key={template.id} value={template.id}>{template.title}</option>
                    ))}
                </select>
              </label>
              <label className="imp-field training-ai__form-span-2">
                <span>Instruções ao vendedor</span>
                <textarea
                  rows={3}
                  value={form.sellerInstructions || ''}
                  onChange={(e) => patch('sellerInstructions', e.target.value)}
                  placeholder="O que o vendedor vê antes da ligação"
                />
              </label>
              <label className="imp-field">
                <span>Tags</span>
                <textarea
                  rows={3}
                  value={form.tagsText || ''}
                  onChange={(e) => patch('tagsText', e.target.value)}
                  placeholder="Uma tag por linha"
                />
              </label>
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
                  <small>Conversa por texto.</small>
                </button>
                <button
                  type="button"
                  className={`training-ai__mode-card ${
                    form.interactionMode === 'voice' ? 'is-selected' : ''
                  }`}
                  onClick={() => patch('interactionMode', 'voice')}
                >
                  <strong>Voz</strong>
                  <small>O agente fala e você pode ditar as respostas (Chrome ou Edge).</small>
                </button>
                <button
                  type="button"
                  className={`training-ai__mode-card ${
                    form.interactionMode === 'both' ? 'is-selected' : ''
                  }`}
                  onClick={() => patch('interactionMode', 'both')}
                >
                  <strong>Ambos</strong>
                  <small>A persona aceita texto e voz.</small>
                </button>
              </div>
              <div className="training-ai__voice-picker">
                <label className="imp-field">
                  <span>Voz do agente</span>
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
                  onClick={() => {
                    if (!window.speechSynthesis) return
                    const voice = VOICE_OPTIONS.find((item) => item.id === form.voiceRef)
                    const utterance = new SpeechSynthesisUtterance('Olá, eu sou o cliente desta simulação.')
                    utterance.lang = voice?.lang || form.language || 'pt-BR'
                    window.speechSynthesis.cancel()
                    window.speechSynthesis.speak(utterance)
                  }}
                >
                  ▶ Ouvir voz
                </button>
              </div>
            </>
          ) : null}

          {step.id === 'behavior' ? (
            <div className="training-ai__form-grid">
              <label className="imp-field">
                <span>DNA comportamental (tipo)</span>
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
                <>
                  <label className="imp-field training-ai__form-span-2">
                    <span>Informações da empresa</span>
                    <textarea
                      rows={3}
                      value={form.companyInfo}
                      onChange={(e) => patch('companyInfo', e.target.value)}
                    />
                  </label>
                  <label className="imp-field training-ai__form-span-2">
                    <span>Fatos da empresa (um por linha)</span>
                    <textarea
                      rows={3}
                      value={form.companyFactsText || ''}
                      onChange={(e) => patch('companyFactsText', e.target.value)}
                    />
                  </label>
                </>
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
    </TrainingPage>
  )
}
