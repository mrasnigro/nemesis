import { judgeByRules, normalizeText } from '../rubric.js'
import type { AiProvider, PersonaProfile, ReplyRequest } from './types.js'

/**
 * Rule-based stand-in for a language model. It answers from the persona's own fields (objections, beliefs,
 * priorities...) and judges with the playbook's keyword rules. Good enough for development and tests; the
 * API refuses it in production because it is not a conversation.
 */

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : []
}

function pick(items: string[], index: number): string | null {
  return items.length ? items[index % items.length] : null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

const AGENDA = /\b(12|quinze|15|agenda|reuniao|discovery|proximo passo|marcar|agendar)\b/
const PERMISSION = /\b(segundos|minuto|momento|posso|permita|bom momento)\b/
const VALUE = /\b(valor|custo|econom|impacto|roi|eficiencia|pipeline|conversao)\b/
const PILOT = /\b(piloto|prova|teste|trial|playbook)\b/

function dnaReply(persona: PersonaProfile, exchangeIndex: number, userText: string): string | null {
  const user = normalizeText(userText)
  const askedAgenda = AGENDA.test(user)
  const mentionedValue = VALUE.test(user)
  const problem = text(persona.problemAwareness)
  const belief = pick(list(persona.beliefs), 0)
  const objection = pick(list(persona.objections), exchangeIndex)
  const priority = pick(list(persona.priorities), exchangeIndex)
  const detail = pick(list(persona.personalDetails), exchangeIndex)

  if (exchangeIndex === 0 && problem && !askedAgenda) {
    return `Olha, ${problem} Então: por que sua abordagem muda isso agora?`
  }
  if (exchangeIndex === 1 && belief) {
    return objection ? `${objection} Além disso: ${belief}` : `Na prática: ${belief}`
  }
  if (exchangeIndex === 2 && (mentionedValue || askedAgenda)) {
    const awareness = text(persona.solutionAwareness)
    if (awareness) return `${awareness}${priority ? ` O que mais pesa é ${priority}.` : ''}`
  }
  if (exchangeIndex >= 3 && detail) {
    return askedAgenda
      ? `Ok — ${detail}. Se o próximo passo for curto e com objetivo claro, eu considero.`
      : `${detail} Resume o próximo passo ou encerramos.`
  }
  return null
}

function scriptedReply(request: ReplyRequest, userText: string): string {
  const { persona, scenario, exchangeIndex } = request
  const user = normalizeText(userText)
  const industry = text(persona.industry) || text(scenario.segment) || 'seu mercado'
  const objections = list(persona.objections)
  const priorities = list(persona.priorities)

  if (exchangeIndex === 0) {
    if (PERMISSION.test(user)) return 'Pode falar, mas seja breve — estou no meio de uma reunião.'
    return pick(
      [
        `Ok… e por que isso importa para ${industry} agora?`,
        `Entendi. Em ${text(persona.company) || 'nossa operação'} o tempo é curto — qual o ponto?`,
        'Continuo ouvindo, mas preciso entender o ganho concreto.',
      ],
      exchangeIndex,
    ) as string
  }
  if (exchangeIndex === 1) {
    const objection = pick(objections, 0) ?? 'Já temos um fornecedor e o orçamento está fechado.'
    return AGENDA.test(user)
      ? `Agenda eu até considero, mas primeiro: ${objection}`
      : `${objection} Como vocês se diferenciam sem parecer pitch genérico?`
  }
  if (exchangeIndex === 2) {
    if (VALUE.test(user) || PILOT.test(user)) {
      return 'Hmm. Se houver um piloto enxuto e métricas claras, posso envolver meu time. Quem mais precisaria participar?'
    }
    const priority = pick(priorities, 0)
    return priority
      ? `O que mais pesa aqui é: ${priority}. Sem isso, fica difícil avançar.`
      : 'Ainda não vi como isso muda nossa rotina comercial. Tem um exemplo do segmento?'
  }
  if (AGENDA.test(user) || PILOT.test(user)) {
    return 'Certo. Se quiser, podemos fechar um próximo passo curto — me diga o objetivo e o tempo. Caso contrário, encerre o treino quando estiver pronto.'
  }
  return 'Estou com menos margem nesta conversa. Resume o próximo passo ou podemos encerrar por aqui.'
}

export function createBuiltinProvider(): AiProvider {
  return {
    id: 'builtin',
    label: 'Regras internas (desenvolvimento)',

    async reply(request) {
      const last = request.history[request.history.length - 1]
      const userText = last?.role === 'user' ? last.text : ''
      const reply = dnaReply(request.persona, request.exchangeIndex, userText) ?? scriptedReply(request, userText)
      return { text: reply }
    },

    async judge(request) {
      const traineeTexts = request.messages.filter((message) => message.role === 'user').map((message) => message.text)
      return judgeByRules(request.template, traineeTexts, 'builtin')
    },
  }
}
