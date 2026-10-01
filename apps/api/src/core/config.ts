import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

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
  SEED_USERNAME: z.string().default('imp'),
  SEED_PASSWORD: z.string().default('imp'),
  SEED_NAME: z.string().default('IMP User'),
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
}
