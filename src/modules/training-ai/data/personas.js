import { DIFFICULTY_LABELS } from './catalogs.js'

/**
 * Training personas (mock) — configurable identity for AI roleplay.
 * No avatars / TTS / LLM in this phase.
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

export { DIFFICULTY_LABELS }

export const seedPersonas = [
  {
    id: 'per_marina',
    name: 'Marina Costa',
    role: 'Diretora Comercial',
    company: 'Nexo Logística',
    industry: 'Logística',
    location: 'São Paulo, SP',
    negotiatorType: 'Cliente Analítico',
    behavior: 'Cética e objetiva; quer saber o motivo da ligação em poucos segundos.',
    difficulty: 'beginner',
    mood: 'Cética, objetiva',
    openingLine: 'Alô? Marina falando. Quem é e por que está ligando?',
    objections: ['Recebo muitas ligações', 'Não tenho tempo agora'],
    priorities: ['Previsibilidade de agenda', 'Reuniões com decisores'],
    trainingObjective:
      'Praticar abertura consultiva e pedido de agenda com decisora cética em logística.',
    status: 'active',
    traits: ['Analítico', 'Cético', 'Objetivo'],
  },
  {
    id: 'per_rafael',
    name: 'Rafael Souza',
    role: 'Head de Operações',
    company: 'Atlas Retail',
    industry: 'Varejo',
    location: 'Curitiba, PR',
    negotiatorType: 'Cliente Dominante',
    behavior: 'Pressão por custo; compara com concorrente e pede números sem rodeio.',
    difficulty: 'intermediate',
    mood: 'Pressão por custo',
    openingLine: 'Olha, já tenho um fornecedor 30% mais barato. Por que eu mudaria?',
    objections: ['Concorrente mais barato', 'Sem orçamento este trimestre'],
    priorities: ['Reduzir custo oculto', 'Piloto sem lock-in'],
    trainingObjective:
      'Tratar objeção de preço sem desconto precoce e propor prova controlada.',
    status: 'active',
    traits: ['Dominante', 'Competitivo', 'Direto'],
  },
  {
    id: 'per_helena',
    name: 'Helena Prado',
    role: 'Gerente de Expansão',
    company: 'Forge Industrial',
    industry: 'Indústria',
    location: 'Belo Horizonte, MG',
    negotiatorType: 'Cliente Analítico',
    behavior: 'Analítica e detalhista; exige diagnóstico do processo antes de qualquer pitch.',
    difficulty: 'advanced',
    mood: 'Analítica, detalhista',
    openingLine: 'Antes de qualquer pitch: o que você precisa entender do nosso processo?',
    objections: ['Não quero processo engessado', 'Já tentamos ferramentas genéricas'],
    priorities: ['Diagnóstico antes de pitch', 'Gates leves de qualificação'],
    trainingObjective:
      'Conduzir discovery profundo, validar stakeholders e fechar com marco/termômetro.',
    status: 'active',
    traits: ['Analítico', 'Detalhista', 'Curioso'],
  },
]

/** @deprecated prefer context personas; kept for static imports in smoke/tests */
export const personas = seedPersonas

export function getPersona(personaId, list = seedPersonas) {
  return list.find((item) => item.id === personaId) || null
}

export function createEmptyPersonaDraft() {
  return {
    name: '',
    role: '',
    company: '',
    industry: 'SaaS B2B',
    location: '',
    negotiatorType: 'Cliente Analítico',
    behavior: '',
    difficulty: 'beginner',
    mood: '',
    openingLine: '',
    objections: [],
    priorities: [],
    trainingObjective: '',
    status: 'active',
    traits: [],
    interactionMode: 'text',
    scenarioContext: '',
  }
}

export function normalizePersonaInput(input = {}) {
  const objections =
    input.objectionsText != null
      ? String(input.objectionsText)
          .split(/\n|,/)
          .map((item) => item.trim())
          .filter(Boolean)
      : Array.isArray(input.objections)
        ? input.objections.map((item) => String(item).trim()).filter(Boolean)
        : []

  const priorities =
    input.prioritiesText != null
      ? String(input.prioritiesText)
          .split(/\n|,/)
          .map((item) => item.trim())
          .filter(Boolean)
      : Array.isArray(input.priorities)
        ? input.priorities.map((item) => String(item).trim()).filter(Boolean)
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
  if (!behavior) errors.push('Comportamento é obrigatório.')
  if (!trainingObjective) errors.push('Objetivo de treinamento é obrigatório.')
  if (!objections.length) errors.push('Informe ao menos uma objeção.')

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

  const persona = {
    name,
    role,
    company: String(input.company || '').trim() || 'Empresa mock',
    industry,
    location: String(input.location || '').trim(),
    negotiatorType: String(input.negotiatorType || 'Cliente Analítico').trim(),
    behavior,
    difficulty,
    mood: String(input.mood || behavior).trim() || behavior,
    openingLine:
      String(input.openingLine || '').trim() ||
      `Olá, aqui é ${name || 'o contato'}. Em que posso ajudar?`,
    objections,
    priorities,
    trainingObjective,
    status: ['active', 'paused', 'inactive'].includes(input.status) ? input.status : 'active',
    traits,
    interactionMode: ['text', 'voice', 'both'].includes(input.interactionMode)
      ? input.interactionMode
      : 'text',
    scenarioContext: String(input.scenarioContext || '').trim(),
  }

  return { ok: errors.length === 0, errors, persona }
}
