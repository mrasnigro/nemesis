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
  trustProxy: parseTrustProxy(parsed.data.TRUST_PROXY),
}

function parseTrustProxy(value: string): boolean | number | string {
  if (value === 'true') return true
  if (value === 'false') return false
  return /^\d+$/.test(value) ? Number(value) : value
}
