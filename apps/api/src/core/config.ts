import dotenv from 'dotenv'
import { z } from 'zod'

if (process.env.NODE_ENV !== 'test') {
  dotenv.config()
}

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.string().default('development'),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  ALLOW_DEV_AUTH: z.string().optional(),
  /** Express "trust proxy" value; set to 1 behind a single reverse proxy so req.ip is the client. */
  TRUST_PROXY: z.string().default('false'),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
  /** Public webinar sign-ups allowed per IP every 15 minutes. */
  WEBINAR_REGISTER_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(20),
  /** Viewers one live webinar can serve at once. Each viewer is a open connection fed by this process. */
  WEBINAR_STREAM_MAX_VIEWERS: z.coerce.number().int().min(1).default(200),
  WEBINAR_API_URL: z.string().url().optional(),
  WEBINAR_HANDOFF_SHARED_KEY: z.string().min(16).optional(),
  SEED_USERNAME: z.string().default('imp'),
  SEED_PASSWORD: z.string().default('imp'),
  SEED_NAME: z.string().default('IMP User'),
  SEED_ADMIN_USERNAME: z.string().default('admin'),
  SEED_ADMIN_PASSWORD: z.string().default('admin'),
  TELEPHONY_SECRET_KEY: z.string().min(32).optional(),
  TELEPHONY_DEFAULT_PROVIDER: z.enum(['none', 'simulated']).default('none'),
  PABX_TIMEZONE: z.string().default('America/Sao_Paulo'),
  RECORDINGS_DIR: z.string().default('storage/recordings'),
  /** Treinamento IA. `builtin` is a rule-based stand-in and is refused in production; `openai` is any OpenAI-compatible chat API. */
  TRAINING_AI_PROVIDER: z.enum(['builtin', 'openai']).default('builtin'),
  TRAINING_AI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  TRAINING_AI_API_KEY: z.string().min(1).optional(),
  TRAINING_AI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  TRAINING_AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(30_000),
  /** Trainee messages allowed in one session. */
  TRAINING_AI_MAX_TURNS: z.coerce.number().int().min(1).max(200).default(40),
  /** Discagem Automática call summary and transcription. Unset values fall back to the TRAINING_AI_* ones. */
  CALL_AI_BASE_URL: z.string().url().optional(),
  CALL_AI_API_KEY: z.string().min(1).optional(),
  CALL_AI_MODEL: z.string().min(1).optional(),
  /** Speech-to-text model of the same API; `off` disables transcription. */
  CALL_TRANSCRIBE_MODEL: z.string().min(1).default('whisper-1'),
  CALL_AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(600_000).default(120_000),
  /**
   * Treinamento IA voice calls: speech-to-text -> LLM (TRAINING_AI_*) -> text-to-speech, all on the server.
   * Any OpenAI-compatible API works (OpenAI Whisper / tts-1, Groq, a local Kokoro-FastAPI...).
   * Unset URL and key fall back to the TRAINING_AI_* ones, so one OpenAI key is enough. `off` disables a stage.
   */
  STT_BASE_URL: z.string().url().optional(),
  STT_API_KEY: z.string().min(1).optional(),
  /** openai is any OpenAI-compatible /audio/transcriptions API; deepgram calls Deepgram's own /listen API (needs STT_API_KEY). */
  STT_PROVIDER: z.enum(['openai', 'deepgram']).default('openai'),
  /** Defaults to whisper-1 (openai) or nova-3 (deepgram). */
  STT_MODEL: z.string().min(1).optional(),
  STT_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(30_000),
  TTS_BASE_URL: z.string().url().optional(),
  TTS_API_KEY: z.string().min(1).optional(),
  TTS_MODEL: z.string().min(1).default('tts-1'),
  /** Voice for female / male personas. Kokoro: pf_dora / pm_alex. OpenAI: nova / onyx. */
  TTS_VOICE_FEMALE: z.string().min(1).default('nova'),
  TTS_VOICE_MALE: z.string().min(1).default('onyx'),
  /** Speaking pace, 0.25 to 4. 1 is natural; the default is slightly faster. */
  TTS_SPEED: z.coerce.number().min(0.25).max(4).default(1.15),
  TTS_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(30_000),
  /** Voice replies only: minimal/low makes a reasoning model answer sooner. Unset sends nothing (models that do not know it reject it). */
  TRAINING_AI_REASONING_EFFORT: z.enum(['none', 'minimal', 'low', 'medium', 'high']).optional(),
})

/** Names used by other IMP projects are accepted for the language model. */
function withEnvAliases(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    ...env,
    TRAINING_AI_API_KEY: env.TRAINING_AI_API_KEY || env.LLM_API_KEY || undefined,
    TRAINING_AI_BASE_URL: env.TRAINING_AI_BASE_URL || env.LLM_BASE_URL || undefined,
    TRAINING_AI_MODEL: env.TRAINING_AI_MODEL || env.LLM_MODEL || undefined,
  }
}

const parsed = schema.safeParse(withEnvAliases(process.env))

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => issue.path.join('.') || 'env').join(', ')
  throw new Error(`Invalid API environment: ${details}`)
}

export const config = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  allowDevAuth: parsed.data.ALLOW_DEV_AUTH === 'true' && parsed.data.NODE_ENV !== 'production',
  allowSimulatedTelephony: parsed.data.NODE_ENV !== 'production',
  allowBuiltinTrainingAi: parsed.data.NODE_ENV !== 'production',
  trustProxy: parseTrustProxy(parsed.data.TRUST_PROXY),
  callAi: callAiOptions(parsed.data),
  voice: voiceOptions(parsed.data),
}

function voiceOptions(env: z.infer<typeof schema>) {
  const deepgram = env.STT_PROVIDER === 'deepgram'
  // Deepgram has its own key: the language model's key would never work there.
  const stt = deepgram ? env.STT_API_KEY : (env.STT_API_KEY ?? env.TRAINING_AI_API_KEY)
  const sttModel = env.STT_MODEL ?? (deepgram ? 'nova-3' : 'whisper-1')
  const tts = env.TTS_API_KEY ?? env.TRAINING_AI_API_KEY
  return {
    stt:
      stt && sttModel !== 'off'
        ? {
            provider: env.STT_PROVIDER,
            baseUrl: env.STT_BASE_URL ?? (deepgram ? 'https://api.deepgram.com/v1' : env.TRAINING_AI_BASE_URL),
            apiKey: stt,
            model: sttModel,
            timeoutMs: env.STT_TIMEOUT_MS,
          }
        : null,
    tts:
      tts && env.TTS_MODEL !== 'off'
        ? {
            baseUrl: env.TTS_BASE_URL ?? env.TRAINING_AI_BASE_URL,
            apiKey: tts,
            model: env.TTS_MODEL,
            voiceFemale: env.TTS_VOICE_FEMALE,
            voiceMale: env.TTS_VOICE_MALE,
            speed: env.TTS_SPEED,
            timeoutMs: env.TTS_TIMEOUT_MS,
          }
        : null,
  }
}

function callAiOptions(env: z.infer<typeof schema>) {
  const apiKey = env.CALL_AI_API_KEY ?? env.TRAINING_AI_API_KEY
  if (!apiKey) return null
  return {
    baseUrl: env.CALL_AI_BASE_URL ?? env.TRAINING_AI_BASE_URL,
    apiKey,
    model: env.CALL_AI_MODEL ?? env.TRAINING_AI_MODEL,
    transcribeModel: env.CALL_TRANSCRIBE_MODEL === 'off' ? null : env.CALL_TRANSCRIBE_MODEL,
    timeoutMs: env.CALL_AI_TIMEOUT_MS,
  }
}

function parseTrustProxy(value: string): boolean | number | string {
  if (value === 'true') return true
  if (value === 'false') return false
  return /^\d+$/.test(value) ? Number(value) : value
}
