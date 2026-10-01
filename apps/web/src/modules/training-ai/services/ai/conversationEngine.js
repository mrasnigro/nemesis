/**
 * Conversation engine — orchestrates turns via an AI provider.
 * Sessions / scoring / reports stay outside this layer.
 */

import { assertAiProvider, resolveProviderResponse, resolveProviderResponseSync } from './provider.js'
import { resolveTrainingAiProvider } from './resolveTrainingAiProvider.js'
import {
  adaptAiTextToMessage,
  adaptOpeningToMessage,
  adaptProviderResponseToMessage,
  adaptUserTextToMessage,
} from './responseAdapter.js'

/**
 * @param {{ provider?: import('./provider.js').AiProvider }} [options]
 */
export function createConversationEngine(options = {}) {
  let provider = options.provider || resolveTrainingAiProvider()
  assertAiProvider(provider)

  return {
    getProvider() {
      return provider
    },

    /**
     * Swap provider at runtime. Context need not change.
     * @param {import('./provider.js').AiProvider} nextProvider
     */
    setProvider(nextProvider) {
      assertAiProvider(nextProvider)
      provider = nextProvider
      return provider
    },

    createOpeningMessage(input) {
      return adaptOpeningToMessage(input)
    },

    createUserMessage(text, options) {
      return adaptUserTextToMessage(text, options)
    },

    createAiMessage(text, options) {
      return adaptAiTextToMessage(text, options)
    },

    /**
     * Sync persona reply — only for sync providers (classic mock).
     */
    generateReplyMessage(request = {}) {
      const raw = provider.generatePersonaReply({
        persona: request.persona ?? null,
        scenario: request.scenario ?? null,
        template: request.template ?? null,
        scriptTurns: request.scriptTurns || [],
        messages: request.messages || [],
        exchangeIndex: request.exchangeIndex || 0,
        userText: request.userText || '',
        session: request.session ?? null,
      })
      const response = resolveProviderResponseSync(raw)
      return adaptProviderResponseToMessage(response, {
        speaker: request.persona?.name || 'Persona',
      })
    },

    /**
     * Async persona reply — preferred path (llm-mock / future HTTP).
     */
    async generateReplyMessageAsync(request = {}) {
      const raw = provider.generatePersonaReply({
        persona: request.persona ?? null,
        scenario: request.scenario ?? null,
        template: request.template ?? null,
        scriptTurns: request.scriptTurns || [],
        messages: request.messages || [],
        exchangeIndex: request.exchangeIndex || 0,
        userText: request.userText || '',
        session: request.session ?? null,
      })
      const response = await resolveProviderResponse(raw)
      return adaptProviderResponseToMessage(response, {
        speaker: request.persona?.name || 'Persona',
      })
    },
  }
}

/** Module-level engine so context can stay thin and providers stay swappable. */
let defaultEngine = null

export function getConversationEngine() {
  if (!defaultEngine) {
    defaultEngine = createConversationEngine()
  }
  return defaultEngine
}

/**
 * Replace the default provider (tests / feature flags).
 * @param {import('./provider.js').AiProvider} provider
 */
export function configureConversationProvider(provider) {
  const engine = getConversationEngine()
  return engine.setProvider(provider)
}

/** Reset to a fresh engine from env resolver (smoke / tests). */
export function resetConversationEngine(options = {}) {
  defaultEngine = createConversationEngine({
    provider: options.provider || resolveTrainingAiProvider(),
  })
  return defaultEngine
}
