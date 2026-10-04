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

/** lead_count / completed_count are maintained from bdr_leads (see leads.repository), never from the client. */
function campaignFromRow(row: JsonRow) {
  const leads = Number(row.lead_count)
  const completed = Number(row.completed_count)
  return {
    id: String(row.id),
    name: String(row.name),
    status: String(row.status),
    leads,
    completed,
    progress: leads > 0 ? Math.round((completed / leads) * 100) : 0,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

/** Fields owned by columns; they are never duplicated inside call_json. */
const CALL_COLUMN_KEYS = [
  'id',
  'phone',
  'leadName',
  'company',
  'mode',
  'callStatus',
  'campaignId',
  'attemptId',
  'leadId',
  'qualificationId',
  'callbackAt',
  'duration',
  'durationSeconds',
  'startedAt',
  // Derived on read from bdr_meetings.call_id so a rescheduled or removed meeting never goes stale here.
  'meetings',
  'meetingIds',
  'recordingUrl',
  'recordingStatus',
  'summary',
  'transcript',
  'hasTranscript',
] as const

function callFromRow(row: JsonRow, options: { transcript?: boolean } = {}) {
  const body = parseJson(row.call_json)
  const transcript = row.transcript_text == null ? null : String(row.transcript_text)
  return {
    ...body,
    id: String(row.id),
    campaignId: row.campaign_id == null ? null : String(row.campaign_id),
    attemptId: row.attempt_id == null ? null : String(row.attempt_id),
    leadId: row.lead_id == null ? null : String(row.lead_id),
    phone: String(row.phone),
    leadName: row.lead_name == null ? '' : String(row.lead_name),
    company: row.company == null ? '' : String(row.company),
    mode: String(row.mode),
    callStatus: String(row.call_status),
    qualificationId: row.qualification_id == null ? null : String(row.qualification_id),
    callbackAt: iso(row.callback_at),
    duration: Number(row.duration_seconds ?? 0),
    durationSeconds: Number(row.duration_seconds ?? 0),
    startedAt: iso(row.started_at),
    /** Model-written summary and job state; the controller fills `text` from the record when there is none. */
    summary: {
      text: row.summary_text == null ? null : String(row.summary_text),
      source: row.summary_source == null ? null : String(row.summary_source),
      status: String(row.summary_status ?? 'none'),
      updatedAt: iso(row.summary_updated_at),
    },
    hasTranscript: Boolean(transcript),
    ...(options.transcript ? { transcript } : {}),
  }
}

function meetingFromRow(row: JsonRow) {
  const body = parseJson(row.meeting_json)
  return {
    ...body,
    id: String(row.id),
    leadName: String(row.lead_name),
    company: row.company == null ? body.company ?? '' : String(row.company),
    callId: row.call_id == null ? null : String(row.call_id),
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
  await pool.query(
    `INSERT INTO bdr_campaigns (id, customer_id, name, status, created_at, updated_at)
     VALUES (:id, :customerId, :name, :status, :now, :now)`,
    {
      id,
      customerId,
      name: String(input.name),
      status: String(input.status ?? 'active'),
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
  query: PageQuery & { campaignId?: string; mode?: string; callStatus?: string; qualificationId?: string },
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
  if (query.qualificationId) {
    filters.push('qualification_id = :qualificationId')
    params.qualificationId = query.qualificationId
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
  return rows[0] ? callFromRow(rows[0], { transcript: true }) : null
}

export type CallLink = { attemptId: string | null; leadId: string | null }

/** Stores a finished attendance. Link, qualification and callback are columns; the rest of the form is call_json. */
export async function insertCall(
  customerId: string,
  userId: string,
  input: Record<string, unknown>,
  link: CallLink = { attemptId: null, leadId: null },
) {
  const id = ulid()
  const now = new Date()
  const duration = Number(input.durationSeconds ?? input.duration ?? 0)
  const document = { ...input }
  for (const key of CALL_COLUMN_KEYS) delete document[key]
  const callbackAt = typeof input.callbackAt === 'string' ? new Date(input.callbackAt) : null
  await pool.query(
    `INSERT INTO bdr_calls
      (id, customer_id, user_id, campaign_id, attempt_id, lead_id, phone, lead_name, company, mode, call_status,
       qualification_id, callback_at, duration_seconds, call_json, started_at, created_at)
     VALUES
      (:id, :customerId, :userId, :campaignId, :attemptId, :leadId, :phone, :leadName, :company, :mode, :callStatus,
       :qualificationId, :callbackAt, :duration, :callJson, :startedAt, :now)`,
    {
      id,
      customerId,
      userId,
      campaignId: input.campaignId == null || input.campaignId === '' ? null : String(input.campaignId),
      attemptId: link.attemptId,
      leadId: link.leadId,
      phone: String(input.phone),
      leadName: input.leadName == null ? null : String(input.leadName),
      company: input.company == null ? null : String(input.company),
      mode: String(input.mode ?? 'automatic'),
      callStatus: String(input.callStatus ?? 'Atendida'),
      qualificationId: input.qualificationId == null ? null : String(input.qualificationId),
      callbackAt: callbackAt && !Number.isNaN(callbackAt.getTime()) ? callbackAt : null,
      duration,
      callJson: JSON.stringify(document),
      startedAt: now,
      now,
    },
  )
  return getCall(customerId, id)
}

/** Attaches meetings booked during the attendance to its call. Already-linked or foreign meetings are left alone. */
export async function linkMeetingsToCall(customerId: string, callId: string, meetingIds: string[]) {
  if (meetingIds.length === 0) return
  await pool.query(
    `UPDATE bdr_meetings
     SET call_id = :callId, updated_at = :now
     WHERE customer_id = :customerId AND id IN (:meetingIds) AND call_id IS NULL AND deleted_at IS NULL`,
    { customerId, callId, meetingIds, now: new Date() },
  )
}

/** Meetings booked during each call, keyed by call id (bdr_meetings.call_id is the single source of truth). */
export async function meetingsByCall(customerId: string, callIds: string[]) {
  const grouped = new Map<string, ReturnType<typeof meetingFromRow>[]>()
  if (callIds.length === 0) return grouped
  const [rows] = await pool.query<JsonRow[]>(
    `SELECT * FROM bdr_meetings
     WHERE customer_id = :customerId AND call_id IN (:callIds) AND deleted_at IS NULL
     ORDER BY starts_at`,
    { customerId, callIds },
  )
  for (const row of rows) {
    const meeting = meetingFromRow(row)
    const list = grouped.get(meeting.callId ?? '') ?? []
    list.push(meeting)
    grouped.set(meeting.callId ?? '', list)
  }
  return grouped
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

/** Targets shown on the panel cards. Fixed until the client asks for per-customer goals. */
const DAILY_CALLS_GOAL = 30
const MEETINGS_GOAL = 10

export async function getMetrics(customerId: string) {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000)
  const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000)
  const [callRows] = await pool.query<RowDataPacket[]>(
    `SELECT
       COUNT(*) AS totalCalls,
       COALESCE(SUM(DATE(started_at) = UTC_DATE()), 0) AS callsToday,
       COALESCE(SUM(started_at >= :weekAgo), 0) AS callsThisWeek,
       COALESCE(SUM(started_at >= :twoWeeksAgo AND started_at < :weekAgo), 0) AS callsPreviousWeek,
       AVG(CASE WHEN started_at >= :weekAgo THEN duration_seconds END) AS averageDuration
     FROM bdr_calls
     WHERE customer_id = :customerId AND deleted_at IS NULL`,
    { customerId, weekAgo, twoWeeksAgo },
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
  const thisWeek = Number(callRows[0]?.callsThisWeek ?? 0)
  const previousWeek = Number(callRows[0]?.callsPreviousWeek ?? 0)
  const weekDeltaPercent =
    previousWeek > 0 ? Math.round(((thisWeek - previousWeek) / previousWeek) * 100) : thisWeek > 0 ? 100 : 0
  return {
    totalCalls: Number(callRows[0]?.totalCalls ?? 0),
    callsToday: Number(callRows[0]?.callsToday ?? 0),
    averageDurationLabel: `${minutes}m ${seconds}s`,
    meetingsScheduled: Number(meetingRows[0]?.meetingsScheduled ?? 0),
    callsGoal: DAILY_CALLS_GOAL,
    meetingsGoal: MEETINGS_GOAL,
    weekDeltaPercent,
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
