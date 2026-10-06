import type { Pool, PoolConnection } from 'mysql2/promise'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { ulid } from 'ulid'
import { pool } from '../../core/db.js'
import { resolveSort, type PageQuery } from '../../core/list.js'

type Row = RowDataPacket & Record<string, unknown>
type Db = Pick<Pool | PoolConnection, 'query'>
type Params = Record<string, string | number | Date | null>

export type ListResult<T> = { rows: T[]; total: number }

function iso(value: unknown): string | null {
  if (value == null) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function likeTerm(q: string | undefined): string | null {
  if (!q) return null
  return `%${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

// ------------------------------------------------------------------- mapping

export type WebinarDto = ReturnType<typeof webinarFromRow>

function webinarFromRow(row: Row) {
  return {
    id: String(row.id),
    ownerUserId: String(row.owner_user_id),
    title: String(row.title),
    description: row.description == null ? null : String(row.description),
    status: String(row.status),
    scheduledAt: iso(row.scheduled_at),
    durationMinutes: Number(row.duration_minutes),
    timezone: String(row.timezone),
    isRecurring: Boolean(row.is_recurring),
    recurrencePattern: row.recurrence_pattern == null ? null : String(row.recurrence_pattern),
    recurrenceEndAt: iso(row.recurrence_end_at),
    presenterName: row.presenter_name == null ? null : String(row.presenter_name),
    presenterBio: row.presenter_bio == null ? null : String(row.presenter_bio),
    presenterImageUrl: row.presenter_image_url == null ? null : String(row.presenter_image_url),
    registrationColor: String(row.registration_color),
    maxParticipants: row.max_participants == null ? null : Number(row.max_participants),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

/** What an anonymous visitor may see about a webinar. */
function publicWebinarFromRow(row: Row) {
  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description == null ? null : String(row.description),
    status: String(row.status),
    scheduledAt: iso(row.scheduled_at),
    durationMinutes: Number(row.duration_minutes),
    timezone: String(row.timezone),
    presenterName: row.presenter_name == null ? null : String(row.presenter_name),
    presenterBio: row.presenter_bio == null ? null : String(row.presenter_bio),
    presenterImageUrl: row.presenter_image_url == null ? null : String(row.presenter_image_url),
    registrationColor: String(row.registration_color),
  }
}

export type AccessCodeDto = ReturnType<typeof accessCodeFromRow>

function accessCodeFromRow(row: Row) {
  return {
    id: String(row.id),
    webinarId: String(row.webinar_id),
    code: String(row.code),
    scheduledAt: iso(row.scheduled_at),
    expiresAt: iso(row.expires_at),
    maxLeads: row.max_leads == null ? null : Number(row.max_leads),
    leadCount: Number(row.lead_count),
    active: Boolean(row.active),
    createdAt: iso(row.created_at),
  }
}

export type LeadDto = ReturnType<typeof leadFromRow>

function leadFromRow(row: Row) {
  return {
    id: String(row.id),
    webinarId: String(row.webinar_id),
    name: String(row.name),
    email: String(row.email),
    phone: row.phone == null ? null : String(row.phone),
    status: String(row.status),
    registeredAt: iso(row.registered_at),
    attendedAt: iso(row.attended_at),
    messageCount: row.message_count == null ? undefined : Number(row.message_count),
  }
}

export type ChatDto = ReturnType<typeof chatFromRow>

function chatFromRow(row: Row) {
  return {
    id: String(row.id),
    senderName: String(row.sender_name),
    role: String(row.sender_role) as 'presenter' | 'participant',
    message: String(row.message),
    createdAt: iso(row.created_at),
  }
}

// ------------------------------------------------------------------ webinars

const webinarSort = { scheduledAt: 'scheduled_at', createdAt: 'created_at', title: 'title' }

export async function listWebinars(
  customerId: string,
  query: PageQuery & { status?: string; mine?: boolean },
  userId: string,
): Promise<ListResult<WebinarDto>> {
  const filters = ['customer_id = :customerId', 'deleted_at IS NULL']
  const params: Params = { customerId }
  const term = likeTerm(query.q)
  if (term) {
    filters.push('(title LIKE :term OR presenter_name LIKE :term)')
    params.term = term
  }
  if (query.status) {
    filters.push('status = :status')
    params.status = query.status
  }
  if (query.mine) {
    filters.push('owner_user_id = :userId')
    params.userId = userId
  }
  if (query.from) {
    filters.push('scheduled_at >= :from')
    params.from = new Date(`${query.from}T00:00:00.000Z`)
  }
  if (query.to) {
    filters.push('scheduled_at < :to')
    params.to = new Date(new Date(`${query.to}T00:00:00.000Z`).getTime() + 24 * 3600 * 1000)
  }
  const where = filters.join(' AND ')
  const sort = resolveSort(query.sort, webinarSort, '-scheduledAt')
  const [count] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM webinar_webinars WHERE ${where}`, params)
  const [rows] = await pool.query<Row[]>(
    `SELECT * FROM webinar_webinars WHERE ${where}
     ORDER BY ${sort.column} ${sort.direction}, id DESC
     LIMIT :limit OFFSET :offset`,
    { ...params, limit: query.pageSize, offset: (query.page - 1) * query.pageSize },
  )
  return { rows: rows.map(webinarFromRow), total: Number(count[0]?.total ?? 0) }
}

export async function getWebinar(customerId: string, id: string, db: Db = pool): Promise<WebinarDto | null> {
  const [rows] = await db.query<Row[]>(
    `SELECT * FROM webinar_webinars WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL LIMIT 1`,
    { customerId, id },
  )
  return rows[0] ? webinarFromRow(rows[0]) : null
}

type WebinarInput = {
  title: string
  description: string | null
  scheduledAt: Date
  durationMinutes: number
  timezone: string
  isRecurring: boolean
  recurrencePattern: string | null
  recurrenceEndAt: Date | null
  presenterName: string | null
  presenterBio: string | null
  presenterImageUrl: string | null
  registrationColor: string
  maxParticipants: number | null
  status: string
}

export async function insertWebinar(customerId: string, ownerUserId: string, input: WebinarInput) {
  const id = ulid()
  const now = new Date()
  await pool.query(
    `INSERT INTO webinar_webinars
      (id, customer_id, owner_user_id, title, description, status, scheduled_at, duration_minutes, timezone,
       is_recurring, recurrence_pattern, recurrence_end_at, presenter_name, presenter_bio, presenter_image_url,
       registration_color, max_participants, created_at, updated_at)
     VALUES
      (:id, :customerId, :ownerUserId, :title, :description, :status, :scheduledAt, :durationMinutes, :timezone,
       :isRecurring, :recurrencePattern, :recurrenceEndAt, :presenterName, :presenterBio, :presenterImageUrl,
       :registrationColor, :maxParticipants, :now, :now)`,
    { ...input, isRecurring: input.isRecurring ? 1 : 0, id, customerId, ownerUserId, now },
  )
  return (await getWebinar(customerId, id))!
}

const patchColumns: Record<string, string> = {
  title: 'title',
  description: 'description',
  status: 'status',
  scheduledAt: 'scheduled_at',
  durationMinutes: 'duration_minutes',
  timezone: 'timezone',
  isRecurring: 'is_recurring',
  recurrencePattern: 'recurrence_pattern',
  recurrenceEndAt: 'recurrence_end_at',
  presenterName: 'presenter_name',
  presenterBio: 'presenter_bio',
  presenterImageUrl: 'presenter_image_url',
  registrationColor: 'registration_color',
  maxParticipants: 'max_participants',
}

export async function updateWebinar(customerId: string, id: string, patch: Record<string, unknown>) {
  const sets: string[] = []
  const params: Params = { customerId, id, now: new Date() }
  for (const [key, value] of Object.entries(patch)) {
    const column = patchColumns[key]
    if (!column || value === undefined) continue
    sets.push(`${column} = :${key}`)
    params[key] = typeof value === 'boolean' ? (value ? 1 : 0) : (value as string | number | Date | null)
  }
  if (sets.length === 0) return getWebinar(customerId, id)
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE webinar_webinars SET ${sets.join(', ')}, updated_at = :now
     WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL`,
    params,
  )
  if (result.affectedRows === 0) return null
  return getWebinar(customerId, id)
}

export async function softDeleteWebinar(customerId: string, id: string): Promise<boolean> {
  const now = new Date()
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE webinar_webinars SET deleted_at = :now, updated_at = :now
     WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL`,
    { customerId, id, now },
  )
  if (result.affectedRows === 0) return false
  // Codes stop working with the webinar; leads stay for the customer's records.
  await pool.query(`UPDATE webinar_access_codes SET active = 0, updated_at = :now WHERE customer_id = :customerId AND webinar_id = :id`, {
    customerId,
    id,
    now,
  })
  return true
}

export async function dashboardStats(customerId: string, userId: string, mine: boolean) {
  const params: Params = { customerId, userId, now: new Date() }
  const owner = mine ? 'AND owner_user_id = :userId' : ''
  const [webinars] = await pool.query<Row[]>(
    `SELECT
       COUNT(*) AS total,
       SUM(status = 'completed') AS completed,
       SUM(status = 'live') AS live,
       SUM(status IN ('draft', 'scheduled') AND scheduled_at >= :now) AS upcoming
     FROM webinar_webinars
     WHERE customer_id = :customerId AND deleted_at IS NULL ${owner}`,
    params,
  )
  const [leads] = await pool.query<Row[]>(
    `SELECT COUNT(*) AS total, SUM(l.status = 'attended') AS attended
     FROM webinar_leads l
     JOIN webinar_webinars w ON w.id = l.webinar_id
     WHERE l.customer_id = :customerId AND l.deleted_at IS NULL AND w.deleted_at IS NULL ${owner.replace('owner_user_id', 'w.owner_user_id')}`,
    params,
  )
  const total = Number(leads[0]?.total ?? 0)
  const attended = Number(leads[0]?.attended ?? 0)
  return {
    webinars: {
      total: Number(webinars[0]?.total ?? 0),
      completed: Number(webinars[0]?.completed ?? 0),
      live: Number(webinars[0]?.live ?? 0),
      upcoming: Number(webinars[0]?.upcoming ?? 0),
    },
    leads: { total, attended, attendanceRate: total > 0 ? Math.round((attended / total) * 1000) / 10 : 0 },
  }
}

// -------------------------------------------------------------- access codes

export async function listAccessCodes(customerId: string, webinarId: string) {
  const [rows] = await pool.query<Row[]>(
    `SELECT * FROM webinar_access_codes WHERE customer_id = :customerId AND webinar_id = :webinarId ORDER BY created_at DESC`,
    { customerId, webinarId },
  )
  return rows.map(accessCodeFromRow)
}

export async function insertAccessCode(
  customerId: string,
  webinarId: string,
  input: { code: string; scheduledAt: Date; expiresAt: Date; maxLeads: number | null },
) {
  const id = ulid()
  const now = new Date()
  await pool.query(
    `INSERT INTO webinar_access_codes
      (id, customer_id, webinar_id, code, scheduled_at, expires_at, max_leads, lead_count, active, created_at, updated_at)
     VALUES (:id, :customerId, :webinarId, :code, :scheduledAt, :expiresAt, :maxLeads, 0, 1, :now, :now)`,
    { ...input, id, customerId, webinarId, now },
  )
  const [rows] = await pool.query<Row[]>(`SELECT * FROM webinar_access_codes WHERE id = :id`, { id })
  return accessCodeFromRow(rows[0])
}

export async function deactivateAccessCode(customerId: string, webinarId: string, codeId: string): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE webinar_access_codes SET active = 0, updated_at = :now
     WHERE customer_id = :customerId AND webinar_id = :webinarId AND id = :codeId`,
    { customerId, webinarId, codeId, now: new Date() },
  )
  return result.affectedRows > 0
}

// --------------------------------------------------------------------- leads

const leadSort = { registeredAt: 'registered_at', name: 'name', status: 'status' }

export async function listLeads(
  customerId: string,
  webinarId: string,
  query: PageQuery & { status?: string },
): Promise<ListResult<LeadDto>> {
  const filters = ['l.customer_id = :customerId', 'l.webinar_id = :webinarId', 'l.deleted_at IS NULL']
  const params: Params = { customerId, webinarId }
  const term = likeTerm(query.q)
  if (term) {
    filters.push('(l.name LIKE :term OR l.email LIKE :term)')
    params.term = term
  }
  if (query.status) {
    filters.push('l.status = :status')
    params.status = query.status
  }
  const where = filters.join(' AND ')
  const sort = resolveSort(query.sort, leadSort, '-registeredAt')
  const [count] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM webinar_leads l WHERE ${where}`, params)
  const [rows] = await pool.query<Row[]>(
    `SELECT l.*,
            (SELECT COUNT(*) FROM webinar_chat_messages m WHERE m.lead_id = l.id) AS message_count
     FROM webinar_leads l
     WHERE ${where}
     ORDER BY l.${sort.column} ${sort.direction}, l.id DESC
     LIMIT :limit OFFSET :offset`,
    { ...params, limit: query.pageSize, offset: (query.page - 1) * query.pageSize },
  )
  return { rows: rows.map(leadFromRow), total: Number(count[0]?.total ?? 0) }
}

export async function listAllLeads(customerId: string, webinarId: string): Promise<LeadDto[]> {
  const [rows] = await pool.query<Row[]>(
    `SELECT * FROM webinar_leads
     WHERE customer_id = :customerId AND webinar_id = :webinarId AND deleted_at IS NULL
     ORDER BY registered_at DESC, id DESC LIMIT 10000`,
    { customerId, webinarId },
  )
  return rows.map(leadFromRow)
}

export async function getLead(customerId: string, webinarId: string, leadId: string): Promise<LeadDto | null> {
  const [rows] = await pool.query<Row[]>(
    `SELECT l.*,
            (SELECT COUNT(*) FROM webinar_chat_messages m WHERE m.lead_id = l.id) AS message_count
     FROM webinar_leads l
     WHERE l.customer_id = :customerId AND l.webinar_id = :webinarId AND l.id = :leadId AND l.deleted_at IS NULL
     LIMIT 1`,
    { customerId, webinarId, leadId },
  )
  return rows[0] ? leadFromRow(rows[0]) : null
}

export async function leadStats(customerId: string, webinarId: string) {
  const [rows] = await pool.query<Row[]>(
    `SELECT COUNT(*) AS total,
            SUM(status = 'registered') AS registered,
            SUM(status = 'attended') AS attended,
            SUM(status = 'no_show') AS no_show
     FROM webinar_leads
     WHERE customer_id = :customerId AND webinar_id = :webinarId AND deleted_at IS NULL`,
    { customerId, webinarId },
  )
  const [messages] = await pool.query<Row[]>(
    `SELECT COUNT(*) AS total FROM webinar_chat_messages
     WHERE customer_id = :customerId AND webinar_id = :webinarId AND lead_id IS NOT NULL`,
    { customerId, webinarId },
  )
  const total = Number(rows[0]?.total ?? 0)
  const attended = Number(rows[0]?.attended ?? 0)
  return {
    total,
    registered: Number(rows[0]?.registered ?? 0),
    attended,
    noShow: Number(rows[0]?.no_show ?? 0),
    totalMessages: Number(messages[0]?.total ?? 0),
    attendanceRate: total > 0 ? Math.round((attended / total) * 1000) / 10 : 0,
  }
}

export async function updateLeadStatus(customerId: string, webinarId: string, leadId: string, status: string) {
  const now = new Date()
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE webinar_leads
     SET status = :status,
         attended_at = CASE WHEN :status = 'attended' THEN COALESCE(attended_at, :now) ELSE attended_at END,
         updated_at = :now
     WHERE customer_id = :customerId AND webinar_id = :webinarId AND id = :leadId AND deleted_at IS NULL`,
    { customerId, webinarId, leadId, status, now },
  )
  return result.affectedRows > 0
}

export async function softDeleteLead(customerId: string, webinarId: string, leadId: string): Promise<boolean> {
  const now = new Date()
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE webinar_leads SET deleted_at = :now, updated_at = :now
     WHERE customer_id = :customerId AND webinar_id = :webinarId AND id = :leadId AND deleted_at IS NULL`,
    { customerId, webinarId, leadId, now },
  )
  return result.affectedRows > 0
}

// ---------------------------------------------------------------------- chat

export async function listChat(
  customerId: string,
  webinarId: string,
  options: { after?: Date; limit: number },
): Promise<ChatDto[]> {
  const params: Params = { customerId, webinarId, limit: options.limit }
  let after = ''
  if (options.after) {
    after = 'AND created_at > :after'
    params.after = options.after
  }
  const [rows] = await pool.query<Row[]>(
    `SELECT * FROM (
       SELECT * FROM webinar_chat_messages
       WHERE customer_id = :customerId AND webinar_id = :webinarId ${after}
       ORDER BY created_at DESC, id DESC LIMIT :limit
     ) recent ORDER BY created_at ASC, id ASC`,
    params,
  )
  return rows.map(chatFromRow)
}

export async function insertChat(
  customerId: string,
  webinarId: string,
  sender: { leadId: string | null; userId: string | null; name: string; role: 'presenter' | 'participant' },
  message: string,
): Promise<ChatDto> {
  const id = ulid()
  const now = new Date()
  await pool.query(
    `INSERT INTO webinar_chat_messages
      (id, customer_id, webinar_id, lead_id, user_id, sender_name, sender_role, message, created_at)
     VALUES (:id, :customerId, :webinarId, :leadId, :userId, :name, :role, :message, :now)`,
    { id, customerId, webinarId, leadId: sender.leadId, userId: sender.userId, name: sender.name, role: sender.role, message, now },
  )
  const [rows] = await pool.query<Row[]>(`SELECT * FROM webinar_chat_messages WHERE id = :id`, { id })
  return chatFromRow(rows[0])
}

// -------------------------------------------------------------------- public
// Anonymous visitors have no customer yet: the access code or lead id identifies the tenant.

export type PublicAccess = {
  accessCode: { id: string; code: string; scheduledAt: string | null; expiresAt: string | null; maxLeads: number | null; leadCount: number }
  webinar: ReturnType<typeof publicWebinarFromRow>
  customerId: string
  usable: boolean
}

export async function findAccessByCode(code: string, db: Db = pool, lock = false): Promise<PublicAccess | null> {
  const [rows] = await db.query<Row[]>(
    `SELECT c.id AS code_id, c.code, c.scheduled_at AS code_scheduled_at, c.expires_at, c.max_leads, c.lead_count, c.active,
            w.*
     FROM webinar_access_codes c
     JOIN webinar_webinars w ON w.id = c.webinar_id AND w.deleted_at IS NULL
     WHERE c.code = :code LIMIT 1 ${lock ? 'FOR UPDATE' : ''}`,
    { code },
  )
  const row = rows[0]
  if (!row) return null
  const expired = row.expires_at instanceof Date && row.expires_at.getTime() < Date.now()
  const full = row.max_leads != null && Number(row.lead_count) >= Number(row.max_leads)
  return {
    accessCode: {
      id: String(row.code_id),
      code: String(row.code),
      scheduledAt: iso(row.code_scheduled_at),
      expiresAt: iso(row.expires_at),
      maxLeads: row.max_leads == null ? null : Number(row.max_leads),
      leadCount: Number(row.lead_count),
    },
    webinar: publicWebinarFromRow(row),
    customerId: String(row.customer_id),
    usable: Boolean(row.active) && !expired && !full && row.status !== 'cancelled',
  }
}

export async function countLeads(customerId: string, webinarId: string, db: Db = pool): Promise<number> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM webinar_leads WHERE customer_id = :customerId AND webinar_id = :webinarId AND deleted_at IS NULL`,
    { customerId, webinarId },
  )
  return Number(rows[0]?.total ?? 0)
}

export async function findLeadByEmail(customerId: string, webinarId: string, email: string, db: Db = pool) {
  const [rows] = await db.query<Row[]>(
    `SELECT * FROM webinar_leads
     WHERE customer_id = :customerId AND webinar_id = :webinarId AND email = :email AND deleted_at IS NULL LIMIT 1`,
    { customerId, webinarId, email },
  )
  return rows[0] ? leadFromRow(rows[0]) : null
}

export async function insertLead(
  customerId: string,
  webinarId: string,
  accessCodeId: string,
  input: { name: string; email: string; phone: string | null },
  db: Db = pool,
) {
  const id = ulid()
  const now = new Date()
  await db.query(
    `INSERT INTO webinar_leads
      (id, customer_id, webinar_id, access_code_id, name, email, phone, status, registered_at, created_at, updated_at)
     VALUES (:id, :customerId, :webinarId, :accessCodeId, :name, :email, :phone, 'registered', :now, :now, :now)`,
    { ...input, id, customerId, webinarId, accessCodeId, now },
  )
  await db.query(`UPDATE webinar_access_codes SET lead_count = lead_count + 1, updated_at = :now WHERE id = :accessCodeId`, {
    accessCodeId,
    now,
  })
  return id
}

export type PublicLead = {
  id: string
  customerId: string
  webinarId: string
  name: string
  webinar: ReturnType<typeof publicWebinarFromRow>
}

export async function findPublicLead(leadId: string): Promise<PublicLead | null> {
  const [rows] = await pool.query<Row[]>(
    `SELECT l.id AS lead_id, l.name AS lead_name, w.*
     FROM webinar_leads l
     JOIN webinar_webinars w ON w.id = l.webinar_id AND w.deleted_at IS NULL
     WHERE l.id = :leadId AND l.deleted_at IS NULL LIMIT 1`,
    { leadId },
  )
  const row = rows[0]
  if (!row) return null
  return {
    id: String(row.lead_id),
    customerId: String(row.customer_id),
    webinarId: String(row.id),
    name: String(row.lead_name),
    webinar: publicWebinarFromRow(row),
  }
}

export async function markAttended(leadId: string): Promise<void> {
  const now = new Date()
  await pool.query(
    `UPDATE webinar_leads SET status = 'attended', attended_at = COALESCE(attended_at, :now), updated_at = :now WHERE id = :leadId`,
    { leadId, now },
  )
}
