import type { RowDataPacket } from 'mysql2'
import { ulid } from 'ulid'
import { config } from '../../core/config.js'
import { pool } from '../../core/db.js'
import { AppError } from '../../core/errors.js'
import type { AuthUser } from '../../types/express.js'
import { getCampaign } from './bdr.repository.js'
import {
  getLead,
  markLeadInCall,
  reserveNextLead,
  settleLead,
  type LeadStatus,
} from './leads.repository.js'
import { scheduleRecordingFetch } from './recordings.js'
import { withinCallingHours } from './telephony/callingHours.js'
import { normalizePhone } from './telephony/phone.js'
import {
  hasOperatorSipCredentials,
  getOperatorExtension,
  getTelephonySettings,
  resolveProvider,
  type TelephonySettings,
} from './telephony/settings.js'
import type { DialOutcome, DialTarget, TelephonyProvider } from './telephony/types.js'

type Row = RowDataPacket & Record<string, unknown>

export type AttemptStatus = 'ringing' | 'answered' | 'ended'

/** A call that the PABX has not listed yet is still being set up, not gone. */
const SETUP_GRACE_MS = 10_000
/** Ringing attempts with no poll for this long belong to a closed browser tab. */
const STALE_RINGING_MS = 5 * 60_000

const OPERATOR_OUTCOMES = ['voicemail', 'no_answer', 'busy', 'failed'] as const
export type OperatorOutcome = (typeof OPERATOR_OUTCOMES)[number]

/** Commercial dispositions that put the lead back in the queue instead of closing it. */
const REQUEUE_DISPOSITIONS = new Set(['callback', 'no_contact'])

function attemptFromRow(row: Row) {
  return {
    id: String(row.id),
    campaignId: row.campaign_id == null ? null : String(row.campaign_id),
    leadId: row.lead_id == null ? null : String(row.lead_id),
    callId: row.call_id == null ? null : String(row.call_id),
    userId: row.user_id == null ? null : String(row.user_id),
    phone: String(row.phone),
    extension: String(row.operator_extension),
    provider: String(row.provider),
    direction: row.direction == null ? 'outbound' : String(row.direction),
    providerCallId: row.provider_call_id == null ? null : String(row.provider_call_id),
    status: String(row.status) as AttemptStatus,
    outcome: row.outcome == null ? null : (String(row.outcome) as DialOutcome),
    providerSeen: Boolean(row.provider_seen),
    startedAt: new Date(String(row.started_at)),
    answeredAt: row.answered_at == null ? null : new Date(String(row.answered_at)),
    endedAt: row.ended_at == null ? null : new Date(String(row.ended_at)),
    recordingStatus: String(row.recording_status),
  }
}

type Attempt = ReturnType<typeof attemptFromRow>

function target(attempt: Attempt): DialTarget {
  return {
    attemptId: attempt.id,
    phone: attempt.phone,
    extension: attempt.extension,
    startedAt: attempt.startedAt,
    endedAt: attempt.endedAt,
    providerCallId: attempt.providerCallId,
    wasAnswered: attempt.status === 'answered' || attempt.answeredAt !== null,
  }
}

async function loadAttempt(customerId: string, attemptId: string) {
  const [rows] = await pool.query<Row[]>(
    'SELECT * FROM bdr_dial_attempts WHERE customer_id = :customerId AND id = :attemptId LIMIT 1',
    { customerId, attemptId },
  )
  return rows[0] ? attemptFromRow(rows[0]) : null
}

async function ownAttempt(user: AuthUser, attemptId: string) {
  const attempt = await loadAttempt(user.customerId!, attemptId)
  if (!attempt) throw new AppError(404, 'NOT_FOUND', 'Attempt not found')
  if (attempt.userId === user.id) return attempt
  const extension = await getOperatorExtension(user.id)
  if (attempt.direction === 'inbound' && extension && attempt.extension === extension) return attempt
  throw new AppError(404, 'NOT_FOUND', 'Attempt not found')
}

function requireNationalPhone(raw: string) {
  const phone = normalizePhone(raw)
  if (!phone) throw new AppError(400, 'VALIDATION_ERROR', 'Telefone inválido (use DDD + número)')
  return phone
}

async function requireProvider(customerId: string): Promise<TelephonyProvider> {
  const provider = await resolveProvider(customerId)
  if (!provider) {
    throw new AppError(409, 'TELEPHONY_NOT_CONFIGURED', 'Telefonia não configurada para este cliente')
  }
  return provider
}

function assertCallingHours(settings: TelephonySettings) {
  if (!withinCallingHours(new Date(), settings, config.PABX_TIMEZONE)) {
    throw new AppError(409, 'CALLING_HOURS', 'Fora do horário permitido para ligações')
  }
}

function retryDelayMinutes(settings: TelephonySettings, outcome: DialOutcome) {
  if (outcome === 'busy' || outcome === 'failed') return settings.retryBusyMinutes
  if (outcome === 'voicemail') return settings.retryVoicemailMinutes
  return settings.retryNoAnswerMinutes
}

async function settleUnansweredLead(customerId: string, leadId: string, outcome: DialOutcome) {
  if (outcome === 'invalid') {
    await settleLead(customerId, leadId, {
      status: 'failed',
      lastOutcome: outcome,
      nextAttemptAt: null,
    })
    return
  }
  if (outcome === 'cancelled') {
    await settleLead(customerId, leadId, {
      status: 'queued',
      lastOutcome: outcome,
      nextAttemptAt: null,
      refundAttempt: true,
    })
    return
  }
  const [settings, lead] = await Promise.all([getTelephonySettings(customerId), getLead(customerId, leadId)])
  const exhausted = (lead?.attempts ?? 0) >= settings.maxAttempts
  await settleLead(customerId, leadId, {
    status: exhausted ? 'failed' : 'queued',
    lastOutcome: outcome,
    nextAttemptAt: exhausted ? null : new Date(Date.now() + retryDelayMinutes(settings, outcome) * 60_000),
  })
}

async function endAttempt(attempt: Attempt, outcome: DialOutcome, customerId: string) {
  const now = new Date()
  await pool.query(
    `UPDATE bdr_dial_attempts
     SET status = 'ended', outcome = :outcome, ended_at = :now, updated_at = :now
     WHERE id = :id AND status <> 'ended'`,
    { id: attempt.id, outcome, now },
  )
  if (attempt.leadId) await settleUnansweredLead(customerId, attempt.leadId, outcome)
}

/** Closes attempts left ringing by a closed tab and hangs up the trunk leg. */
async function releaseStaleAttempts(customerId: string, provider: TelephonyProvider) {
  const [rows] = await pool.query<Row[]>(
    `SELECT * FROM bdr_dial_attempts
     WHERE customer_id = :customerId AND status = 'ringing' AND updated_at < :cutoff`,
    { customerId, cutoff: new Date(Date.now() - STALE_RINGING_MS) },
  )
  for (const row of rows) {
    const attempt = attemptFromRow(row)
    await provider.hangup(target(attempt)).catch(() => null)
    await endAttempt(attempt, 'cancelled', customerId)
  }
}

/** One open dial per operator: a new dial cancels that operator's ringing call, including an inbound call on their ramal. */
async function cancelOpenAttempts(user: AuthUser, provider: TelephonyProvider, extension: string | null) {
  const [rows] = await pool.query<Row[]>(
    `SELECT * FROM bdr_dial_attempts
     WHERE customer_id = :customerId AND status = 'ringing'
       AND (user_id = :userId OR (direction = 'inbound' AND operator_extension = :extension))`,
    { customerId: user.customerId, userId: user.id, extension },
  )
  for (const row of rows) {
    const attempt = attemptFromRow(row)
    await provider.hangup(target(attempt)).catch(() => null)
    await endAttempt(attempt, 'cancelled', user.customerId!)
  }
}

async function beginOutbound(user: AuthUser) {
  const customerId = user.customerId!
  const provider = await requireProvider(customerId)
  assertCallingHours(await getTelephonySettings(customerId))
  const extension = await getOperatorExtension(user.id)
  await releaseStaleAttempts(customerId, provider)
  await cancelOpenAttempts(user, provider, extension)
  return { customerId, provider, extension }
}

async function originate(
  user: AuthUser,
  provider: TelephonyProvider,
  input: {
    phone: string
    extension: string
    campaignId: string | null
    leadId: string | null
    connectPhone?: string | null
  },
) {
  const id = ulid()
  const now = new Date()
  await pool.query(
    `INSERT INTO bdr_dial_attempts
      (id, customer_id, user_id, campaign_id, lead_id, phone, operator_extension, provider, status, started_at, created_at, updated_at)
     VALUES
      (:id, :customerId, :userId, :campaignId, :leadId, :phone, :extension, :provider, 'ringing', :now, :now, :now)`,
    {
      id,
      customerId: user.customerId,
      userId: user.id,
      campaignId: input.campaignId,
      leadId: input.leadId,
      phone: input.phone,
      extension: input.extension,
      provider: provider.name,
      now,
    },
  )
  const attempt = (await loadAttempt(user.customerId!, id))!
  try {
    await provider.originate({ ...target(attempt), connectPhone: input.connectPhone ?? null })
  } catch (error) {
    await endAttempt(attempt, 'failed', user.customerId!)
    throw error
  }
  return attempt
}

async function present(customerId: string, attempt: Attempt) {
  const lead = attempt.leadId ? await getLead(customerId, attempt.leadId) : null
  return {
    id: attempt.id,
    status: attempt.status,
    outcome: attempt.outcome,
    direction: attempt.direction,
    phone: attempt.phone,
    campaignId: attempt.campaignId,
    callId: attempt.callId,
    startedAt: attempt.startedAt.toISOString(),
    answeredAt: attempt.answeredAt?.toISOString() ?? null,
    endedAt: attempt.endedAt?.toISOString() ?? null,
    lead,
  }
}

export async function getDialerConfig(user: AuthUser) {
  const [settings, extension, hasWebRtcCredentials, provider] = await Promise.all([
    getTelephonySettings(user.customerId!),
    getOperatorExtension(user.id),
    hasOperatorSipCredentials(user.customerId!, user.id),
    resolveProvider(user.customerId!).catch(() => null),
  ])
  return {
    provider: settings.provider,
    configured: provider != null,
    extension,
    hasWebRtcCredentials,
    webrtcConfigured: Boolean(settings.webrtcWssUrl && settings.sipDomain),
    ringTimeoutSeconds: settings.ringTimeoutSeconds,
    maxAttempts: settings.maxAttempts,
  }
}

/** Dials the next due lead, or returns null when none is due right now (see the campaign lead summary). */
export async function startAutomaticAttempt(user: AuthUser, campaignId: string) {
  const customerId = user.customerId!
  const campaign = await getCampaign(customerId, campaignId)
  if (!campaign) throw new AppError(404, 'NOT_FOUND', 'Campaign not found')
  if (campaign.status !== 'active') throw new AppError(409, 'CAMPAIGN_PAUSED', 'Campanha pausada')
  const { provider, extension } = await beginOutbound(user)
  if (!extension) throw new AppError(409, 'NO_EXTENSION', 'Informe o seu ramal antes de discar')

  const lead = await reserveNextLead(customerId, campaignId, user.id)
  if (!lead) return null
  const attempt = await originate(user, provider, {
    phone: lead.phoneDigits,
    extension,
    campaignId,
    leadId: lead.id,
  })
  return present(customerId, attempt)
}

export async function startManualAttempt(user: AuthUser, rawPhone: string, campaignId: string | null) {
  const phone = requireNationalPhone(rawPhone)
  const { provider, extension, customerId } = await beginOutbound(user)
  if (!extension) throw new AppError(409, 'NO_EXTENSION', 'Informe o seu ramal antes de discar')
  const attempt = await originate(user, provider, { phone, extension, campaignId, leadId: null })
  return present(customerId, attempt)
}

/** Rings two external numbers and bridges them. Each conversation uses two trunk channels. */
export async function startBridgeAttempt(user: AuthUser, rawPhone: string, rawOtherPhone: string) {
  const phone = requireNationalPhone(rawPhone)
  const otherPhone = requireNationalPhone(rawOtherPhone)
  if (phone === otherPhone) throw new AppError(400, 'VALIDATION_ERROR', 'Informe dois números diferentes')
  const { customerId, provider } = await beginOutbound(user)
  const attempt = await originate(user, provider, {
    phone,
    extension: otherPhone,
    campaignId: null,
    leadId: null,
    connectPhone: otherPhone,
  })
  return present(customerId, attempt)
}

export async function transferAttempt(user: AuthUser, attemptId: string, extension: string) {
  const customerId = user.customerId!
  const attempt = await ownAttempt(user, attemptId)
  if (attempt.status !== 'answered') {
    throw new AppError(409, 'ATTEMPT_NOT_ANSWERED', 'A transferência só pode ocorrer com a chamada atendida')
  }
  const provider = await requireProvider(customerId)
  if (!provider.transfer) throw new AppError(409, 'TRANSFER_UNSUPPORTED', 'Este provedor não transfere chamadas')
  await provider.transfer(target(attempt), extension)
  const now = new Date()
  await pool.query(
    `UPDATE bdr_dial_attempts SET operator_extension = :extension, updated_at = :now WHERE id = :id`,
    { id: attempt.id, extension, now },
  )
  return present(customerId, (await loadAttempt(customerId, attempt.id))!)
}

export async function scheduleCampaignLead(user: AuthUser, campaignId: string, rawPhone: string, at: Date) {
  if (Number.isNaN(at.getTime()) || at.getTime() <= Date.now()) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Escolha um horário futuro')
  }
  const phone = requireNationalPhone(rawPhone)
  const customerId = user.customerId!
  const campaign = await getCampaign(customerId, campaignId)
  if (!campaign) throw new AppError(404, 'NOT_FOUND', 'Campaign not found')
  const [rows] = await pool.query<Row[]>(
    `SELECT id, status FROM bdr_leads
     WHERE customer_id = :customerId AND campaign_id = :campaignId AND phone = :phone AND deleted_at IS NULL
     LIMIT 1`,
    { customerId, campaignId, phone },
  )
  const lead = rows[0]
  if (!lead) throw new AppError(404, 'NOT_FOUND', 'Lead não encontrado nesta campanha')
  const status = String(lead.status)
  if (status === 'dialing' || status === 'in_call') {
    throw new AppError(409, 'LEAD_BUSY', 'Este lead já está em ligação')
  }
  await settleLead(customerId, String(lead.id), {
    status: 'queued',
    lastOutcome: 'scheduled',
    nextAttemptAt: at,
  })
  return getLead(customerId, String(lead.id))
}

export async function listOpenInbound(customerId: string) {
  const [rows] = await pool.query<Row[]>(
    `SELECT id, phone, operator_extension, status, started_at
     FROM bdr_dial_attempts
     WHERE customer_id = :customerId AND direction = 'inbound' AND status IN ('ringing', 'answered')
     ORDER BY started_at DESC
     LIMIT 20`,
    { customerId },
  )
  return rows.map((row) => ({
    id: String(row.id),
    phone: String(row.phone),
    extension: String(row.operator_extension),
    status: String(row.status),
    startedAt: new Date(String(row.started_at)).toISOString(),
  }))
}

/** Advances a ringing attempt from the PABX's live view; called by the operator console while it waits. */
export async function pollAttempt(user: AuthUser, attemptId: string) {
  const customerId = user.customerId!
  const attempt = await ownAttempt(user, attemptId)
  if (attempt.status !== 'ringing') return present(customerId, attempt)

  const provider = await requireProvider(customerId)
  const settings = await getTelephonySettings(customerId)
  const live = await provider.liveState(target(attempt))
  const leadElapsedMs = Date.now() - attempt.startedAt.getTime()
  const now = new Date()

  if (live.state === 'talking') {
    await pool.query(
      `UPDATE bdr_dial_attempts
       SET status = 'answered', answered_at = :now, provider_seen = 1,
           provider_call_id = COALESCE(:providerCallId, provider_call_id), updated_at = :now
       WHERE id = :id AND status = 'ringing'`,
      { id: attempt.id, providerCallId: live.providerCallId ?? null, now },
    )
    if (attempt.leadId) await markLeadInCall(customerId, attempt.leadId)
  } else if (live.state === 'ringing') {
    await pool.query(
      `UPDATE bdr_dial_attempts
       SET provider_seen = 1, provider_call_id = COALESCE(:providerCallId, provider_call_id), updated_at = :now
       WHERE id = :id`,
      { id: attempt.id, providerCallId: live.providerCallId ?? null, now },
    )
    const sinceMs = live.ringingSince ? new Date(live.ringingSince).getTime() : attempt.startedAt.getTime()
    const ringElapsedMs = Date.now() - (Number.isFinite(sinceMs) ? sinceMs : attempt.startedAt.getTime())
    if (ringElapsedMs > settings.ringTimeoutSeconds * 1000) {
      await provider.hangup(target(attempt)).catch(() => null)
      await endAttempt(attempt, 'no_answer', customerId)
    }
  } else if (attempt.providerSeen || leadElapsedMs > SETUP_GRACE_MS) {
    const outcome = (await provider.finalOutcome(target(attempt)).catch(() => null)) ?? 'no_answer'
    await endAttempt(attempt, outcome === 'answered' ? 'abandoned' : outcome, customerId)
  } else {
    await pool.query('UPDATE bdr_dial_attempts SET updated_at = :now WHERE id = :id', { id: attempt.id, now })
  }

  return present(customerId, (await loadAttempt(customerId, attempt.id))!)
}

export async function hangupAttempt(user: AuthUser, attemptId: string) {
  const customerId = user.customerId!
  const attempt = await ownAttempt(user, attemptId)
  if (attempt.status === 'ended') return present(customerId, attempt)
  const provider = await requireProvider(customerId)
  await provider.hangup(target(attempt)).catch(() => null)
  if (attempt.status === 'ringing') {
    await endAttempt(attempt, 'cancelled', customerId)
  } else {
    await pool.query(
      `UPDATE bdr_dial_attempts SET ended_at = COALESCE(ended_at, :now), updated_at = :now WHERE id = :id`,
      { id: attempt.id, now: new Date() },
    )
  }
  return present(customerId, (await loadAttempt(customerId, attempt.id))!)
}

/** Operator reclassifies a connected attempt that turned out not to be a person (e.g. carrier voicemail). */
export async function markAttemptOutcome(user: AuthUser, attemptId: string, outcome: OperatorOutcome) {
  if (!OPERATOR_OUTCOMES.includes(outcome)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid outcome')
  const customerId = user.customerId!
  const attempt = await ownAttempt(user, attemptId)
  if (attempt.status === 'ended') throw new AppError(409, 'ATTEMPT_ENDED', 'Attempt already ended')
  const provider = await requireProvider(customerId)
  await provider.hangup(target(attempt)).catch(() => null)
  await endAttempt(attempt, outcome, customerId)
  return present(customerId, (await loadAttempt(customerId, attempt.id))!)
}

/**
 * Checks that an attempt can become a saved call. Runs before the call row is inserted so a rejected save leaves
 * no orphan call behind.
 */
export async function attemptReadyForCall(user: AuthUser, attemptId: string) {
  const attempt = await ownAttempt(user, attemptId)
  if (attempt.callId) throw new AppError(409, 'ATTEMPT_ALREADY_SAVED', 'This attempt already has a saved call')
  if (attempt.status !== 'answered') throw new AppError(409, 'ATTEMPT_NOT_ANSWERED', 'Attempt was not answered')
  return attempt
}

/** Links the saved call to its attempt, closes the attempt, settles the lead, and queues the recording download. */
export async function finalizeAttemptForCall(
  user: AuthUser,
  attempt: Attempt,
  callId: string,
  disposition: string | null,
  callbackAt: Date | null,
) {
  const customerId = user.customerId!
  const provider = await resolveProvider(customerId)
  if (provider && !attempt.endedAt) await provider.hangup(target(attempt)).catch(() => null)
  const now = new Date()
  const recordingStatus = provider?.supportsRecording ? 'pending' : 'missing'
  await pool.query(
    `UPDATE bdr_dial_attempts
     SET status = 'ended', outcome = COALESCE(outcome, 'answered'), call_id = :callId,
         ended_at = COALESCE(ended_at, :now), recording_status = :recordingStatus, updated_at = :now
     WHERE id = :id`,
    { id: attempt.id, callId, recordingStatus, now },
  )
  if (attempt.leadId) {
    const requeue = disposition != null && REQUEUE_DISPOSITIONS.has(disposition)
    let status: LeadStatus = 'done'
    let nextAttemptAt: Date | null = null
    if (requeue) {
      const settings = await getTelephonySettings(customerId)
      status = 'queued'
      nextAttemptAt = callbackAt ?? new Date(Date.now() + settings.retryNoAnswerMinutes * 60_000)
    }
    await settleLead(customerId, attempt.leadId, {
      status,
      lastOutcome: disposition ?? 'answered',
      nextAttemptAt,
      refundAttempt: disposition === 'callback',
    })
  }
  if (recordingStatus === 'pending') scheduleRecordingFetch(attempt.id)
}

export async function listAttempts(
  customerId: string,
  query: { page: number; pageSize: number; campaignId?: string; leadId?: string; outcome?: string },
) {
  const filters = ['customer_id = :customerId']
  const params: Record<string, string | number> = { customerId }
  if (query.campaignId) {
    filters.push('campaign_id = :campaignId')
    params.campaignId = query.campaignId
  }
  if (query.leadId) {
    filters.push('lead_id = :leadId')
    params.leadId = query.leadId
  }
  if (query.outcome) {
    filters.push('outcome = :outcome')
    params.outcome = query.outcome
  }
  const where = filters.join(' AND ')
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM bdr_dial_attempts WHERE ${where}`,
    params,
  )
  const [rows] = await pool.query<Row[]>(
    `SELECT a.*, l.company AS lead_company, l.contact_name AS lead_contact, l.phone_display AS lead_phone
     FROM bdr_dial_attempts a
     LEFT JOIN bdr_leads l ON l.id = a.lead_id
     WHERE ${filters.map((filter) => `a.${filter}`).join(' AND ')}
     ORDER BY a.started_at DESC
     LIMIT :limit OFFSET :offset`,
    { ...params, limit: query.pageSize, offset: (query.page - 1) * query.pageSize },
  )
  return {
    rows: rows.map((row) => {
      const attempt = attemptFromRow(row)
      return {
        id: attempt.id,
        campaignId: attempt.campaignId,
        leadId: attempt.leadId,
        callId: attempt.callId,
        phone: row.lead_phone == null ? attempt.phone : String(row.lead_phone),
        company: row.lead_company == null ? null : String(row.lead_company),
        leadName: row.lead_contact == null ? null : String(row.lead_contact),
        status: attempt.status,
        outcome: attempt.outcome,
        direction: attempt.direction,
        startedAt: attempt.startedAt.toISOString(),
        answeredAt: attempt.answeredAt?.toISOString() ?? null,
        endedAt: attempt.endedAt?.toISOString() ?? null,
        recordingStatus: attempt.recordingStatus,
      }
    }),
    total: Number(countRows[0]?.total ?? 0),
  }
}
