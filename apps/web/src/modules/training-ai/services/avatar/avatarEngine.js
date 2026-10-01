/**
 * Avatar engine: orchestrates persona call-stage sessions through an AvatarProvider.
 * PersonaCallStage / Simulation stay outside this layer.
 */

import { assertAvatarProvider, resolveProviderResponse } from './provider.js'
import { resolveTrainingAvatarProvider } from './resolveTrainingAvatarProvider.js'

/**
 * @param {{ provider?: import('./provider.js').AvatarProvider }} [options]
 */
export function createAvatarEngine(options = {}) {
  let provider = options.provider || resolveTrainingAvatarProvider()
  assertAvatarProvider(provider)

  let sessionRef = null
  let sessionPersonaId = null

  return {
    getProvider() {
      return provider
    },

    /**
     * Swap provider at runtime (feature flags / real adapter later).
     * @param {import('./provider.js').AvatarProvider} nextProvider
     */
    setProvider(nextProvider) {
      assertAvatarProvider(nextProvider)
      provider = nextProvider
      sessionRef = null
      sessionPersonaId = null
      return provider
    },

    /**
     * Ensure a session exists for the given persona, reusing it while the
     * persona stays the same across turns.
     * @param {object|null} persona
     */
    async ensureSession(persona) {
      const personaId = persona?.id || null
      if (sessionRef && sessionPersonaId === personaId) {
        return sessionRef
      }
      const handle = await resolveProviderResponse(provider.startSession({ persona }))
      sessionRef = handle?.sessionRef ?? handle ?? null
      sessionPersonaId = personaId
      return sessionRef
    },

    /**
     * Have the persona "speak" a line. Resolves once the speaking
     * duration elapses so the UI can drive a speaking/caption state.
     * @param {object|null} persona
     * @param {string} text
     */
    async speak(persona, text) {
      const ref = await this.ensureSession(persona)
      return resolveProviderResponse(provider.speak({ sessionRef: ref, text, persona }))
    },

    /** Tear down the current session (leaving the call stage / finishing). */
    async stopSession() {
      if (sessionRef && provider.stopSession) {
        await resolveProviderResponse(provider.stopSession({ sessionRef }))
      }
      sessionRef = null
      sessionPersonaId = null
    },
  }
}

/** Module-level engine so callers can stay thin and providers stay swappable. */
let defaultEngine = null

export function getAvatarEngine() {
  if (!defaultEngine) {
    defaultEngine = createAvatarEngine()
  }
  return defaultEngine
}

/**
 * Replace the default provider (tests / feature flags).
 * @param {import('./provider.js').AvatarProvider} provider
 */
export function configureAvatarProvider(provider) {
  const engine = getAvatarEngine()
  return engine.setProvider(provider)
}

/** Reset to a fresh engine from env resolver (smoke / tests). */
export function resetAvatarEngine(options = {}) {
  defaultEngine = createAvatarEngine({
    provider: options.provider || resolveTrainingAvatarProvider(),
  })
  return defaultEngine
}
