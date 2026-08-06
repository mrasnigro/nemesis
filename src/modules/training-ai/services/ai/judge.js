/**
 * Rubric judge orchestration — prefers provider.judgeRubric, falls back to keywords.
 */

import { flattenCriteria } from '../../data/evaluationTemplates.js'
import { buildFreeTextAnswers } from '../conversation.js'
import { getConversationEngine } from './conversationEngine.js'
import { resolveProviderResponse } from './provider.js'

/**
 * Convert judge criteria list → free-text answer shape used by evaluateRubric.
 * @param {import('./provider.js').AiRubricJudgeResponse} judgment
 * @param {{ userMessageCount?: number }} [meta]
 */
export function judgmentToAnswers(judgment, meta = {}) {
  const rubricImpact = {}
  for (const item of judgment?.criteria || []) {
    if (item?.criterionId) {
      rubricImpact[item.criterionId] = Boolean(item.passed)
    }
  }

  const total = Object.keys(rubricImpact).length || 1
  const hitCount = Object.values(rubricImpact).filter(Boolean).length
  const ratio = hitCount / total
  const quality = ratio >= 0.7 ? 'good' : ratio >= 0.4 ? 'weak' : 'poor'
  const count = meta.userMessageCount ?? 0

  return [
    {
      id: 'free_text',
      turnId: 'free',
      label: `Conversa livre (${count} mensagem${count === 1 ? '' : 'ens'})`,
      quality,
      rubricImpact,
      mode: 'free',
      judgeProvider: judgment?.provider || 'keyword',
      rationales: (judgment?.criteria || []).map((item) => ({
        criterionId: item.criterionId,
        passed: Boolean(item.passed),
        rationale: item.rationale || '',
      })),
    },
  ]
}

/**
 * @param {{
 *   template: object,
 *   messages?: object[],
 *   persona?: object|null,
 *   scenario?: object|null,
 *   provider?: import('./provider.js').AiProvider|null,
 * }} input
 */
export async function judgeSessionRubric(input = {}) {
  const template = input.template
  if (!template) {
    throw new Error('judgeSessionRubric requires a template')
  }

  const messages = input.messages || []
  const userMessages = messages.filter((m) => m.role === 'user')
  const provider = input.provider || getConversationEngine().getProvider()

  if (typeof provider.judgeRubric === 'function') {
    try {
      const raw = provider.judgeRubric({
        template,
        messages,
        persona: input.persona ?? null,
        scenario: input.scenario ?? null,
      })
      const judgment = await resolveProviderResponse(raw)
      if (judgment?.criteria?.length) {
        return {
          answers: judgmentToAnswers(judgment, { userMessageCount: userMessages.length }),
          judgment,
          source: judgment.provider || provider.id,
        }
      }
    } catch {
      // fall through to keyword
    }
  }

  const answers = buildFreeTextAnswers({ template, userMessages })
  const criteria = flattenCriteria(template)
  const impact = answers[0]?.rubricImpact || {}
  const judgment = {
    provider: 'keyword',
    criteria: criteria.map((criterion) => ({
      criterionId: criterion.id,
      passed: Boolean(impact[criterion.id]),
      rationale: impact[criterion.id]
        ? `Regra de palavras-chave OK para “${criterion.yesNoQuestion}”.`
        : `Regra de palavras-chave sem match para “${criterion.yesNoQuestion}”.`,
    })),
    meta: { mode: 'keyword-fallback' },
  }

  return {
    answers: judgmentToAnswers(judgment, { userMessageCount: userMessages.length }),
    judgment,
    source: 'keyword',
  }
}
