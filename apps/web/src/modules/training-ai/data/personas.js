import { DIFFICULTY_LABELS } from './catalogs.js'

/**
 * Training agents (personas) — report §5 domain model.
 * Visual: initials avatar (report R7). Voice deferred (R4).
 */

/** Behavioral DNA — primary personality kit used by the agent configurator. */
export const NEGOTIATOR_TYPES = [
  'Cliente Analítico',
  'Cliente Agressivo',
  'Cliente Cético',
  'Cliente Inseguro',
  'Cliente Comunicativo',
  'Cliente Dominante',
]

export const SCENARIO_TYPES = [
  {
    id: 'cold_first',
    label: 'Primeiro Contato Frio',
    description: 'O vendedor faz o primeiro contato sem aviso. O cliente não conhece a empresa e não esperava a abordagem.',
  },
  {
    id: 'discovery',
    label: 'Descoberta/Qualificação',
    description: 'Reunião marcada para o vendedor entender a situação e qualificar quem decide do lado do cliente.',
  },
  {
    id: 'warm_first',
    label: 'Primeiro Contato Morno',
    description: 'O cliente já deu um sinal de interesse, como baixar um material ou chegar por indicação, e o vendedor faz o contato a partir disso.',
  },
  {
    id: 'post_sale',
    label: 'Pós-Venda',
    description: 'Conversa recorrente com cliente da carteira. O vendedor ouve o momento, respeita o padrão de compra e só amplia se mostrar vantagem clara.',
  },
  {
    id: 'inbound',
    label: 'Contato Receptivo',
    description: 'O cliente procurou a empresa por conta própria. O vendedor atende, entende o motivo e qualifica.',
  },
  {
    id: 'presentation',
    label: 'Apresentação',
    description: 'Apresentação do produto para um cliente já qualificado, que pediu para ver como funciona.',
  },
  {
    id: 'negotiation',
    label: 'Negociação e fechamento',
    description: 'Proposta na mesa. O vendedor negocia condições, trata as objeções finais e busca o fechamento.',
  },
]

export const PROBLEM_AWARENESS_OPTIONS = [
  {
    id: 'unaware',
    label: 'Não percebe o problema',
    hint: 'Ainda não enxerga a dor; precisa ser educado sobre o impacto.',
  },
  {
    id: 'aware_lives_with',
    label: 'Sabe, mas convive com isso',
    hint: 'Dá o fato, mas minimiza; só prioriza depois de ver o custo do problema.',
  },
  {
    id: 'aware_searching',
    label: 'Sabe e já busca solução',
    hint: 'Reconhece a dor e compara alternativas ativamente.',
  },
  {
    id: 'urgent',
    label: 'Urgente / prioridade alta',
    hint: 'Quer resolver rápido; tempo e risco pesam mais que curiosidade.',
  },
]

export const LANGUAGE_OPTIONS = [
  { id: 'pt-BR', label: 'BR Português (Brasil)' },
  { id: 'en-US', label: 'EN English (US)' },
  { id: 'es-ES', label: 'ES Español' },
]

export const SALES_MODEL_OPTIONS = [
  {
    id: 'b2c',
    label: 'B2C - Pessoa Física',
    description: 'Vendas diretas para consumidores finais.',
    icon: 'user',
  },
  {
    id: 'b2b',
    label: 'B2B - Empresa',
    description: 'Vendas para empresas e organizações.',
    icon: 'building',
  },
]

export function scenarioTypeLabel(id) {
  return SCENARIO_TYPES.find((item) => item.id === id)?.label || 'Simulação'
}

export const VISIBILITY_OPTIONS = [
  { id: 'individual', label: 'Individual', description: 'Disponível apenas para você' },
  { id: 'group', label: 'Grupo', description: 'Disponível para os membros do grupo selecionado' },
  { id: 'company', label: 'Empresa', description: 'Disponível para todos os usuários da sua empresa' },
]

export const INTERACTION_MODE_OPTIONS = [
  { id: 'voice', label: 'Por voz', description: 'Conversa por voz com a persona.', icon: 'phone' },
  { id: 'text', label: 'Por texto', description: 'Conversa por texto com a persona.', icon: 'chat' },
  { id: 'both', label: 'Ambos', description: 'A persona aceita texto e voz.', icon: 'sliders' },
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
    interactionMode: 'voice',
    voiceRef: 'borges',
    scenarioContext: '',
    scenarioType: 'cold_first',
    evaluationTemplateId: '',
    sellerInstructions: '',
    visibility: 'individual',
    groupId: '',
    tags: [],
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
  let companyFacts = splitList(input, 'companyFacts', 'companyFactsText')
  const companyInfo = String(input.companyInfo || '').trim()
  if (!companyFacts.length && companyInfo) companyFacts = [companyInfo]

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
  const salesModel = input.salesModel === 'b2c' ? 'b2c' : 'b2b'
  const industry =
    String(input.industry || '').trim() || (salesModel === 'b2c' ? 'Consumidor' : '')
  const negotiatorType = String(input.negotiatorType || 'Cliente Analítico').trim()
  const sellerInstructions = String(input.sellerInstructions || '').trim()
  const scenarioType = SCENARIO_TYPES.some((item) => item.id === input.scenarioType)
    ? input.scenarioType
    : 'cold_first'
  const behavior =
    String(input.behavior || '').trim() ||
    [
      `Persona do tipo ${negotiatorType}.`,
      objections.length ? `Objeções típicas: ${objections.slice(0, 3).join('; ')}.` : '',
    ]
      .filter(Boolean)
      .join(' ')
  const trainingObjective =
    String(input.trainingObjective || '').trim() ||
    sellerInstructions ||
    `Treinar abordagem no cenário ${scenarioTypeLabel(scenarioType)}.`
  const difficulty = PERSONA_DIFFICULTIES.includes(input.difficulty)
    ? input.difficulty
    : 'beginner'

  const errors = []
  if (!name) errors.push('Nome é obrigatório.')
  if (!role) errors.push('Cargo / papel é obrigatório.')
  if (salesModel === 'b2b' && !industry) errors.push('Setor da empresa é obrigatório.')
  if (!String(input.location || '').trim()) errors.push('Localização é obrigatória.')
  if (!objections.length) errors.push('Informe ao menos uma objeção.')
  if (!personalDetails.length) errors.push('Informe ao menos um detalhe pessoal.')
  if (!priorities.length) errors.push('Informe ao menos uma prioridade.')
  if (!beliefs.length) errors.push('Informe ao menos uma crença ou opinião.')

  const persona = {
    name,
    role,
    company: String(input.company || '').trim() || 'Empresa',
    industry,
    location: String(input.location || '').trim(),
    language: String(input.language || 'pt-BR').trim() || 'pt-BR',
    negotiatorType,
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
    salesModel,
    companyInfo,
    trainingObjective,
    status: AGENT_STATUSES.includes(input.status) ? input.status : 'active',
    traits,
    interactionMode: ['text', 'voice', 'both'].includes(input.interactionMode)
      ? input.interactionMode
      : 'voice',
    voiceRef: String(input.voiceRef || 'borges').trim() || 'borges',
    scenarioContext: String(input.scenarioContext || '').trim(),
    scenarioType,
    evaluationTemplateId: String(input.evaluationTemplateId || '').trim() || undefined,
    sellerInstructions,
    visibility: ['individual', 'company', 'group'].includes(input.visibility) ? input.visibility : 'individual',
    groupId: String(input.groupId || '').trim() || undefined,
    tags: splitList(input, 'tags', 'tagsText'),
    companyFacts,
    avatarData: String(input.avatarData || '').trim() || undefined,
  }

  if (persona.visibility === 'group' && !persona.groupId) errors.push('Escolha o grupo desta persona.')
  if (!persona.sellerInstructions) errors.push('Informe as instruções ao vendedor.')
  if (!persona.evaluationTemplateId) errors.push('Escolha o template de avaliação.')
  if (salesModel === 'b2b' && !String(input.company || '').trim()) {
    errors.push('Nome da empresa é obrigatório.')
  }
  if (salesModel === 'b2b' && !persona.companyFacts.length) {
    errors.push('Informe ao menos uma informação da empresa.')
  }

  return { ok: errors.length === 0, errors, persona }
}
