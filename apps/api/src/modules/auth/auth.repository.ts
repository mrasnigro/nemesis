import type { RowDataPacket } from 'mysql2'
import { pool } from '../../core/db.js'
import type { AuthUser } from '../../types/express.js'

type UserRow = RowDataPacket & {
  id: string
  username: string
  name: string
  role: 'admin' | 'imp'
  customer_id: string | null
  password_hash: string
}

export async function findUserByUsername(username: string): Promise<(AuthUser & { passwordHash: string }) | null> {
  const [rows] = await pool.query<UserRow[]>(
    `SELECT id, username, name, role, customer_id, password_hash
     FROM users
     WHERE username = :username
     LIMIT 1`,
    { username },
  )
  const row = rows[0]
  if (!row) return null
  const modules = await listModules(row.id)
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    customerId: row.customer_id,
    modules,
    passwordHash: row.password_hash,
  }
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  const [rows] = await pool.query<UserRow[]>(
    `SELECT id, username, name, role, customer_id, password_hash
     FROM users
     WHERE id = :id
     LIMIT 1`,
    { id },
  )
  const row = rows[0]
  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    customerId: row.customer_id,
    modules: await listModules(row.id),
  }
}

async function listModules(userId: string): Promise<string[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT module_id FROM user_modules WHERE user_id = :userId ORDER BY module_id`,
    { userId },
  )
  return rows.map((row) => String(row.module_id))
}
