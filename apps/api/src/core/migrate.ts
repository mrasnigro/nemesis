import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2'
import { config } from './config.js'

const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../migrations')

/**
 * Files were renumbered and renamed by module. Databases that applied them under the old name
 * keep their history: the recorded name is rewritten before anything else runs.
 */
export const RENAMED_MIGRATIONS: Record<string, string> = {
  '001_identity.sql': '001_platform_identity.sql',
  '005_tenancy_access.sql': '002_platform_tenancy.sql',
  '002_training.sql': '003_training_init.sql',
  '003_bdr.sql': '004_bdr_core.sql',
  '004_bdr_dialer.sql': '005_bdr_dialer.sql',
  '007_drop_unused_columns.sql': '007_bdr_drop_unused.sql',
}

/** Applies every migrations/*.sql not yet recorded in schema_migrations, in filename order. */
export async function runMigrations(log: (message: string) => void = console.log): Promise<string[]> {
  const connection = await mysql.createConnection({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    multipleStatements: true,
    timezone: 'Z',
  })

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // No new name equals an old one, so each rename is independent.
    for (const [from, to] of Object.entries(RENAMED_MIGRATIONS)) {
      await connection.query('UPDATE schema_migrations SET id = ? WHERE id = ?', [to, from])
    }
    const applied = new Set(
      (await connection.query<RowDataPacket[]>('SELECT id FROM schema_migrations'))[0].map((row) => String(row.id)),
    )
    const files = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort()
    const newlyApplied: string[] = []

    for (const file of files) {
      if (applied.has(file)) continue
      const sql = await readFile(path.join(migrationsDir, file), 'utf8')
      try {
        await connection.beginTransaction()
        await connection.query(sql)
        await connection.query('INSERT INTO schema_migrations (id) VALUES (?)', [file])
        await connection.commit()
        newlyApplied.push(file)
        log(`applied ${file}`)
      } catch (error) {
        await connection.rollback()
        throw new Error(`Migration ${file} failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    return newlyApplied
  } finally {
    await connection.end()
  }
}

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isEntrypoint) {
  runMigrations().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
