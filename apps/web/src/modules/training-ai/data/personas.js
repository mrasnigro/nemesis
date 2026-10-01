import { DIFFICULTY_LABELS } from './catalogs.js'

/**
 * Training agents (personas) — report §5 domain model.
 * Visual: initials avatar (report R7). Voice deferred (R4).
 */

export const NEGOTIATOR_TYPES = [
  'Cliente Analítico',
  'Cliente Dominante',
  'Cliente Expressivo',
  'Cliente Amigável',
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
    voiceRef: 'voice_neutral_f',
    scenarioContext: '',
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
    voiceRef: String(input.voiceRef || 'voice_neutral_f').trim() || 'voice_neutral_f',
    scenarioContext: String(input.scenarioContext || '').trim(),
  }

  return { ok: errors.length === 0, errors, persona }
}
