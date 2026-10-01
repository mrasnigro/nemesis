import type { ModuleId, PlatformRole, UserProfile, UserStatus, CustomerStatus } from '@imp/shared'
import type { RowDataPacket } from 'mysql2'
import { pool } from '../../core/db.js'
import type { AuthUser } from '../../types/express.js'

type SessionUserRow = RowDataPacket & {
  id: string
  username: string
  name: string
  email: string | null
  role: PlatformRole
  profile: UserProfile | null
  status: UserStatus
  customer_id: string | null
  customer_name: string | null
  customer_status: CustomerStatus | null
  password_hash: string
  session_version: number
}

export type SessionUser = AuthUser & {
  status: UserStatus
  customerStatus: CustomerStatus | null
  passwordHash: string
  sessionVersion: number
}

const SESSION_USER_SELECT = `
  SELECT u.id, u.username, u.name, u.email, u.role, u.profile, u.status, u.customer_id,
         u.password_hash, u.session_version,
         c.name AS customer_name, c.status AS customer_status
  FROM users u
  LEFT JOIN customers c ON c.id = u.customer_id AND c.deleted_at IS NULL
  WHERE u.deleted_at IS NULL`

export async function findSessionUserByUsername(username: string): Promise<SessionUser | null> {
  const [rows] = await pool.query<SessionUserRow[]>(`${SESSION_USER_SELECT} AND u.username = :username LIMIT 1`, {
    username,
  })
  return rows[0] ? toSessionUser(rows[0]) : null
}

export async function findSessionUserById(id: string): Promise<SessionUser | null> {
  const [rows] = await pool.query<SessionUserRow[]>(`${SESSION_USER_SELECT} AND u.id = :id LIMIT 1`, { id })
  return rows[0] ? toSessionUser(rows[0]) : null
}

export async function markLoggedIn(userId: string): Promise<void> {
  await pool.query(
    `UPDATE users
     SET last_login_at = :now, status = IF(status = 'invited', 'active', status)
     WHERE id = :userId`,
    { userId, now: new Date() },
  )
}

async function listEffectiveModules(userId: string): Promise<ModuleId[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT um.module_id
     FROM user_modules um
     JOIN users u ON u.id = um.user_id
     JOIN customer_modules cm ON cm.customer_id = u.customer_id AND cm.module_id = um.module_id
     WHERE um.user_id = :userId
     ORDER BY um.module_id`,
    { userId },
  )
  return rows.map((row) => String(row.module_id) as ModuleId)
}

async function toSessionUser(row: SessionUserRow): Promise<SessionUser> {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    email: row.email,
    role: row.role,
    profile: row.profile,
    customerId: row.customer_id,
    customerName: row.customer_name,
    modules: row.role === 'admin' ? [] : await listEffectiveModules(row.id),
    status: row.status,
    customerStatus: row.customer_status,
    passwordHash: row.password_hash,
    sessionVersion: Number(row.session_version),
  }
}
