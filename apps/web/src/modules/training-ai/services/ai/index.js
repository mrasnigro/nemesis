/**
 * Training IA — AI provider abstraction entrypoint.
 *
 * Context, sessions, reports, and scoring must depend on this surface,
 * not on a concrete LLM SDK.
 */

export {
  assertAiProvider,
  resolveProviderResponse,
  resolveProviderResponseSync,
} from './provider.js'

export { createMockAiProvider, generateMockReply } from './mockProvider.js'
export {
  createLlmMockAiProvider,
  generateLlmMockReply,
  judgeRubricHeuristic,
} from './llmMockProvider.js'
export { resolveTrainingAiProvider, readTrainingAiProviderId } from './resolveTrainingAiProvider.js'
export { judgeSessionRubric, judgmentToAnswers } from './judge.js'

export {
  adaptAiTextToMessage,
  adaptOpeningToMessage,
  adaptProviderResponseToMessage,
  adaptUserTextToMessage,
} from './responseAdapter.js'

export {
  configureConversationProvider,
  createConversationEngine,
  getConversationEngine,
  resetConversationEngine,
} from './conversationEngine.js'
