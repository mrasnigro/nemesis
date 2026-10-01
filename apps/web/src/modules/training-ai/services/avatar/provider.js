/**
 * Avatar provider contract for Training IA's persona call stage.
 *
 * Implementations are swappable without changing Simulation.jsx or PersonaCallStage.
 *
 * Providers: browser (speech synthesis), mock (silent timing fallback).
 * Future: HeyGen / D-ID adapter with the same shape (needs credentials).
 */

/**
 * @typedef {Object} AvatarStartSessionRequest
 * @property {object|null} persona
 */

/**
 * @typedef {Object} AvatarSessionHandle
 * @property {*} sessionRef
 */

/**
 * @typedef {Object} AvatarSpeakRequest
 * @property {*} sessionRef
 * @property {string} text
 * @property {object|null} [persona]
 */

/**
 * @typedef {Object} AvatarSpeakResponse
 * @property {number} durationMs
 * @property {string} [text]
 * @property {string} provider
 */

/**
 * @typedef {Object} AvatarStopSessionRequest
 * @property {*} sessionRef
 */

/**
 * @typedef {Object} AvatarProvider
 * @property {string} id
 * @property {string} [label]
 * @property {(request: AvatarStartSessionRequest) => AvatarSessionHandle|Promise<AvatarSessionHandle>} startSession
 * @property {(request: AvatarSpeakRequest) => AvatarSpeakResponse|Promise<AvatarSpeakResponse>} speak
 * @property {(request: AvatarStopSessionRequest) => void|Promise<void>} [stopSession]
 */

/**
 * @param {unknown} provider
 * @returns {asserts provider is AvatarProvider}
 */
export function assertAvatarProvider(provider) {
  if (!provider || typeof provider !== 'object') {
    throw new Error('Avatar provider must be an object')
  }
  if (typeof provider.id !== 'string' || !provider.id.trim()) {
    throw new Error('Avatar provider must expose a non-empty id')
  }
  if (typeof provider.startSession !== 'function') {
    throw new Error('Avatar provider must implement startSession(request)')
  }
  if (typeof provider.speak !== 'function') {
    throw new Error('Avatar provider must implement speak(request)')
  }
}

/**
 * Resolve sync or async provider results.
 *
 * @param {AvatarSessionHandle|AvatarSpeakResponse|Promise<any>} value
 * @returns {Promise<any>}
 */
export async function resolveProviderResponse(value) {
  return await value
}
