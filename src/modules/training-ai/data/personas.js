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

export const seedPersonas = [
  {
    id: 'per_marina',
    name: 'Marina Costa',
    role: 'Diretora Comercial',
    company: 'Nexo Logística',
    industry: 'Logística',
    location: 'São Paulo, SP',
    language: 'pt-BR',
    negotiatorType: 'Cliente Analítico',
    tone: 'Objetivo',
    behavior: 'Cética e objetiva; quer saber o motivo da ligação em poucos segundos.',
    difficulty: 'beginner',
    mood: 'Cética, objetiva',
    openingLine: 'Alô? Marina falando. Quem é e por que está ligando?',
    personalDetails: ['Responde direto ao board', 'Agenda apertada nas manhãs'],
    objections: ['Recebo muitas ligações', 'Não tenho tempo agora'],
    priorities: ['Previsibilidade de agenda', 'Reuniões com decisores'],
    beliefs: ['Prefere fornecedores que conhecem logística'],
    problemAwareness: 'Sabe que o funil está irregular, mas não prioriza tool nova sem ROI claro.',
    solutionAwareness: 'Aberta a ouvir se houver prova no segmento; cética a pitch genérico.',
    salesModel: 'b2b',
    companyInfo: 'Operação multi-CD com pipeline dependente de agenda de diretoria.',
    trainingObjective:
      'Praticar abertura consultiva e pedido de agenda com decisora cética em logística.',
    status: 'active',
    traits: ['Analítico', 'Cético', 'Objetivo'],
    interactionMode: 'text',
    scenarioContext: 'Lead baixou material no site da IMP; contato frio B2B logística.',
  },
  {
    id: 'per_rafael',
    name: 'Rafael Souza',
    role: 'Head de Operações',
    company: 'Atlas Retail',
    industry: 'Varejo',
    location: 'Curitiba, PR',
    language: 'pt-BR',
    negotiatorType: 'Cliente Dominante',
    tone: 'Direto',
    behavior: 'Pressão por custo; compara com concorrente e pede números sem rodeio.',
    difficulty: 'intermediate',
    mood: 'Pressão por custo',
    openingLine: 'Olha, já tenho um fornecedor 30% mais barato. Por que eu mudaria?',
    personalDetails: ['Decide rápido', 'Foca em custo operacional'],
    objections: ['Concorrente mais barato', 'Sem orçamento este trimestre'],
    priorities: ['Reduzir custo oculto', 'Piloto sem lock-in'],
    beliefs: ['Desconto imediato é o único sinal de valor'],
    problemAwareness: 'Sente custo alto na operação mas ancora tudo em preço de lista.',
    solutionAwareness: 'Considera piloto curto se houver métricas claras e sem lock-in.',
    salesModel: 'b2b',
    companyInfo: 'Rede varejo com pressão de margem e comparação agressiva de fornecedores.',
    trainingObjective:
      'Tratar objeção de preço sem desconto precoce e propor prova controlada.',
    status: 'active',
    traits: ['Dominante', 'Competitivo', 'Direto'],
    interactionMode: 'text',
    scenarioContext: 'Tratamento de objeção de preço em discovery varejo.',
  },
  {
    id: 'per_helena',
    name: 'Helena Prado',
    role: 'Gerente de Expansão',
    company: 'Forge Industrial',
    industry: 'Indústria',
    location: 'Belo Horizonte, MG',
    language: 'pt-BR',
    negotiatorType: 'Cliente Analítico',
    tone: 'Consultivo',
    behavior: 'Analítica e detalhista; exige diagnóstico do processo antes de qualquer pitch.',
    difficulty: 'advanced',
    mood: 'Analítica, detalhista',
    openingLine: 'Antes de qualquer pitch: o que você precisa entender do nosso processo?',
    personalDetails: ['Exige dados', 'Mapeia stakeholders antes de avançar'],
    objections: ['Não quero processo engessado', 'Já tentamos ferramentas genéricas'],
    priorities: ['Diagnóstico antes de pitch', 'Gates leves de qualificação'],
    beliefs: ['Ferramentas sem process design falham'],
    problemAwareness: 'Vê gargalos de expansão; quer clareza de causa raiz.',
    solutionAwareness: 'Aceita abordagem consultiva com marcos e termômetro explícitos.',
    salesModel: 'b2b',
    companyInfo: 'Indústria em expansão regional com governance leve.',
    trainingObjective:
      'Conduzir discovery profundo, validar stakeholders e fechar com marco/termômetro.',
    status: 'active',
    traits: ['Analítico', 'Detalhista', 'Curioso'],
    interactionMode: 'text',
    scenarioContext: 'Discovery profundo + classificação de termômetro.',
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
    scenarioContext: String(input.scenarioContext || '').trim(),
  }

  return { ok: errors.length === 0, errors, persona }
}
