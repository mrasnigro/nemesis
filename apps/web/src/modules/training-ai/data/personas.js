import { DIFFICULTY_LABELS } from './catalogs.js'

/**
 * Training agents (personas) — report §5 domain model.
 * Visual: initials avatar (report R7). Voice deferred (R4).
 */

export const NEGOTIATOR_TYPES = [
  'Cliente Analítico',
  'Cliente Cético',
  'Cliente Comunicativo',
  'Cliente Inseguro',
  'Cliente Dominante',
]

export const SCENARIO_TYPES = [
  { id: 'cold_first', label: 'Prospecção ativa' },
  { id: 'warm_first', label: 'Lead morno' },
  { id: 'inbound', label: 'Inbound' },
  { id: 'discovery', label: 'Diagnóstico' },
  { id: 'presentation', label: 'Apresentação' },
  { id: 'negotiation', label: 'Negociação e fechamento' },
  { id: 'post_sale', label: 'Relacionamento' },
]

export function scenarioTypeLabel(id) {
  return SCENARIO_TYPES.find((item) => item.id === id)?.label || 'Simulação'
}

export const VISIBILITY_OPTIONS = [
  { id: 'individual', label: 'Individual' },
  { id: 'company', label: 'Empresa' },
  { id: 'group', label: 'Grupo' },
]

export const INDUSTRY_OPTIONS = [
  'Logística',
  'Varejo',
  'Indústria',
  'SaaS B2B',
  'Serviços',
  'Tecnologia',
  'Educação',
  'Outro',
]

export const PERSONA_DIFFICULTIES = ['beginner', 'intermediate', 'advanced']

export const AGENT_STATUSES = ['active', 'paused', 'inactive', 'draft']

export const SALES_MODELS = [
  { id: 'b2b', label: 'B2B - Empresa' },
  { id: 'b2c', label: 'B2C - Pessoa Física' },
]

export { DIFFICULTY_LABELS }

function splitList(input, key, textKey) {
  if (input[textKey] != null) {
    return String(input[textKey])
      .split(/\n/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (Array.isArray(input[key])) {
    return input[key].map((item) => String(item).trim()).filter(Boolean)
  }
  return []
}

export function getPersona(personaId, list = []) {
  return list.find((item) => item.id === personaId) || null
}

export function createEmptyPersonaDraft() {
  return {
    name: '',
    role: '',
    company: '',
    industry: 'SaaS B2B',
    location: '',
    language: 'pt-BR',
    negotiatorType: 'Cliente Analítico',
    tone: '',
    behavior: '',
    difficulty: 'beginner',
    mood: '',
    openingLine: '',
    personalDetails: [],
    objections: [],
    priorities: [],
    beliefs: [],
    problemAwareness: '',
    solutionAwareness: '',
    salesModel: 'b2b',
    companyInfo: '',
    trainingObjective: '',
    status: 'draft',
    traits: [],
    interactionMode: 'text',
    voiceRef: 'borges',
    scenarioContext: '',
    scenarioType: 'cold_first',
    evaluationTemplateId: '',
    sellerInstructions: '',
    visibility: 'company',
    groupId: '',
    tagsText: '',
    companyFacts: [],
    avatarData: '',
  }
}

export function normalizePersonaInput(input = {}) {
  const objections = splitList(input, 'objections', 'objectionsText')
  const priorities = splitList(input, 'priorities', 'prioritiesText')
  const personalDetails = splitList(input, 'personalDetails', 'personalDetailsText')
  const beliefs = splitList(input, 'beliefs', 'beliefsText')

  const traits =
    input.traitsText != null
      ? String(input.traitsText)
          .split(/\n|,/)
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 3)
      : Array.isArray(input.traits)
        ? input.traits.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
        : []

  const name = String(input.name || '').trim()
  const role = String(input.role || '').trim()
  const industry = String(input.industry || '').trim()
  const behavior = String(input.behavior || '').trim()
  const trainingObjective = String(input.trainingObjective || '').trim()
  const difficulty = PERSONA_DIFFICULTIES.includes(input.difficulty)
    ? input.difficulty
    : 'beginner'

  const errors = []
  if (!name) errors.push('Nome é obrigatório.')
  if (!role) errors.push('Cargo / papel é obrigatório.')
  if (!industry) errors.push('Setor / indústria é obrigatório.')
  if (!behavior) errors.push('Comportamento / DNA é obrigatório.')
  if (!trainingObjective) errors.push('Objetivo de treinamento é obrigatório.')
  if (!objections.length) errors.push('Informe ao menos uma objeção.')

  const persona = {
    name,
    role,
    company: String(input.company || '').trim() || 'Empresa',
    industry,
    location: String(input.location || '').trim(),
    language: String(input.language || 'pt-BR').trim() || 'pt-BR',
    negotiatorType: String(input.negotiatorType || 'Cliente Analítico').trim(),
    tone: String(input.tone || '').trim(),
    behavior,
    difficulty,
    mood: String(input.mood || behavior).trim() || behavior,
    openingLine:
      String(input.openingLine || '').trim() ||
      `Olá, aqui é ${name || 'o contato'}. Em que posso ajudar?`,
    personalDetails,
    objections,
    priorities,
    beliefs,
    problemAwareness: String(input.problemAwareness || '').trim(),
    solutionAwareness: String(input.solutionAwareness || '').trim(),
    salesModel: input.salesModel === 'b2c' ? 'b2c' : 'b2b',
    companyInfo: String(input.companyInfo || '').trim(),
    trainingObjective,
    status: AGENT_STATUSES.includes(input.status) ? input.status : 'active',
    traits,
    interactionMode: ['text', 'voice', 'both'].includes(input.interactionMode)
      ? input.interactionMode
      : 'text',
    voiceRef: String(input.voiceRef || 'borges').trim() || 'borges',
    scenarioContext: String(input.scenarioContext || '').trim(),
    scenarioType: SCENARIO_TYPES.some((item) => item.id === input.scenarioType) ? input.scenarioType : 'cold_first',
    evaluationTemplateId: String(input.evaluationTemplateId || '').trim() || undefined,
    sellerInstructions: String(input.sellerInstructions || '').trim(),
    visibility: ['individual', 'company', 'group'].includes(input.visibility) ? input.visibility : 'company',
    groupId: String(input.groupId || '').trim() || undefined,
    tags: splitList(input, 'tags', 'tagsText'),
    companyFacts: splitList(input, 'companyFacts', 'companyFactsText'),
    avatarData: String(input.avatarData || '').trim() || undefined,
  }

  if (persona.visibility === 'group' && !persona.groupId) errors.push('Escolha o grupo desta persona.')
  if (!persona.sellerInstructions) errors.push('Informe as instruções ao vendedor.')
  if (!persona.evaluationTemplateId) errors.push('Escolha o template de avaliação.')

  return { ok: errors.length === 0, errors, persona }
}
