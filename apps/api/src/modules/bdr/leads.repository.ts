import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { ulid } from 'ulid'
import { pool } from '../../core/db.js'
import { formatPhone, normalizePhone } from './telephony/phone.js'

type Row = RowDataPacket & Record<string, unknown>

export type LeadStatus = 'queued' | 'dialing' | 'in_call' | 'done' | 'failed'

function parseJson(value: unknown): Record<string, unknown> {
  if (value == null) return {}
  if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>
  if (Buffer.isBuffer(value)) return JSON.parse(value.toString('utf8')) as Record<string, unknown>
  return value as Record<string, unknown>
}

export function leadFromRow(row: Row) {
  const body = parseJson(row.lead_json)
  const company = row.company == null ? '' : String(row.company)
  const name = row.contact_name == null ? '' : String(row.contact_name)
  return {
    email: '',
    address: '',
    city: '',
    state: '',
    cep: '',
    cnpj: '',
    partnerCpf: '',
    ...body,
    id: String(row.id),
    campaignId: String(row.campaign_id),
    phone: String(row.phone_display),
    phoneDigits: String(row.phone),
    company,
    name,
    partnerName: String(body.partnerName ?? name),
    identifier: String(body.identifier ?? company),
    socialReason: String(body.socialReason ?? company),
    protocol: String(body.protocol ?? row.id),
    source: String(row.source),
    status: String(row.status) as LeadStatus,
    attempts: Number(row.attempts),
    lastOutcome: row.last_outcome == null ? null : String(row.last_outcome),
    nextAttemptAt: row.next_attempt_at == null ? null : new Date(String(row.next_attempt_at)).toISOString(),
  }
}

export type LeadInput = Record<string, unknown> & { phone: string }

export async function importLeads(
  customerId: string,
  campaignId: string,
  leads: LeadInput[],
  source: string,
) {
  const invalid: { index: number; phone: string }[] = []
  const now = new Date()
  const values: (string | Date | null)[][] = []
  const seen = new Set<string>()
  let duplicates = 0

  leads.forEach((lead, index) => {
    const phone = normalizePhone(lead.phone)
    if (!phone) {
      invalid.push({ index, phone: String(lead.phone ?? '') })
      return
    }
    if (seen.has(phone)) {
      duplicates += 1
      return
    }
    seen.add(phone)
    const { phone: _phone, id: _id, ...rest } = lead
    const company = String(lead.company ?? lead.companyName ?? '').trim() || null
    const name = String(lead.name ?? lead.contactName ?? '').trim() || null
    values.push([
      ulid(),
      customerId,
      campaignId,
      phone,
      formatPhone(phone),
      company,
      name,
      source,
      'queued',
      JSON.stringify(rest),
      now,
      now,
    ])
  })

  let inserted = 0
  for (let offset = 0; offset < values.length; offset += 500) {
    const chunk = values.slice(offset, offset + 500)
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT IGNORE INTO bdr_leads
        (id, customer_id, campaign_id, phone, phone_display, company, contact_name, source, status, lead_json, created_at, updated_at)
       VALUES ?`,
      [chunk],
    )
    inserted += result.affectedRows
  }
  duplicates += values.length - inserted
  await refreshCampaignCounts(customerId, campaignId)
  return { inserted, duplicates, invalid }
}

export async function leadSummary(customerId: string, campaignId: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       COUNT(*) AS total,
       SUM(status = 'queued' AND (next_attempt_at IS NULL OR next_attempt_at <= :now)) AS ready,
       SUM(status = 'queued' AND next_attempt_at > :now) AS scheduled,
       SUM(status IN ('dialing', 'in_call')) AS active,
       SUM(status = 'done') AS done,
       SUM(status = 'failed') AS exhausted,
       MIN(CASE WHEN status = 'queued' AND next_attempt_at > :now THEN next_attempt_at END) AS next_attempt_at
     FROM bdr_leads
     WHERE customer_id = :customerId AND campaign_id = :campaignId AND deleted_at IS NULL`,
    { customerId, campaignId, now: new Date() },
  )
  const row = rows[0] ?? {}
  return {
    total: Number(row.total ?? 0),
    ready: Number(row.ready ?? 0),
    scheduled: Number(row.scheduled ?? 0),
    active: Number(row.active ?? 0),
    done: Number(row.done ?? 0),
    exhausted: Number(row.exhausted ?? 0),
    nextAttemptAt: row.next_attempt_at == null ? null : new Date(String(row.next_attempt_at)).toISOString(),
  }
}

export async function getLead(customerId: string, id: string) {
  const [rows] = await pool.query<Row[]>(
    'SELECT * FROM bdr_leads WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL LIMIT 1',
    { customerId, id },
  )
  return rows[0] ? leadFromRow(rows[0]) : null
}

/** Locks the next due lead of the campaign for this operator. Concurrent operators skip each other's rows. */
export async function reserveNextLead(customerId: string, campaignId: string, userId: string) {
  const connection: PoolConnection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const now = new Date()
    const [rows] = await connection.query<Row[]>(
      `SELECT * FROM bdr_leads
       WHERE customer_id = :customerId AND campaign_id = :campaignId AND status = 'queued'
         AND deleted_at IS NULL AND (next_attempt_at IS NULL OR next_attempt_at <= :now)
       ORDER BY COALESCE(next_attempt_at, created_at), created_at
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      { customerId, campaignId, now },
    )
    const row = rows[0]
    if (!row) {
      await connection.commit()
      return null
    }
    await connection.query(
      `UPDATE bdr_leads
       SET status = 'dialing', attempts = attempts + 1, locked_by = :userId, locked_at = :now, updated_at = :now
       WHERE id = :id`,
      { id: row.id, userId, now },
    )
    await connection.commit()
    return leadFromRow({ ...row, status: 'dialing', attempts: Number(row.attempts) + 1 } as Row)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function markLeadInCall(customerId: string, leadId: string) {
  await pool.query(
    `UPDATE bdr_leads SET status = 'in_call', updated_at = :now WHERE customer_id = :customerId AND id = :leadId`,
    { customerId, leadId, now: new Date() },
  )
}

export async function settleLead(
  customerId: string,
  leadId: string,
  update: { status: LeadStatus; lastOutcome: string; nextAttemptAt: Date | null; refundAttempt?: boolean },
) {
  await pool.query(
    `UPDATE bdr_leads
     SET status = :status, last_outcome = :lastOutcome, next_attempt_at = :nextAttemptAt,
         attempts = GREATEST(0, attempts - :refund), locked_by = NULL, locked_at = NULL, updated_at = :now
     WHERE customer_id = :customerId AND id = :leadId`,
    {
      customerId,
      leadId,
      status: update.status,
      lastOutcome: update.lastOutcome,
      nextAttemptAt: update.nextAttemptAt,
      refund: update.refundAttempt ? 1 : 0,
      now: new Date(),
    },
  )
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT campaign_id FROM bdr_leads WHERE id = :leadId',
    { leadId },
  )
  if (rows[0]) await refreshCampaignCounts(customerId, String(rows[0].campaign_id))
}

export async function refreshCampaignCounts(customerId: string, campaignId: string) {
  await pool.query(
    `UPDATE bdr_campaigns c
     JOIN (
       SELECT COUNT(*) AS total, COALESCE(SUM(status IN ('done', 'failed')), 0) AS completed
       FROM bdr_leads
       WHERE customer_id = :customerId AND campaign_id = :campaignId AND deleted_at IS NULL
     ) l
     SET c.lead_count = l.total, c.completed_count = l.completed, c.updated_at = :now
     WHERE c.customer_id = :customerId AND c.id = :campaignId`,
    { customerId, campaignId, now: new Date() },
  )
}
