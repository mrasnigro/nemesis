/**
 * Resolve which Training AI provider to load.
 * Offline default: llm-mock (async DNA replies + rubric judge contract).
 * Set VITE_TRAINING_AI_PROVIDER=mock for classic sync rules.
 *
 * Future: openai | compatible — same AiProvider surface, real HTTP.
 */

import { createLlmMockAiProvider } from './llmMockProvider.js'
import { createMockAiProvider } from './mockProvider.js'

/**
 * @returns {'mock'|'llm-mock'}
 */
export function readTrainingAiProviderId() {
  const raw = String(
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TRAINING_AI_PROVIDER) ||
      '',
  )
    .trim()
    .toLowerCase()

  if (raw === 'mock') return 'mock'
  if (raw === 'llm-mock' || raw === 'llm' || raw === '') return 'llm-mock'
  return 'llm-mock'
}

/**
 * @returns {import('./provider.js').AiProvider}
 */
export function resolveTrainingAiProvider() {
  const id = readTrainingAiProviderId()
  if (id === 'mock') return createMockAiProvider()
  return createLlmMockAiProvider()
}
