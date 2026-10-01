import mysql from 'mysql2/promise'
import { config } from './config.js'

export const pool = mysql.createPool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
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
