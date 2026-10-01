/**
 * Training IA — avatar provider abstraction entrypoint.
 *
 * PersonaCallStage / Simulation must depend on this surface,
 * not on a concrete video/lip-sync SDK.
 */

export { assertAvatarProvider, resolveProviderResponse } from './provider.js'

export { createMockAvatarProvider, estimateSpeechDurationMs } from './mockAvatarProvider.js'
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
