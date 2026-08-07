import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import dotenv from 'dotenv'
import * as schema from './schema.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const backendRoot = path.resolve(__dirname, '../..')
const serviceRoot = path.resolve(backendRoot, '..')

function loadBackendEnv() {
  const candidates = [
    path.resolve(backendRoot, '.env'),
    path.resolve(serviceRoot, '.env'),
    path.resolve(serviceRoot, '.env.production'),
    path.resolve(process.cwd(), '.env'),
  ]
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      dotenv.config({ path: file, override: false })
      console.log(`📄 Env carregado: ${file}`)
    }
  }
}

loadBackendEnv()

/** Default: services/webinar/database/sqlite.db */
export function resolveSqlitePath(): string {
  const fromEnv = process.env.SQLITE_PATH?.trim() || process.env.DB_SQLITE_PATH?.trim()
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(serviceRoot, fromEnv)
  }
  return path.resolve(serviceRoot, 'database', 'sqlite.db')
}

const sqlitePath = resolveSqlitePath()
console.log('📦 Inicializando SQLite (libsql)...')
console.log(`   Path: ${sqlitePath}`)

if (!fs.existsSync(sqlitePath)) {
  console.warn(
    `⚠️  Arquivo SQLite não encontrado em ${sqlitePath}. ` +
      'Confirme services/webinar/database/sqlite.db ou defina SQLITE_PATH no .env.',
  )
}

const client = createClient({ url: pathToFileURL(sqlitePath).href })

export const db = drizzle(client, { schema })

console.log('✅ SQLite conectado via libsql')

export function getDatabase() {
  return db
}

export function getLibsqlClient() {
  return client
}

/** Normalize insert returning last id. */
export function lastInsertId(result: unknown): number {
  if (result == null) return 0
  if (typeof result === 'object') {
    const r = result as Record<string, unknown>
    if (typeof r.lastInsertRowid === 'bigint') return Number(r.lastInsertRowid)
    if (typeof r.lastInsertRowid === 'number') return r.lastInsertRowid
    if (typeof r.insertId === 'number') return r.insertId
    if (Array.isArray(result) && result[0]) {
      return lastInsertId(result[0])
    }
  }
  return Number(result) || 0
}

/** Date | string → ISO text for SQLite columns. */
export function toSqliteDate(value: Date | string | null | undefined): string | null {
  if (value == null) return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return value.toISOString()
  }
  return String(value)
}

/** SQLite text/date → ISO string safe for API. */
export function fromSqliteDate(value: Date | string | null | undefined): string | null {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toISOString()
}
