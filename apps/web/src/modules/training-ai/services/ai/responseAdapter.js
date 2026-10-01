/**
 * Normalizes provider payloads into Training IA conversation messages.
 * Keeps session/report message shape stable across providers.
 */

import { createConversationMessage } from '../conversation.js'

/**
 * @param {import('./provider.js').AiProviderResponse|null|undefined} response
 * @param {{ speaker?: string, role?: 'ai'|'user' }} [options]
 */
export function adaptProviderResponseToMessage(response, options = {}) {
  const text = String(response?.text || '').trim()
  if (!text) {
    throw new Error('AI provider returned an empty response text')
  }

  const message = createConversationMessage({
    role: options.role || 'ai',
    speaker: options.speaker || 'Persona',
    text,
  })

  return {
    ...message,
    provider: response?.provider || null,
    finishReason: response?.finishReason || null,
    meta: response?.meta || null,
  }
}

/**
 * Build opening line without calling a generative provider.
 * Opening remains config-driven (persona.openingLine / script turn).
 */
export function adaptOpeningToMessage({ persona, scriptTurns = [], fallbackText }) {
  const text =
    persona?.openingLine ||
    scriptTurns[0]?.ai ||
    fallbackText ||
    'Iniciando simulação…'

  return createConversationMessage({
    role: 'ai',
    speaker: persona?.name || 'Persona',
    text,
  })
}

/**
 * @param {string} text
 * @param {{ speaker?: string }} [options]
 */
export function adaptUserTextToMessage(text, options = {}) {
  return createConversationMessage({
    role: 'user',
    speaker: options.speaker || 'Você',
    text,
  })
}

/**
 * @param {string} text
 * @param {{ speaker?: string }} [options]
 */
export function adaptAiTextToMessage(text, options = {}) {
  return createConversationMessage({
    role: 'ai',
    speaker: options.speaker || 'Persona',
    text,
  })
}
