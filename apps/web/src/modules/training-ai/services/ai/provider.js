/**
 * AI provider contract for Training IA.
 *
 * Implementations must be swappable without changing
 * TrainingAiContext, session model, reports, or scoring.
 *
 * Current: llm-mock (async DNA + judge) or classic mock.
 * Future: OpenAI-compatible HTTP adapter with the same shape.
 */

/**
 * @typedef {Object} AiMessageSnapshot
 * @property {string} id
 * @property {'ai'|'user'} role
 * @property {string} [speaker]
 * @property {string} text
 * @property {string} [timestamp]
 */

/**
 * @typedef {Object} AiPersonaReplyRequest
 * @property {object|null} persona
 * @property {object|null} scenario
 * @property {object|null} [template]
 * @property {object[]} [scriptTurns]
 * @property {AiMessageSnapshot[]} [messages]
 * @property {number} exchangeIndex
 * @property {string} userText
 * @property {object} [session]
 */

/**
 * @typedef {Object} AiProviderResponse
 * @property {string} text
 * @property {string} provider
 * @property {string} [finishReason]
 * @property {object} [meta]
 */

/**
 * @typedef {Object} AiRubricJudgeRequest
 * @property {object} template
 * @property {AiMessageSnapshot[]} [messages]
 * @property {object|null} [persona]
 * @property {object|null} [scenario]
 */

/**
 * @typedef {Object} AiRubricJudgeCriterion
 * @property {string} criterionId
 * @property {boolean} passed
 * @property {string} [rationale]
 */

/**
 * @typedef {Object} AiRubricJudgeResponse
 * @property {string} provider
 * @property {AiRubricJudgeCriterion[]} criteria
 * @property {object} [meta]
 */

/**
 * @typedef {Object} AiProvider
 * @property {string} id
 * @property {string} [label]
 * @property {(request: AiPersonaReplyRequest) => AiProviderResponse|Promise<AiProviderResponse>} generatePersonaReply
 * @property {(request: AiRubricJudgeRequest) => AiRubricJudgeResponse|Promise<AiRubricJudgeResponse>} [judgeRubric]
 */

/**
 * @param {unknown} provider
 * @returns {asserts provider is AiProvider}
 */
export function assertAiProvider(provider) {
  if (!provider || typeof provider !== 'object') {
    throw new Error('AI provider must be an object')
  }
  if (typeof provider.id !== 'string' || !provider.id.trim()) {
    throw new Error('AI provider must expose a non-empty id')
  }
  if (typeof provider.generatePersonaReply !== 'function') {
    throw new Error('AI provider must implement generatePersonaReply(request)')
  }
}

/**
 * Resolve sync or async provider results.
 * Mock providers return sync values; LLM-shaped providers return Promises.
 *
 * @param {AiProviderResponse|AiRubricJudgeResponse|Promise<any>} value
 * @returns {Promise<any>}
 */
export async function resolveProviderResponse(value) {
  return await value
}

/**
 * Sync helper for classic mock UI paths.
 * Throws if the provider returned a Promise (use engine async API).
 *
 * @param {AiProviderResponse|Promise<AiProviderResponse>} value
 * @returns {AiProviderResponse}
 */
export function resolveProviderResponseSync(value) {
  if (value != null && typeof value.then === 'function') {
    throw new Error(
      'Async AI providers require an async conversation turn. Use the engine async API.',
    )
  }
  return /** @type {AiProviderResponse} */ (value)
}
