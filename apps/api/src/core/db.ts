import mysql, { type PoolConnection } from 'mysql2/promise'
import { config } from './config.js'
import { mysqlSslOptions } from './mysqlSsl.js'

export const pool = mysql.createPool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  ssl: mysqlSslOptions(),
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  timezone: 'Z',
  charset: 'utf8mb4',
})

export async function pingDatabase(): Promise<boolean> {
  const connection = await pool.getConnection()
  try {
    await connection.query('SELECT 1')
    return true
  } finally {
    connection.release()
  }
}

export async function withTransaction<T>(work: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const result = await work(conn)
    await conn.commit()
    return result
  } catch (error) {
    await conn.rollback()
    throw error
  } finally {
    conn.release()
  }
}

export function isDuplicateKeyError(error: unknown): error is { code: 'ER_DUP_ENTRY'; message: string } {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'ER_DUP_ENTRY'
}
