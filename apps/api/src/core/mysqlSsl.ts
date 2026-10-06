import fs from 'node:fs'
import type { ConnectionOptions } from 'mysql2'

/** Aiven's free MySQL requires TLS and its own CA certificate. */
export function mysqlSslOptions(): ConnectionOptions['ssl'] {
  if (process.env.DB_SSL !== 'true') return undefined
  const raw = process.env.DB_SSL_CA?.trim()
  if (!raw) return { rejectUnauthorized: true }
  const ca = raw.includes('BEGIN CERTIFICATE') ? raw.replace(/\\n/g, '\n') : fs.readFileSync(raw, 'utf8')
  return { ca, rejectUnauthorized: true }
}
