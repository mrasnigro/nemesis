/**
 * Resolve which Training IA avatar provider to load for the persona call stage.
 * Offline default and only implemented value today: mock (timing-only stub).
 *
 * Future: heygen | d-id — same AvatarProvider surface, real video/lip-sync.
 * Do not set VITE_TRAINING_AVATAR_PROVIDER to those until a real adapter
 * exists and credentials are configured; unknown values fall back to mock.
 */

import { createMockAvatarProvider } from './mockAvatarProvider.js'

const KNOWN_IDS = ['mock']

/**
 * @returns {'mock'}
 */
export function readTrainingAvatarProviderId() {
  const raw = String(
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TRAINING_AVATAR_PROVIDER) ||
      '',
  )
    .trim()
    .toLowerCase()

  if (!raw || raw === 'mock') return 'mock'

  if (!KNOWN_IDS.includes(raw)) {
    console.warn(
      `[training-ai] Unknown VITE_TRAINING_AVATAR_PROVIDER="${raw}" (no real provider implemented yet) — falling back to mock.`,
    )
  }
  return 'mock'
}

/**
 * @returns {import('./provider.js').AvatarProvider}
 */
export function resolveTrainingAvatarProvider() {
  readTrainingAvatarProviderId()
  return createMockAvatarProvider()
}
