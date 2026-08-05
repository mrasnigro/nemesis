/**
 * AI provider contract for Training IA.
 *
 * Implementations must be swappable without changing
 * TrainingAiContext, session model, reports, or scoring.
 *
 * Current: mock only. Future: LLM / voice adapters that return the same shape.
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
 * @typedef {Object} AiProvider
 * @property {string} id
 * @property {string} [label]
 * @property {(request: AiPersonaReplyRequest) => AiProviderResponse|Promise<AiProviderResponse>} generatePersonaReply
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
 * Mock providers return sync values; future LLM providers return Promises.
 *
 * @param {AiProviderResponse|Promise<AiProviderResponse>} value
 * @returns {Promise<AiProviderResponse>}
 */
export async function resolveProviderResponse(value) {
  return await value
}

/**
 * Sync helper for the current mock-first UI (sendMessage stays synchronous).
 * Throws if the provider returned a Promise (future LLM must use async path).
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
