import type { CustomerPlan, CustomerStatus, ModuleId } from '@imp/shared'
import type { PoolConnection, RowDataPacket } from 'mysql2/promise'
import { pool } from '../../core/db.js'
import type { CustomerListQuery } from './customers.schemas.js'

type CustomerRow = RowDataPacket & {
  id: string
  name: string
  slug: string
  plan: CustomerPlan
  status: CustomerStatus
  modules: string | null
  users_count: number
  active_users: number
  created_at: Date
  updated_at: Date
}

export type Customer = ReturnType<typeof toCustomer>

const CUSTOMER_SELECT = `
  SELECT c.id, c.name, c.slug, c.plan, c.status, c.created_at, c.updated_at,
         (SELECT GROUP_CONCAT(cm.module_id ORDER BY cm.module_id) FROM customer_modules cm WHERE cm.customer_id = c.id) AS modules,
         (SELECT COUNT(*) FROM users u WHERE u.customer_id = c.id AND u.deleted_at IS NULL) AS users_count,
         (SELECT COUNT(*) FROM users u WHERE u.customer_id = c.id AND u.deleted_at IS NULL AND u.status = 'active') AS active_users
  FROM customers c`

function toCustomer(row: CustomerRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    status: row.status,
    modulesEnabled: row.modules ? (row.modules.split(',') as ModuleId[]) : [],
    usersCount: Number(row.users_count),
    activeUsers: Number(row.active_users),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

export async function listCustomers(scopeCustomerId: string | null, query: CustomerListQuery) {
  const where = ['c.deleted_at IS NULL']
  const params: Record<string, string | number> = {
    limit: query.pageSize,
    offset: (query.page - 1) * query.pageSize,
  }
  if (scopeCustomerId) {
    where.push('c.id = :scopeCustomerId')
    params.scopeCustomerId = scopeCustomerId
  }
  if (query.status) {
    where.push('c.status = :status')
    params.status = query.status
  }
  if (query.q) {
    where.push('(c.name LIKE :q OR c.slug LIKE :q)')
    params.q = `%${query.q}%`
  }
  const clause = where.join(' AND ')
  const [rows] = await pool.query<CustomerRow[]>(
    `${CUSTOMER_SELECT} WHERE ${clause} ORDER BY c.created_at DESC, c.id DESC LIMIT :limit OFFSET :offset`,
    params,
  )
  const [countRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM customers c WHERE ${clause}`, params)
  return { rows: rows.map(toCustomer), total: Number(countRows[0]?.total ?? 0) }
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const [rows] = await pool.query<CustomerRow[]>(`${CUSTOMER_SELECT} WHERE c.id = :id AND c.deleted_at IS NULL`, { id })
  return rows[0] ? toCustomer(rows[0]) : null
}

export async function slugExists(slug: string): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT 1 FROM customers WHERE slug = :slug LIMIT 1', { slug })
  return rows.length > 0
}

export async function insertCustomer(
  conn: PoolConnection,
  input: { id: string; name: string; slug: string; plan: CustomerPlan; status: CustomerStatus },
): Promise<void> {
  const now = new Date()
  await conn.query(
    `INSERT INTO customers (id, name, slug, plan, status, created_at, updated_at)
     VALUES (:id, :name, :slug, :plan, :status, :now, :now)`,
    { ...input, now },
  )
}

export async function updateCustomer(
  id: string,
  patch: Partial<{ name: string; plan: CustomerPlan; status: CustomerStatus }>,
): Promise<void> {
  const columns = Object.keys(patch) as (keyof typeof patch)[]
  const assignments = columns.map((column) => `${column} = :${column}`)
  await pool.query(`UPDATE customers SET ${assignments.join(', ')}, updated_at = :now WHERE id = :id`, {
    ...patch,
    id,
    now: new Date(),
  })
}

/** Replaces the contract and drops user grants that fall outside it. */
export async function replaceCustomerModules(conn: PoolConnection, customerId: string, moduleIds: ModuleId[]) {
  await conn.query('DELETE FROM customer_modules WHERE customer_id = :customerId', { customerId })
  if (moduleIds.length > 0) {
    await conn.query('INSERT INTO customer_modules (customer_id, module_id) VALUES ?', [
      moduleIds.map((moduleId) => [customerId, moduleId]),
    ])
    await conn.query(
      `DELETE um FROM user_modules um
       JOIN users u ON u.id = um.user_id
       WHERE u.customer_id = :customerId AND um.module_id NOT IN (:moduleIds)`,
      { customerId, moduleIds },
    )
  } else {
    await conn.query(
      `DELETE um FROM user_modules um JOIN users u ON u.id = um.user_id WHERE u.customer_id = :customerId`,
      { customerId },
    )
  }
}
