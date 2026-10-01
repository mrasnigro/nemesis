/**
 * Training IA — avatar provider abstraction entrypoint.
 *
 * PersonaCallStage / Simulation depend on this surface, not on a concrete speech or video SDK.
 */

export { assertAvatarProvider, resolveProviderResponse } from './provider.js'

export { createMockAvatarProvider, estimateSpeechDurationMs } from './mockAvatarProvider.js'
export { createBrowserAvatarProvider, isBrowserSpeechSupported, pickVoice } from './browserAvatarProvider.js'
export {
  resolveTrainingAvatarProvider,
  readTrainingAvatarProviderId,
} from './resolveTrainingAvatarProvider.js'

export {
  configureAvatarProvider,
  createAvatarEngine,
  getAvatarEngine,
  resetAvatarEngine,
} from './avatarEngine.js'
