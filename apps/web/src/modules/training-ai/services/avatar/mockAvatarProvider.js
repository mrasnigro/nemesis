/**
 * Silent avatar provider: no voice and no video. speak() resolves after an estimated speaking duration so
 * PersonaCallStage can still animate and caption. Fallback when the browser has no speech synthesis.
 */

import { assertAvatarProvider } from './provider.js'

const WORDS_PER_MINUTE = 150
const MIN_DURATION_MS = 1200
const MAX_DURATION_MS = 9000

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * @param {string} text
 * @returns {number}
 */
export function estimateSpeechDurationMs(text = '') {
  const words = String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
  if (!words) return MIN_DURATION_MS
  const ms = Math.round((words / WORDS_PER_MINUTE) * 60000)
  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, ms))
}

let sessionCounter = 0

/**
 * @returns {import('./provider.js').AvatarProvider}
 */
export function createMockAvatarProvider() {
  const provider = {
    id: 'mock',
    label: 'Sem voz (apenas tempo de fala)',

    startSession({ persona } = {}) {
      sessionCounter += 1
      return {
        sessionRef: `mock_avatar_${persona?.id || 'persona'}_${sessionCounter}`,
      }
    },

    async speak({ text } = {}) {
      const durationMs = estimateSpeechDurationMs(text)
      await delay(durationMs)
      return {
        durationMs,
        text: String(text || ''),
        provider: 'mock',
      }
    },

    stopSession() {
      return undefined
    },
  }

  assertAvatarProvider(provider)
  return provider
}
