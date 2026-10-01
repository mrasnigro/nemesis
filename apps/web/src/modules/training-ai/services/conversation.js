/**
 * Conversation helpers for Training IA.
 *
 * Response generation lives under services/ai/ (provider abstraction).
 * This module keeps message shape helpers + free-text scoring (not LLM).
 */

export { generateMockReply } from './ai/mockProvider.js'

let messageSeq = 0

export function createConversationMessage({ role, text, speaker }) {
  messageSeq += 1
  return {
    id: `msg_${Date.now()}_${messageSeq}`,
    role, // 'ai' | 'user'
    speaker: speaker || (role === 'ai' ? 'persona' : 'trainee'),
    text: String(text || '').trim(),
    timestamp: new Date().toISOString(),
  }
}

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Rules that guide mock scoring from free-text trainee messages.
 * Patterns match normalized (accent-stripped) Portuguese.
 * Legacy fallback when criterion.passRule is absent.
 */
export const CRITERION_KEYWORD_RULES = {
  crit_saudacao: [/\bbom dia\b/, /\bboa tarde\b/, /\bola\b/, /\bsou da\b/, /\bme chamo\b/, /\bimp\b/],
  crit_permissao: [/\bsegundos\b/, /\bminuto\b/, /\bmomento\b/, /\bposso\b/, /\bbom momento\b/, /\bpermit/],
  crit_insight: [/\blogistic/, /\bindustria\b/, /\bsegmento\b/, /\bpipeline\b/, /\bleads?\b/, /\binsight\b/],
  crit_agenda: [/\b12 minut/, /\b15 minut/, /\bagenda\b/, /\bdiscovery\b/, /\breuniao\b/, /\bagendar\b/],
  crit_beneficio: [/\bvoce ganha\b/, /\bbeneficio\b/, /\beficiencia\b/, /\bresultado\b/, /\bimpacto\b/, /\bganho\b/],
  crit_decisor: [/\bdecisor\b/, /\bdiretor\b/, /\btime\b/, /\bstakeholder\b/, /\benvolver\b/, /\bquem decide\b/],
  crit_next: [/\bproximo passo\b/, /\bmarcar\b/, /\bagendar\b/, /\bsemana que vem\b/, /\bcalendario\b/],

  crit_empatia: [/\bentendo\b/, /\bfaz sentido\b/, /\bpressao\b/, /\bcusto\b/, /\borcamento\b/],
  crit_custo_oculto: [
    /\bcusto oculto\b/,
    /\boportunidade\b/,
    /\bpreco\b.*\bcusto/,
    /\bretrabalho\b/,
    /\bcusto de oportunidade\b/,
  ],
  crit_numero: [/\d+\s*%/, /\d+\s*(min|horas|dias|reais|r\$)/, /\b\d{2,}\b/],
  crit_piloto: [/\bpiloto\b/, /\bprova\b/, /\bteste\b/, /\btrial\b/, /\bcontrolad/],
  crit_sem_desconto: [],

  crit_processo: [/\bcomo funciona\b/, /\bprocesso\b/, /\bhoje\b/, /\batual\b/, /\brotina\b/],
  crit_gargalo: [/\bdor\b/, /\bgargalo\b/, /\btrava\b/, /\bdificuldade\b/, /\bproblema\b/],
  crit_cadencia: [/\bcadencia\b/, /\bmeta\b/, /\bowner\b/, /\bresponsavel\b/, /\bquem define\b/],
  crit_playbook: [/\bplaybook\b/, /\bmarco\b/, /\bproximo\b/, /\bagendar\b/, /\bdata\b/],
  crit_sem_pitch: [],
}

const DISCOUNT_PATTERNS = [/\bdesconto\b/, /\bmais barato\b/, /\babaixar preco\b/, /\bpreco menor\b/]
const EARLY_PITCH_PATTERNS = [
  /\bnossa plataforma\b/,
  /\btemos ia\b/,
  /\bfuncionalidades\b/,
  /\bfeatures\b/,
  /\bintegracao com\b/,
]

/**
 * Build synthetic answer objects (rubricImpact) from free-text conversation.
 * Prefer criterion.passRule; fall back to legacy CRITERION_KEYWORD_RULES by id.
 */
export function buildFreeTextAnswers({ template, userMessages = [] }) {
  const corpus = normalize(userMessages.map((m) => m.text || m).join(' \n '))
  const criteria = (template?.sections || []).flatMap((s) => s.criteria || [])
  const rubricImpact = {}
  let hitCount = 0

  for (const criterion of criteria) {
    const passed = evaluateCriterionPassRule(criterion, corpus)
    rubricImpact[criterion.id] = passed
    if (passed) hitCount += 1
  }

  const total = criteria.length || 1
  const ratio = hitCount / total
  const quality = ratio >= 0.7 ? 'good' : ratio >= 0.4 ? 'weak' : 'poor'

  return [
    {
      id: 'free_text',
      turnId: 'free',
      label: `Conversa livre (${userMessages.length} mensagem${userMessages.length === 1 ? '' : 'ens'})`,
      quality,
      rubricImpact,
      mode: 'free',
    },
  ]
}

function keywordToRegex(keyword) {
  const escaped = String(keyword || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!escaped) return null
  return new RegExp(escaped, 'i')
}

export function evaluateCriterionPassRule(criterion, corpus) {
  const rule = criterion?.passRule
  if (rule?.keywords?.length) {
    const patterns = rule.keywords.map(keywordToRegex).filter(Boolean)
    if (rule.type === 'avoid_keywords') {
      return !patterns.some((re) => re.test(corpus))
    }
    return patterns.some((re) => re.test(corpus))
  }

  if (criterion.id === 'crit_sem_desconto') {
    return !DISCOUNT_PATTERNS.some((re) => re.test(corpus))
  }
  if (criterion.id === 'crit_sem_pitch') {
    const diagnosed =
      CRITERION_KEYWORD_RULES.crit_processo.some((re) => re.test(corpus)) ||
      CRITERION_KEYWORD_RULES.crit_gargalo.some((re) => re.test(corpus))
    const pitchedHard = EARLY_PITCH_PATTERNS.some((re) => re.test(corpus))
    return diagnosed || !pitchedHard
  }

  const rules = CRITERION_KEYWORD_RULES[criterion.id]
  if (!rules?.length) return false
  return rules.some((re) => re.test(corpus))
}
