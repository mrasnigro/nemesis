/**
 * Resolve which Training IA avatar provider drives the persona call stage.
 *
 * - `browser` (default when the browser can speak): real speech synthesis, no video.
 * - `mock`: silent timing only. Used when speech is unavailable, or forced with VITE_TRAINING_AVATAR_PROVIDER=mock.
 *
 * Future: heygen | d-id behind the same AvatarProvider surface (needs credentials and an adapter).
 */

import { createBrowserAvatarProvider, isBrowserSpeechSupported } from './browserAvatarProvider.js'
import { createMockAvatarProvider } from './mockAvatarProvider.js'

/** @returns {'browser'|'mock'} */
export function readTrainingAvatarProviderId(scope = globalThis) {
  const raw = String(
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TRAINING_AVATAR_PROVIDER) || '',
  )
    .trim()
    .toLowerCase()

  if (raw === 'mock') return 'mock'
  if (raw && raw !== 'browser') {
    console.warn(`[training-ai] Unknown VITE_TRAINING_AVATAR_PROVIDER="${raw}" — using the browser voice.`)
  }
  return isBrowserSpeechSupported(scope) ? 'browser' : 'mock'
}

/** @returns {import('./provider.js').AvatarProvider} */
export function resolveTrainingAvatarProvider() {
  return readTrainingAvatarProviderId() === 'browser' ? createBrowserAvatarProvider() : createMockAvatarProvider()
}
