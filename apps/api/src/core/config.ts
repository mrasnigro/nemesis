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
})

const parsed = schema.safeParse(process.env)

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
