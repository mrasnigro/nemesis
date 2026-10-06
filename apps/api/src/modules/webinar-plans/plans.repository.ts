import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import type { Pool, PoolConnection } from 'mysql2/promise'
import { ulid } from 'ulid'
import { pool } from '../../core/db.js'
import type { PageQuery } from '../../core/list.js'

type Row = RowDataPacket & Record<string, unknown>
type Db = Pick<Pool | PoolConnection, 'query'>
type Params = Record<string, string | number | Date | null>

function iso(value: unknown): string | null {
  if (value == null) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const nullableNumber = (value: unknown) => (value == null ? null : Number(value))

// ------------------------------------------------------------------- plans

export type PlanDto = ReturnType<typeof planFromRow>

function features(value: unknown): string[] {
  const parsed = typeof value === 'string' ? safeJson(value) : value
  return Array.isArray(parsed) ? parsed.map(String) : []
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return []
  }
}

function planFromRow(row: Row) {
  return {
    id: String(row.id),
    name: String(row.name),
    description: row.description == null ? null : String(row.description),
    priceCents: Number(row.price_cents),
    /** null on any limit means "no limit". */
    maxDurationMinutes: nullableNumber(row.max_duration_minutes),
    maxParticipants: nullableNumber(row.max_participants),
    replayStorageDays: nullableNumber(row.replay_storage_days),
    features: features(row.features_json),
    isStarter: Boolean(row.is_starter),
    trialDays: nullableNumber(row.trial_days),
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order),
    subscribers: row.subscribers == null ? undefined : Number(row.subscribers),
  }
}

const PLAN_ORDER = 'p.sort_order, p.price_cents, p.name'

export async function listPlans(options: { activeOnly?: boolean } = {}, db: Db = pool): Promise<PlanDto[]> {
  const [rows] = await db.query<Row[]>(
    `SELECT p.*, (SELECT COUNT(*) FROM webinar_subscriptions s WHERE s.plan_id = p.id) AS subscribers
     FROM webinar_plans p
     WHERE p.deleted_at IS NULL ${options.activeOnly ? 'AND p.is_active = 1' : ''}
     ORDER BY ${PLAN_ORDER}`,
  )
  return rows.map(planFromRow)
}

export async function getPlan(id: string, db: Db = pool): Promise<PlanDto | null> {
  const [rows] = await db.query<Row[]>(
    `SELECT p.*, (SELECT COUNT(*) FROM webinar_subscriptions s WHERE s.plan_id = p.id) AS subscribers
     FROM webinar_plans p WHERE p.id = :id AND p.deleted_at IS NULL LIMIT 1`,
    { id },
  )
  return rows[0] ? planFromRow(rows[0]) : null
}

export async function getStarterPlan(db: Db = pool): Promise<PlanDto | null> {
  const [rows] = await db.query<Row[]>(
    `SELECT p.* FROM webinar_plans p WHERE p.is_starter = 1 AND p.deleted_at IS NULL LIMIT 1`,
  )
  return rows[0] ? planFromRow(rows[0]) : null
}

export async function planNameTaken(name: string, exceptId: string | null, db: Db = pool): Promise<boolean> {
  const [rows] = await db.query<Row[]>(
    `SELECT id FROM webinar_plans WHERE deleted_at IS NULL AND LOWER(name) = LOWER(:name) AND id <> :exceptId LIMIT 1`,
    { name, exceptId: exceptId ?? '' },
  )
  return rows.length > 0
}

export type PlanInput = {
  name: string
  description: string | null
  priceCents: number
  maxDurationMinutes: number | null
  maxParticipants: number | null
  replayStorageDays: number | null
  features: string[]
  isStarter: boolean
  trialDays: number | null
  isActive: boolean
  sortOrder: number
}

const planColumns: Record<keyof PlanInput, string> = {
  name: 'name',
  description: 'description',
  priceCents: 'price_cents',
  maxDurationMinutes: 'max_duration_minutes',
  maxParticipants: 'max_participants',
  replayStorageDays: 'replay_storage_days',
  features: 'features_json',
  isStarter: 'is_starter',
  trialDays: 'trial_days',
  isActive: 'is_active',
  sortOrder: 'sort_order',
}

function planParam(key: keyof PlanInput, value: PlanInput[keyof PlanInput]): string | number | null {
  if (key === 'features') return JSON.stringify(value)
  if (typeof value === 'boolean') return value ? 1 : 0
  return value as string | number | null
}

export async function insertPlan(input: PlanInput, db: Db = pool): Promise<string> {
  const id = ulid()
  const now = new Date()
  const params: Params = { id, now }
  for (const key of Object.keys(planColumns) as (keyof PlanInput)[]) params[key] = planParam(key, input[key])
  await db.query(
    `INSERT INTO webinar_plans
      (id, name, description, price_cents, max_duration_minutes, max_participants, replay_storage_days,
       features_json, is_starter, trial_days, is_active, sort_order, created_at, updated_at)
     VALUES
      (:id, :name, :description, :priceCents, :maxDurationMinutes, :maxParticipants, :replayStorageDays,
       :features, :isStarter, :trialDays, :isActive, :sortOrder, :now, :now)`,
    params,
  )
  return id
}

export async function updatePlan(id: string, patch: Partial<PlanInput>, db: Db = pool): Promise<void> {
  const sets: string[] = []
  const params: Params = { id, now: new Date() }
  for (const key of Object.keys(planColumns) as (keyof PlanInput)[]) {
    if (patch[key] === undefined) continue
    sets.push(`${planColumns[key]} = :${key}`)
    params[key] = planParam(key, patch[key] as PlanInput[keyof PlanInput])
  }
  if (sets.length === 0) return
  await db.query(`UPDATE webinar_plans SET ${sets.join(', ')}, updated_at = :now WHERE id = :id AND deleted_at IS NULL`, params)
}

export async function clearStarterExcept(id: string, db: Db = pool): Promise<void> {
  await db.query(`UPDATE webinar_plans SET is_starter = 0 WHERE is_starter = 1 AND id <> :id`, { id })
}

export async function softDeletePlan(id: string, db: Db = pool): Promise<void> {
  const now = new Date()
  await db.query(`UPDATE webinar_plans SET deleted_at = :now, updated_at = :now, is_active = 0 WHERE id = :id`, { id, now })
}

// ----------------------------------------------------------- subscriptions

export type SubscriptionRow = {
  id: string
  customerId: string
  planId: string
  status: 'active' | 'suspended' | 'cancelled'
  startedAt: string
  expiresAt: string | null
}

function subscriptionFromRow(row: Row): SubscriptionRow {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    planId: String(row.plan_id),
    status: String(row.status) as SubscriptionRow['status'],
    startedAt: iso(row.started_at)!,
    expiresAt: iso(row.expires_at),
  }
}

export async function getSubscription(customerId: string, db: Db = pool): Promise<SubscriptionRow | null> {
  const [rows] = await db.query<Row[]>(`SELECT * FROM webinar_subscriptions WHERE customer_id = :customerId LIMIT 1`, {
    customerId,
  })
  return rows[0] ? subscriptionFromRow(rows[0]) : null
}

/** Creates the subscription unless the customer already has one (two requests may race to do this). */
export async function insertSubscriptionIfMissing(
  input: { customerId: string; planId: string; status: string; startedAt: Date; expiresAt: Date | null },
  db: Db = pool,
): Promise<void> {
  const now = new Date()
  await db.query(
    `INSERT IGNORE INTO webinar_subscriptions
      (id, customer_id, plan_id, status, started_at, expires_at, created_at, updated_at)
     VALUES (:id, :customerId, :planId, :status, :startedAt, :expiresAt, :now, :now)`,
    { id: ulid(), ...input, now },
  )
}

export async function updateSubscription(
  customerId: string,
  patch: { planId?: string; status?: string; expiresAt?: Date | null },
  db: Db = pool,
): Promise<void> {
  const sets: string[] = []
  const params: Params = { customerId, now: new Date() }
  if (patch.planId !== undefined) {
    sets.push('plan_id = :planId')
    params.planId = patch.planId
  }
  if (patch.status !== undefined) {
    sets.push('status = :status')
    params.status = patch.status
  }
  if (patch.expiresAt !== undefined) {
    sets.push('expires_at = :expiresAt')
    params.expiresAt = patch.expiresAt
  }
  if (sets.length === 0) return
  await db.query(`UPDATE webinar_subscriptions SET ${sets.join(', ')}, updated_at = :now WHERE customer_id = :customerId`, params)
}

/** Customers that contract the Webinar module, with where their subscription stands. */
export async function listCustomerSubscriptions(query: PageQuery & { planId?: string }) {
  const filters = [`c.deleted_at IS NULL`, `EXISTS (SELECT 1 FROM customer_modules m WHERE m.customer_id = c.id AND m.module_id = 'webinar')`]
  const params: Params = {}
  if (query.q) {
    filters.push('c.name LIKE :term')
    params.term = `%${query.q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
  }
  if (query.planId) {
    filters.push('s.plan_id = :planId')
    params.planId = query.planId
  }
  const from = `FROM customers c
    LEFT JOIN webinar_subscriptions s ON s.customer_id = c.id
    LEFT JOIN webinar_plans p ON p.id = s.plan_id`
  const where = filters.join(' AND ')
  const [count] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total ${from} WHERE ${where}`, params)
  const [rows] = await pool.query<Row[]>(
    `SELECT c.id AS customer_id, c.name AS customer_name, c.status AS customer_status,
            s.status AS subscription_status, s.expires_at, p.id AS plan_id, p.name AS plan_name, p.price_cents,
            (SELECT MAX(paid_at) FROM webinar_payments w WHERE w.customer_id = c.id AND w.voided_at IS NULL) AS last_paid_at
     ${from} WHERE ${where}
     ORDER BY c.name, c.id
     LIMIT :limit OFFSET :offset`,
    { ...params, limit: query.pageSize, offset: (query.page - 1) * query.pageSize },
  )
  return {
    total: Number(count[0]?.total ?? 0),
    rows: rows.map((row) => ({
      customerId: String(row.customer_id),
      customerName: String(row.customer_name),
      customerStatus: String(row.customer_status),
      planId: row.plan_id == null ? null : String(row.plan_id),
      planName: row.plan_name == null ? null : String(row.plan_name),
      priceCents: nullableNumber(row.price_cents),
      subscriptionStatus: row.subscription_status == null ? null : (String(row.subscription_status) as SubscriptionRow['status']),
      expiresAt: iso(row.expires_at),
      lastPaidAt: iso(row.last_paid_at),
    })),
  }
}

export async function getCustomerName(customerId: string): Promise<string | null> {
  const [rows] = await pool.query<Row[]>(`SELECT name FROM customers WHERE id = :customerId AND deleted_at IS NULL LIMIT 1`, {
    customerId,
  })
  return rows[0] ? String(rows[0].name) : null
}

// ---------------------------------------------------------------- payments

export type PaymentDto = ReturnType<typeof paymentFromRow>

function paymentFromRow(row: Row) {
  return {
    id: String(row.id),
    planId: String(row.plan_id),
    planName: row.plan_name == null ? null : String(row.plan_name),
    amountCents: Number(row.amount_cents),
    method: row.method == null ? null : String(row.method),
    note: row.note == null ? null : String(row.note),
    paidAt: iso(row.paid_at),
    periodStart: iso(row.period_start),
    periodEnd: iso(row.period_end),
    voidedAt: iso(row.voided_at),
  }
}

export async function listPayments(customerId: string, limit = 100): Promise<PaymentDto[]> {
  const [rows] = await pool.query<Row[]>(
    `SELECT w.*, p.name AS plan_name FROM webinar_payments w
     JOIN webinar_plans p ON p.id = w.plan_id
     WHERE w.customer_id = :customerId
     ORDER BY w.paid_at DESC, w.id DESC LIMIT :limit`,
    { customerId, limit },
  )
  return rows.map(paymentFromRow)
}

export async function insertPayment(
  input: {
    customerId: string
    planId: string
    amountCents: number
    method: string | null
    note: string | null
    paidAt: Date
    periodStart: Date
    periodEnd: Date
    recordedBy: string
  },
  db: Db = pool,
): Promise<string> {
  const id = ulid()
  await db.query(
    `INSERT INTO webinar_payments
      (id, customer_id, plan_id, amount_cents, method, note, paid_at, period_start, period_end, recorded_by_user_id, created_at)
     VALUES (:id, :customerId, :planId, :amountCents, :method, :note, :paidAt, :periodStart, :periodEnd, :recordedBy, :now)`,
    { id, ...input, now: new Date() },
  )
  return id
}

export async function voidPayment(customerId: string, paymentId: string): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE webinar_payments SET voided_at = :now WHERE id = :paymentId AND customer_id = :customerId AND voided_at IS NULL`,
    { paymentId, customerId, now: new Date() },
  )
  return result.affectedRows > 0
}
