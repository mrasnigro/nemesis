/**
 * LLM-shaped mock provider — offline stand-in for a real chat + rubric judge.
 *
 * Same contract as a future OpenAI-compatible adapter:
 * - generatePersonaReply → Promise
 * - judgeRubric → Promise (yes/no + rationale per criterion)
 *
 * No network. Uses persona DNA + keyword heuristics.
 */

import { flattenCriteria } from '../../data/evaluationTemplates.js'
import { buildFreeTextAnswers, evaluateCriterionPassRule } from '../conversation.js'
import { generateMockReply } from './mockProvider.js'
import { assertAiProvider } from './provider.js'

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

function dnaFlavor(persona, exchangeIndex, userText) {
  const trait = pick(persona?.traits, exchangeIndex) || persona?.negotiatorType
  const belief = pick(persona?.beliefs, 0)
  const detail = pick(persona?.personalDetails, exchangeIndex)
  const priority = pick(persona?.priorities, exchangeIndex)
  const objection = pick(persona?.objections, exchangeIndex)
  const user = normalize(userText)

  const askedAgenda =
    /\b(12|quinze|15|agenda|reuniao|discovery|proximo passo|marcar|agendar)\b/.test(user)
  const mentionedValue =
    /\b(valor|custo|econom|impacto|roi|eficiencia|pipeline|conversao)\b/.test(user)

  if (exchangeIndex === 0 && persona?.problemAwareness && !askedAgenda) {
    return `Olha, ${persona.problemAwareness} Então: por que sua abordagem muda isso agora?`
  }

  if (exchangeIndex === 1 && belief) {
    return objection
      ? `${objection} Além disso: ${belief}`
      : `Na prática: ${belief}`
  }

  if (exchangeIndex === 2 && (mentionedValue || askedAgenda)) {
    const awareness = persona?.solutionAwareness
    if (awareness) {
      return `${awareness}${priority ? ` O que mais pesa é ${priority}.` : ''}`
    }
  }

  if (exchangeIndex >= 3 && detail) {
    return askedAgenda
      ? `Ok — ${detail}. Se o próximo passo for curto e com objetivo claro, eu considero.`
      : `${detail} Resume o próximo passo ou encerramos.`
  }

  if (trait && exchangeIndex === 0) {
    return null
  }

  return null
}

/**
 * @param {import('./provider.js').AiPersonaReplyRequest} request
 */
export function generateLlmMockReply(request = {}) {
  const flavored = dnaFlavor(request.persona, request.exchangeIndex || 0, request.userText || '')
  if (flavored) return flavored

  return generateMockReply({
    persona: request.persona,
    scenario: request.scenario,
    scriptTurns: request.scriptTurns || [],
    exchangeIndex: request.exchangeIndex || 0,
    userText: request.userText || '',
  })
}

/**
 * Heuristic judge shaped like an LLM rubric response.
 * Starts from keyword pass rules, adds rationales (future model replaces this body).
 *
 * @param {import('./provider.js').AiRubricJudgeRequest} request
 * @returns {import('./provider.js').AiRubricJudgeResponse}
 */
export function judgeRubricHeuristic(request = {}) {
  const template = request.template
  const messages = request.messages || []
  const userMessages = messages.filter((m) => m.role === 'user')
  const corpus = normalize(userMessages.map((m) => m.text || '').join(' \n '))
  const criteria = flattenCriteria(template)

  const judged = criteria.map((criterion) => {
    const passed = evaluateCriterionPassRule(criterion, corpus)
    return {
      criterionId: criterion.id,
      passed,
      rationale: passed
        ? `Evidência no diálogo alinhada a: “${criterion.yesNoQuestion}”.`
        : `Sem evidência clara no diálogo para: “${criterion.yesNoQuestion}”.`,
    }
  })

  const answers = buildFreeTextAnswers({ template, userMessages })
  return {
    provider: 'llm-mock',
    criteria: judged,
    meta: {
      mode: 'heuristic-judge',
      quality: answers[0]?.quality || 'poor',
      userMessageCount: userMessages.length,
    },
  }
}

/**
 * @returns {import('./provider.js').AiProvider}
 */
export function createLlmMockAiProvider(options = {}) {
  const latencyMs = Number.isFinite(options.latencyMs) ? options.latencyMs : 280

  const provider = {
    id: 'llm-mock',
    label: 'LLM mock (DNA + judge, offline)',

    async generatePersonaReply(request = {}) {
      await delay(latencyMs)
      const text = generateLlmMockReply(request)
      return {
        text,
        provider: 'llm-mock',
        finishReason: 'stop',
        meta: {
          exchangeIndex: request.exchangeIndex || 0,
          dnaAware: true,
          latencyMs,
        },
      }
    },

    async judgeRubric(request = {}) {
      await delay(Math.max(120, Math.round(latencyMs * 0.6)))
      return judgeRubricHeuristic(request)
    },
  }

  assertAiProvider(provider)
  return provider
}
