import { config } from '../../../core/config.js'
import { AppError } from '../../../core/errors.js'
import { createBuiltinProvider } from './builtin.provider.js'
import { createOpenAiProvider } from './openai.provider.js'
import type { AiProvider, ProviderStatus } from './types.js'

export type { AiProvider, ProviderStatus } from './types.js'

let override: AiProvider | null = null
let openai: AiProvider | null = null
const builtin = createBuiltinProvider()

/** Tests inject a provider here. Pass null to go back to the configured one. */
export function overrideAiProvider(provider: AiProvider | null) {
  override = provider
}

function configured(): AiProvider | null {
  if (config.TRAINING_AI_PROVIDER === 'openai') {
    if (!config.TRAINING_AI_API_KEY) return null
    openai ??= createOpenAiProvider({
      baseUrl: config.TRAINING_AI_BASE_URL,
      apiKey: config.TRAINING_AI_API_KEY,
      model: config.TRAINING_AI_MODEL,
      timeoutMs: config.TRAINING_AI_TIMEOUT_MS,
    })
    return openai
  }
  return config.allowBuiltinTrainingAi ? builtin : null
}

export function aiStatus(): ProviderStatus {
  if (override) return { provider: override.id, label: override.label, ready: true, reason: null }
  const provider = configured()
  if (provider) return { provider: provider.id, label: provider.label, ready: true, reason: null }
  if (config.TRAINING_AI_PROVIDER === 'openai') {
    return { provider: 'openai', label: 'Modelo de linguagem', ready: false, reason: 'TRAINING_AI_API_KEY não está configurada no servidor.' }
  }
  return {
    provider: 'builtin',
    label: 'Regras internas',
    ready: false,
    reason: 'Produção exige um provedor de IA. Configure TRAINING_AI_PROVIDER=openai e TRAINING_AI_API_KEY.',
  }
}

export function requireAiProvider(): AiProvider {
  const provider = override ?? configured()
  if (!provider) {
    throw new AppError(503, 'AI_NOT_CONFIGURED', aiStatus().reason ?? 'Provedor de IA não configurado.')
  }
  return provider
}
