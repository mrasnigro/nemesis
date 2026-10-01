import type { ModuleId, PlatformRole, UserProfile, UserStatus } from '@imp/shared'
import type { PoolConnection, RowDataPacket } from 'mysql2/promise'
import { pool } from '../../core/db.js'
import type { UserListQuery } from './users.schemas.js'

type UserRow = RowDataPacket & {
  id: string
  customer_id: string | null
  customer_name: string | null
  username: string
  name: string
  email: string | null
  role: PlatformRole
  profile: UserProfile | null
  status: UserStatus
  modules: string | null
  last_login_at: Date | null
  created_at: Date
}

export type ManagedUser = ReturnType<typeof toUser>

const USER_SELECT = `
  SELECT u.id, u.customer_id, c.name AS customer_name, u.username, u.name, u.email, u.role, u.profile,
         u.status, u.last_login_at, u.created_at,
         (SELECT GROUP_CONCAT(um.module_id ORDER BY um.module_id) FROM user_modules um WHERE um.user_id = u.id) AS modules
  FROM users u
  LEFT JOIN customers c ON c.id = u.customer_id`

function toUser(row: UserRow) {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    username: row.username,
    name: row.name,
    email: row.email,
    role: row.role,
    profile: row.profile,
    status: row.status,
    assignedModules: row.modules ? (row.modules.split(',') as ModuleId[]) : [],
    lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  }
}

export async function listUsers(scopeCustomerId: string | null, query: UserListQuery) {
  const where = ['u.deleted_at IS NULL']
  const params: Record<string, string | number> = {
    limit: query.pageSize,
    offset: (query.page - 1) * query.pageSize,
  }
  if (scopeCustomerId) {
    where.push('u.customer_id = :scopeCustomerId')
    params.scopeCustomerId = scopeCustomerId
  }
  if (query.customerId) {
    where.push('u.customer_id = :customerId')
    params.customerId = query.customerId
  }
  if (query.status) {
    where.push('u.status = :status')
    params.status = query.status
  }
  if (query.role) {
    where.push('u.role = :role')
    params.role = query.role
  }
  if (query.q) {
    where.push('(u.name LIKE :q OR u.username LIKE :q OR u.email LIKE :q)')
    params.q = `%${query.q}%`
  }
  const clause = where.join(' AND ')
  const [rows] = await pool.query<UserRow[]>(
    `${USER_SELECT} WHERE ${clause} ORDER BY u.created_at DESC, u.id DESC LIMIT :limit OFFSET :offset`,
    params,
  )
  const [countRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM users u WHERE ${clause}`, params)
  return { rows: rows.map(toUser), total: Number(countRows[0]?.total ?? 0) }
}

export async function getUser(id: string): Promise<ManagedUser | null> {
  const [rows] = await pool.query<UserRow[]>(`${USER_SELECT} WHERE u.id = :id AND u.deleted_at IS NULL`, { id })
  return rows[0] ? toUser(rows[0]) : null
}

export async function insertUser(
  conn: PoolConnection,
  input: {
    id: string
    customerId: string | null
    username: string
    name: string
    email: string | null
    role: PlatformRole
    profile: UserProfile | null
    status: UserStatus
    passwordHash: string
  },
): Promise<void> {
  const now = new Date()
  await conn.query(
    `INSERT INTO users
      (id, customer_id, username, name, email, role, profile, status, password_hash, created_at, updated_at)
     VALUES
      (:id, :customerId, :username, :name, :email, :role, :profile, :status, :passwordHash, :now, :now)`,
    { ...input, now },
  )
}

export async function updateUser(
  id: string,
  patch: Partial<{ name: string; email: string | null; profile: UserProfile; status: UserStatus; passwordHash: string }>,
  revokeSessions: boolean,
): Promise<void> {
  const columnFor: Record<string, string> = {
    name: 'name',
    email: 'email',
    profile: 'profile',
    status: 'status',
    passwordHash: 'password_hash',
  }
  const assignments = Object.keys(patch).map((key) => `${columnFor[key]} = :${key}`)
  if (revokeSessions) assignments.push('session_version = session_version + 1')
  await pool.query(`UPDATE users SET ${assignments.join(', ')}, updated_at = :now WHERE id = :id`, {
    ...patch,
    id,
    now: new Date(),
  })
}

export async function replaceUserModules(conn: PoolConnection, userId: string, moduleIds: ModuleId[]): Promise<void> {
  await conn.query('DELETE FROM user_modules WHERE user_id = :userId', { userId })
  if (moduleIds.length > 0) {
    await conn.query('INSERT INTO user_modules (user_id, module_id) VALUES ?', [
      moduleIds.map((moduleId) => [userId, moduleId]),
    ])
  }
}
