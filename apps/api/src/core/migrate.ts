import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2'
import { config } from './config.js'

const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../migrations')

async function main() {
  const connection = await mysql.createConnection({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    multipleStatements: true,
    timezone: 'Z',
  })

  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  const appliedRows = await connection.query<RowDataPacket[]>('SELECT id FROM schema_migrations')
  const applied = new Set(appliedRows[0].map((row) => String(row.id)))
  const files = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort()

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = await readFile(path.join(migrationsDir, file), 'utf8')
    try {
      await connection.beginTransaction()
      await connection.query(sql)
      await connection.query('INSERT INTO schema_migrations (id) VALUES (?)', [file])
      await connection.commit()
      console.log(`applied ${file}`)
    } catch (error) {
      await connection.rollback()
      throw error
    }
  }

  await connection.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
