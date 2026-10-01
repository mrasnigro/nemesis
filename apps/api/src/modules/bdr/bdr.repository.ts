import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { ulid } from 'ulid'
import { pool } from '../../core/db.js'
import { resolveSort, type PageQuery } from '../../core/list.js'

type JsonRow = RowDataPacket & Record<string, unknown>
type SqlParams = Record<string, string | number | Date | null>

function parseJson(value: unknown): Record<string, unknown> {
  if (value == null) return {}
  if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>
  if (Buffer.isBuffer(value)) return JSON.parse(value.toString('utf8')) as Record<string, unknown>
  if (typeof value === 'object') return value as Record<string, unknown>
  return {}
}

function iso(value: unknown): string | null {
  if (value == null) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function likeTerm(q: string | undefined): string | null {
  if (!q) return null
  return `%${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

function campaignFromRow(row: JsonRow) {
  const body = parseJson(row.campaign_json)
  const leads = Number(row.lead_count ?? body.leads ?? 0)
  const completed = Number(row.completed_count ?? body.completed ?? 0)
  return {
    ...body,
    id: String(row.id),
    name: String(row.name),
    status: String(row.status),
    leads,
    completed,
    progress: leads > 0 ? Math.round((completed / leads) * 100) : Number(body.progress ?? 0),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

function callFromRow(row: JsonRow) {
  const body = parseJson(row.call_json)
  return {
    ...body,
    id: String(row.id),
    campaignId: row.campaign_id == null ? body.campaignId ?? null : String(row.campaign_id),
    phone: String(row.phone),
    leadName: row.lead_name == null ? body.leadName ?? '' : String(row.lead_name),
    company: row.company == null ? body.company ?? '' : String(row.company),
    mode: String(row.mode),
    callStatus: String(row.call_status),
    duration: Number(row.duration_seconds ?? body.duration ?? 0),
    durationSeconds: Number(row.duration_seconds ?? 0),
    startedAt: iso(row.started_at),
  }
}

function meetingFromRow(row: JsonRow) {
  const body = parseJson(row.meeting_json)
  return {
    ...body,
    id: String(row.id),
    leadName: String(row.lead_name),
    company: row.company == null ? body.company ?? '' : String(row.company),
    callId: row.call_id == null ? body.callId ?? null : String(row.call_id),
    startsAt: iso(row.starts_at),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

function meetingStartsAt(input: Record<string, unknown>): Date {
  if (typeof input.startsAt === 'string' && input.startsAt.length > 0) {
    const parsed = new Date(input.startsAt)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  const date = typeof input.date === 'string' ? input.date : '1970-01-01'
  const time = typeof input.time === 'string' ? input.time : '00:00'
  const parsed = new Date(`${date}T${time}:00`)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

const campaignSort = { createdAt: 'created_at', name: 'name' }
const callSort = { createdAt: 'started_at', startedAt: 'started_at' }
const meetingSort = { createdAt: 'starts_at', startsAt: 'starts_at' }

export async function listCampaigns(
  customerId: string,
  query: PageQuery & { status?: string },
) {
  const filters = ['customer_id = :customerId', 'deleted_at IS NULL']
  const params: SqlParams = { customerId }
  const term = likeTerm(query.q)
  if (term) {
    filters.push('name LIKE :term')
    params.term = term
  }
  if (query.status) {
    filters.push('status = :status')
    params.status = query.status
  }
  return listRows('bdr_campaigns', filters, params, query, campaignSort, 'createdAt', campaignFromRow)
}

export async function insertCampaign(customerId: string, input: Record<string, unknown>) {
  const id = ulid()
  const now = new Date()
  const leads = Number(input.leads ?? input.leadCount ?? 0)
  const completed = Number(input.completed ?? input.completedCount ?? 0)
  await pool.query(
    `INSERT INTO bdr_campaigns
      (id, customer_id, name, status, lead_count, completed_count, campaign_json, created_at, updated_at)
     VALUES
      (:id, :customerId, :name, :status, :leads, :completed, :campaignJson, :now, :now)`,
    {
      id,
      customerId,
      name: String(input.name),
      status: String(input.status ?? 'active'),
      leads,
      completed,
      campaignJson: JSON.stringify({ ...input, id }),
      now,
    },
  )
  return getCampaign(customerId, id)
}

export async function getCampaign(customerId: string, id: string) {
  const [rows] = await pool.query<JsonRow[]>(
    `SELECT * FROM bdr_campaigns
     WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL
     LIMIT 1`,
    { customerId, id },
  )
  return rows[0] ? campaignFromRow(rows[0]) : null
}

export async function listCalls(
  customerId: string,
  query: PageQuery & { campaignId?: string; mode?: string; callStatus?: string },
) {
  const filters = ['customer_id = :customerId', 'deleted_at IS NULL']
  const params: SqlParams = { customerId }
  const term = likeTerm(query.q)
  if (term) {
    filters.push('(phone LIKE :term OR lead_name LIKE :term OR company LIKE :term)')
    params.term = term
  }
  if (query.campaignId) {
    filters.push('campaign_id = :campaignId')
    params.campaignId = query.campaignId
  }
  if (query.mode) {
    filters.push('mode = :mode')
    params.mode = query.mode
  }
  if (query.callStatus) {
    filters.push('call_status = :callStatus')
    params.callStatus = query.callStatus
  }
  if (query.from) {
    filters.push('started_at >= :fromAt')
    params.fromAt = `${query.from} 00:00:00`
  }
  if (query.to) {
    filters.push('started_at < DATE_ADD(:toAt, INTERVAL 1 DAY)')
    params.toAt = `${query.to} 00:00:00`
  }
  return listRows('bdr_calls', filters, params, query, callSort, '-startedAt', callFromRow)
}

export async function getCall(customerId: string, id: string) {
  const [rows] = await pool.query<JsonRow[]>(
    `SELECT * FROM bdr_calls
     WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL
     LIMIT 1`,
    { customerId, id },
  )
  return rows[0] ? callFromRow(rows[0]) : null
}

export async function insertCall(customerId: string, userId: string, input: Record<string, unknown>) {
  const id = ulid()
  const now = new Date()
  const duration = Number(input.durationSeconds ?? input.duration ?? 0)
  const stored = { ...input, id, duration, durationSeconds: duration }
  await pool.query(
    `INSERT INTO bdr_calls
      (id, customer_id, user_id, campaign_id, phone, lead_name, company, mode, call_status, duration_seconds, call_json, started_at, created_at)
     VALUES
      (:id, :customerId, :userId, :campaignId, :phone, :leadName, :company, :mode, :callStatus, :duration, :callJson, :startedAt, :now)`,
    {
      id,
      customerId,
      userId,
      campaignId: input.campaignId == null || input.campaignId === '' ? null : String(input.campaignId),
      phone: String(input.phone),
      leadName: input.leadName == null ? null : String(input.leadName),
      company: input.company == null ? null : String(input.company),
      mode: String(input.mode ?? 'automatic'),
      callStatus: String(input.callStatus ?? 'Atendida'),
      duration,
      callJson: JSON.stringify(stored),
      startedAt: now,
      now,
    },
  )
  return getCall(customerId, id)
}

export async function listMeetings(customerId: string, query: PageQuery) {
  const filters = ['customer_id = :customerId', 'deleted_at IS NULL']
  const params: SqlParams = { customerId }
  const term = likeTerm(query.q)
  if (term) {
    filters.push('(lead_name LIKE :term OR company LIKE :term)')
    params.term = term
  }
  if (query.from) {
    filters.push('starts_at >= :fromAt')
    params.fromAt = `${query.from} 00:00:00`
  }
  if (query.to) {
    filters.push('starts_at < DATE_ADD(:toAt, INTERVAL 1 DAY)')
    params.toAt = `${query.to} 00:00:00`
  }
  return listRows('bdr_meetings', filters, params, query, meetingSort, 'startsAt', meetingFromRow)
}

export async function getMeeting(customerId: string, id: string) {
  const [rows] = await pool.query<JsonRow[]>(
    `SELECT * FROM bdr_meetings
     WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL
     LIMIT 1`,
    { customerId, id },
  )
  return rows[0] ? meetingFromRow(rows[0]) : null
}

export async function insertMeeting(customerId: string, input: Record<string, unknown>) {
  const id = ulid()
  const now = new Date()
  const startsAt = meetingStartsAt(input)
  const stored = { ...input, id, startsAt: startsAt.toISOString() }
  await pool.query(
    `INSERT INTO bdr_meetings
      (id, customer_id, call_id, lead_name, company, starts_at, meeting_json, created_at, updated_at)
     VALUES
      (:id, :customerId, :callId, :leadName, :company, :startsAt, :meetingJson, :now, :now)`,
    {
      id,
      customerId,
      callId: input.callId == null || input.callId === '' ? null : String(input.callId),
      leadName: String(input.leadName),
      company: input.company == null ? null : String(input.company),
      startsAt,
      meetingJson: JSON.stringify(stored),
      now,
    },
  )
  return getMeeting(customerId, id)
}

export async function updateMeeting(customerId: string, id: string, input: Record<string, unknown>) {
  const current = await getMeeting(customerId, id)
  if (!current) return null
  const now = new Date()
  const merged = { ...current, ...input, id }
  const startsAt = meetingStartsAt(merged)
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE bdr_meetings
     SET call_id = :callId,
         lead_name = :leadName,
         company = :company,
         starts_at = :startsAt,
         meeting_json = :meetingJson,
         updated_at = :now
     WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL`,
    {
      id,
      customerId,
      callId: merged.callId == null || merged.callId === '' ? null : String(merged.callId),
      leadName: String(merged.leadName),
      company: merged.company == null ? null : String(merged.company),
      startsAt,
      meetingJson: JSON.stringify({ ...merged, startsAt: startsAt.toISOString() }),
      now,
    },
  )
  if (result.affectedRows === 0) return null
  return getMeeting(customerId, id)
}

export async function deleteMeeting(customerId: string, id: string) {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE bdr_meetings
     SET deleted_at = :now, updated_at = :now
     WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL`,
    { customerId, id, now: new Date() },
  )
  return result.affectedRows > 0
}

export async function getMetrics(customerId: string) {
  const [callRows] = await pool.query<RowDataPacket[]>(
    `SELECT
       COUNT(*) AS totalCalls,
       SUM(DATE(started_at) = UTC_DATE()) AS callsToday,
       AVG(duration_seconds) AS averageDuration
     FROM bdr_calls
     WHERE customer_id = :customerId AND deleted_at IS NULL`,
    { customerId },
  )
  const [meetingRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS meetingsScheduled
     FROM bdr_meetings
     WHERE customer_id = :customerId AND deleted_at IS NULL`,
    { customerId },
  )
  const averageSeconds = Number(callRows[0]?.averageDuration ?? 0)
  const minutes = Math.floor(averageSeconds / 60)
  const seconds = Math.round(averageSeconds % 60)
  return {
    totalCalls: Number(callRows[0]?.totalCalls ?? 0),
    callsToday: Number(callRows[0]?.callsToday ?? 0),
    averageDurationLabel: `${minutes}m ${seconds}s`,
    meetingsScheduled: Number(meetingRows[0]?.meetingsScheduled ?? 0),
    callsGoal: 30,
    meetingsGoal: 10,
    weekDeltaPercent: 0,
  }
}

async function listRows<T>(
  table: string,
  filters: string[],
  params: SqlParams,
  query: PageQuery,
  allowedSort: Record<string, string>,
  fallbackSort: string,
  mapRow: (row: JsonRow) => T,
) {
  const where = filters.join(' AND ')
  const sort = resolveSort(query.sort, allowedSort, fallbackSort)
  const offset = (query.page - 1) * query.pageSize
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${table} WHERE ${where}`,
    params,
  )
  const [rows] = await pool.query<JsonRow[]>(
    `SELECT * FROM ${table}
     WHERE ${where}
     ORDER BY ${sort.column} ${sort.direction}
     LIMIT :limit OFFSET :offset`,
    { ...params, limit: query.pageSize, offset },
  )
  return {
    rows: rows.map(mapRow),
    total: Number(countRows[0]?.total ?? 0),
  }
}
