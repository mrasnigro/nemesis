import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
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
  for (const file of new Set(candidates)) {
    if (fs.existsSync(file)) {
      dotenv.config({ path: file, override: false })
      console.log(`📄 Env carregado: ${file}`)
    }
  }
}

loadBackendEnv()

export const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'imp',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'imp_webinar',
}

console.log(`📦 MySQL ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`)

export const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
  enableKeepAlive: true,
  connectTimeout: 10_000,
  timezone: 'Z',
  charset: 'utf8mb4',
})

pool
  .query('SELECT 1')
  .then(() => console.log('✅ MySQL conectado'))
  .catch((err: Error) => console.warn(`⚠️  MySQL indisponível: ${err.message}`))

export const db = drizzle(pool, { schema, mode: 'default' })

export function getDatabase() {
  return db
}

/** Raw SQL for legacy route bodies; returns mysql2's [rows | ResultSetHeader, fields] tuple. */
export function rawQuery(sql: string, args: unknown[] = []) {
  return pool.query(sql, args)
}

/** mysql2-connection-shaped handle over the shared pool (`end()` is a no-op). */
export async function getConnection() {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute: (sql: string, args: unknown[] = []): Promise<[any, unknown]> => pool.query(sql, args),
    async end() {},
  }
}

/** Normalize the id of a freshly inserted row (drizzle $returningId or mysql2 ResultSetHeader). */
export function lastInsertId(result: unknown): number {
  if (result == null) return 0
  if (Array.isArray(result)) return result.length ? lastInsertId(result[0]) : 0
  if (typeof result === 'object') {
    const r = result as Record<string, unknown>
    if (typeof r.insertId === 'number') return r.insertId
    if (r.id != null) return Number(r.id) || 0
  }
  return Number(result) || 0
}

/** Rows touched by a drizzle mysql2 update/delete (`[ResultSetHeader, fields]`). */
export function affectedRows(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result
  return Number((header as { affectedRows?: number } | undefined)?.affectedRows ?? 0)
}

/** Date | ISO string → Date for DATETIME/TIMESTAMP columns (null when empty or invalid). */
export function toDbDate(value: Date | string | null | undefined): Date | null {
  if (value == null || value === '') return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

/** DATETIME/TIMESTAMP value → ISO string for API responses. */
export function fromDbDate(value: Date | string | null | undefined): string | null {
  if (value == null) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toISOString()
}
