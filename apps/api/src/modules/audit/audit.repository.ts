import type { RowDataPacket } from 'mysql2'
import { ulid } from 'ulid'
import { pool } from '../../core/db.js'

export type AuditLevel = 'info' | 'warning' | 'error'

export type AuditEntry = {
  actor: { id: string; name: string } | null
  customerId: string | null
  action: string
  entityType: string
  entityId?: string | null
  summary: string
  level?: AuditLevel
  data?: Record<string, unknown>
  ip?: string
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  await pool.query(
    `INSERT INTO audit_logs
      (id, customer_id, actor_user_id, actor_name, action, entity_type, entity_id, summary, level, data_json, ip, created_at)
     VALUES
      (:id, :customerId, :actorId, :actorName, :action, :entityType, :entityId, :summary, :level, :data, :ip, :now)`,
    {
      id: ulid(),
      customerId: entry.customerId,
      actorId: entry.actor?.id ?? null,
      actorName: entry.actor?.name ?? 'Sistema',
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      summary: entry.summary.slice(0, 300),
      level: entry.level ?? 'info',
      data: entry.data ? JSON.stringify(entry.data) : null,
      ip: entry.ip ?? null,
      now: new Date(),
    },
  )
}

type AuditRow = RowDataPacket & {
  id: string
  customer_id: string | null
  customer_name: string | null
  actor_name: string
  action: string
  entity_type: string
  entity_id: string | null
  summary: string
  level: AuditLevel
  created_at: Date
}

export async function listAudit(filter: {
  customerId: string | null
  q?: string
  page: number
  pageSize: number
}) {
  const where = ['1 = 1']
  const params: Record<string, string | number> = {
    limit: filter.pageSize,
    offset: (filter.page - 1) * filter.pageSize,
  }
  if (filter.customerId) {
    where.push('a.customer_id = :customerId')
    params.customerId = filter.customerId
  }
  if (filter.q) {
    where.push('(a.summary LIKE :q OR a.action LIKE :q OR a.actor_name LIKE :q)')
    params.q = `%${filter.q}%`
  }
  const clause = where.join(' AND ')
  const [rows] = await pool.query<AuditRow[]>(
    `SELECT a.id, a.customer_id, c.name AS customer_name, a.actor_name, a.action, a.entity_type, a.entity_id,
            a.summary, a.level, a.created_at
     FROM audit_logs a
     LEFT JOIN customers c ON c.id = a.customer_id
     WHERE ${clause}
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT :limit OFFSET :offset`,
    params,
  )
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM audit_logs a WHERE ${clause}`,
    params,
  )
  return {
    rows: rows.map((row) => ({
      id: row.id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      actor: row.actor_name,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      summary: row.summary,
      level: row.level,
      createdAt: row.created_at.toISOString(),
    })),
    total: Number(countRows[0]?.total ?? 0),
  }
}
