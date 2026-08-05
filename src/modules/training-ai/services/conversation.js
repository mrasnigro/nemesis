/**
 * Mock conversation helpers for free-text training (no LLM / voice / TTS).
 */

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

function pick(list, index) {
  if (!list?.length) return null
  return list[index % list.length]
}

/**
 * Progressive mock replies driven by persona + scenario script turns.
 * Exchange index = number of completed user turns (0-based after user sends).
 */
export function generateMockReply({
  persona,
  scenario,
  scriptTurns = [],
  exchangeIndex = 0,
  userText = '',
}) {
  const objections = persona?.objections || []
  const priorities = persona?.priorities || []
  const industry = persona?.industry || scenario?.segment || 'seu mercado'
  const user = normalize(userText)

  const askedAgenda =
    /\b(12|quinze|15|agenda|reuniao|discovery|proximo passo|marcar|agendar)\b/.test(user)
  const askedPermission = /\b(segundos|minuto|momento|posso|permita|bom momento)\b/.test(user)
  const mentionedValue =
    /\b(valor|custo|econom|impacto|roi|eficiencia|pipeline|conversao)\b/.test(user)
  const mentionedPilot = /\b(piloto|prova|teste|trial|playbook)\b/.test(user)

  // Prefer scripted AI lines from legacy MCQ turns (skip index 0 = opening already shown).
  const scripted = scriptTurns[exchangeIndex + 1]?.ai
  if (scripted && exchangeIndex < 2) {
    return scripted
  }

  if (exchangeIndex === 0) {
    if (askedPermission) {
      return 'Pode falar, mas seja breve — estou no meio de uma reunião.'
    }
    return pick(
      [
        `Ok… e por que isso importa para ${industry} agora?`,
        `Entendi. Em ${persona?.company || 'nossa operação'} o tempo é curto — qual o ponto?`,
        'Continuo ouvindo, mas preciso entender o ganho concreto.',
      ],
      exchangeIndex,
    )
  }

  if (exchangeIndex === 1) {
    const objection =
      pick(objections, 0) ||
      'Já temos um fornecedor e o orçamento está fechado.'
    if (askedAgenda) {
      return `Agenda eu até considero, mas primeiro: ${objection}`
    }
    return `${objection} Como vocês se diferenciam sem parecer pitch genérico?`
  }

  if (exchangeIndex === 2) {
    if (mentionedValue || mentionedPilot) {
      return `Hmm. Se houver um piloto enxuto e métricas claras, posso envolver meu time. Quem mais precisaria participar?`
    }
    const priority = pick(priorities, 0)
    return priority
      ? `O que mais pesa aqui é: ${priority}. Sem isso, fica difícil avançar.`
      : `Ainda não vi como isso muda nossa rotina comercial. Tem um exemplo do segmento?`
  }

  if (exchangeIndex >= 3) {
    if (askedAgenda || mentionedPilot) {
      return `Certo. Se quiser, podemos fechar um próximo passo curto — me diga o objetivo e o tempo. Caso contrário, encerre o treino quando estiver pronto.`
    }
    return `Estou com menos margem nesta conversa. Resume o próximo passo ou podemos encerrar por aqui.`
  }

  return `Pode continuar — o que você propõe como próximo passo?`
}

/**
 * Rules that guide mock scoring from free-text trainee messages.
 * Patterns match normalized (accent-stripped) Portuguese.
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
  crit_sem_desconto: [], // passed unless discount language appears

  crit_processo: [/\bcomo funciona\b/, /\bprocesso\b/, /\bhoje\b/, /\batual\b/, /\brotina\b/],
  crit_gargalo: [/\bdor\b/, /\bgargalo\b/, /\btrava\b/, /\bdificuldade\b/, /\bproblema\b/],
  crit_cadencia: [/\bcadencia\b/, /\bmeta\b/, /\bowner\b/, /\bresponsavel\b/, /\bquem define\b/],
  crit_playbook: [/\bplaybook\b/, /\bmarco\b/, /\bproximo\b/, /\bagendar\b/, /\bdata\b/],
  crit_sem_pitch: [], // passed unless heavy feature dump without diagnosis
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
 */
export function buildFreeTextAnswers({ template, userMessages = [] }) {
  const corpus = normalize(userMessages.map((m) => m.text || m).join(' \n '))
  const criteria = (template?.sections || []).flatMap((s) => s.criteria || [])
  const rubricImpact = {}
  let hitCount = 0

  for (const criterion of criteria) {
    const rules = CRITERION_KEYWORD_RULES[criterion.id]

    if (criterion.id === 'crit_sem_desconto') {
      rubricImpact[criterion.id] = !DISCOUNT_PATTERNS.some((re) => re.test(corpus))
      if (rubricImpact[criterion.id]) hitCount += 1
      continue
    }

    if (criterion.id === 'crit_sem_pitch') {
      const diagnosed =
        CRITERION_KEYWORD_RULES.crit_processo.some((re) => re.test(corpus)) ||
        CRITERION_KEYWORD_RULES.crit_gargalo.some((re) => re.test(corpus))
      const pitchedHard = EARLY_PITCH_PATTERNS.some((re) => re.test(corpus))
      rubricImpact[criterion.id] = diagnosed || !pitchedHard
      if (rubricImpact[criterion.id]) hitCount += 1
      continue
    }

    if (!rules?.length) {
      rubricImpact[criterion.id] = false
      continue
    }

    const passed = rules.some((re) => re.test(corpus))
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
