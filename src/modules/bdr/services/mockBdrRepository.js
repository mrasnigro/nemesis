/**
 * In-memory BDR data store for the local prototype (VITE_BDR_DATA=mock).
 * The dialer half simulates a PABX so the operator console runs the same attempt loop as with the API.
 */

import {
  SEED_CAMPAIGNS,
  SEED_DIAL_POOL,
  SEED_HISTORY,
  SEED_MEETINGS,
  SEED_METRICS,
  SEED_OBJECTION_CATEGORIES,
} from '../data/seeds.js'
import { BdrApiError } from './bdrErrors.js'
import { formatPhone, normalizePhone } from './phone.js'

function clone(value) {
  return structuredClone(value)
}

const MOCK_MAX_ATTEMPTS = 3
const MOCK_RETRY_MS = 20_000
const MOCK_RING_TIMEOUT_MS = 30_000
const OUTCOME_WEIGHTS = [
  ['answered', 40],
  ['no_answer', 30],
  ['busy', 20],
  ['failed', 10],
]

function pickOutcome() {
  const total = OUTCOME_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = Math.random() * total
  for (const [outcome, weight] of OUTCOME_WEIGHTS) {
    roll -= weight
    if (roll <= 0) return outcome
  }
  return 'no_answer'
}

function seedLeads() {
  return SEED_CAMPAIGNS.flatMap((campaign) =>
    SEED_DIAL_POOL.map((lead) => ({
      ...clone(lead),
      id: `${campaign.id}-${lead.id}`,
      campaignId: campaign.id,
      phoneDigits: normalizePhone(lead.phone),
      status: 'queued',
      attempts: 0,
      lastOutcome: null,
      nextAttemptAt: null,
    })),
  )
}

let campaigns = clone(SEED_CAMPAIGNS)
const seedHistory = () => SEED_HISTORY.map((row) => ({ ...clone(row), recordingUrl: null }))

let history = seedHistory()
let meetings = clone(SEED_MEETINGS)
let metrics = clone(SEED_METRICS)
let leads = seedLeads()
let attempts = new Map()
let extension = '1001'

function findLead(id) {
  return leads.find((lead) => lead.id === id) || null
}

function settleLead(lead, outcome) {
  lead.lastOutcome = outcome
  if (outcome === 'cancelled') {
    lead.status = 'queued'
    lead.attempts = Math.max(0, lead.attempts - 1)
    lead.nextAttemptAt = null
    return
  }
  if (lead.attempts >= MOCK_MAX_ATTEMPTS) {
    lead.status = 'failed'
    lead.nextAttemptAt = null
    return
  }
  lead.status = 'queued'
  lead.nextAttemptAt = Date.now() + MOCK_RETRY_MS
}

function endAttempt(attempt, outcome) {
  attempt.status = 'ended'
  attempt.outcome = outcome
  attempt.endedAt = new Date().toISOString()
  const lead = attempt.leadId ? findLead(attempt.leadId) : null
  if (lead) settleLead(lead, outcome)
}

function present(attempt) {
  const lead = attempt.leadId ? findLead(attempt.leadId) : null
  return {
    id: attempt.id,
    status: attempt.status,
    outcome: attempt.outcome,
    phone: attempt.phone,
    campaignId: attempt.campaignId,
    startedAt: new Date(attempt.startedAtMs).toISOString(),
    answeredAt: attempt.answeredAt,
    endedAt: attempt.endedAt,
    lead: lead ? clone(lead) : null,
  }
}

function originate({ phone, campaignId, leadId }) {
  for (const open of attempts.values()) {
    if (open.status === 'ringing') endAttempt(open, 'cancelled')
  }
  const plan = pickOutcome()
  const attempt = {
    id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    phone,
    campaignId,
    leadId,
    plan,
    ringMs: plan === 'busy' ? 2_000 : 3_000 + Math.random() * 5_000,
    startedAtMs: Date.now(),
    status: 'ringing',
    outcome: null,
    answeredAt: null,
    endedAt: null,
  }
  attempts.set(attempt.id, attempt)
  return present(attempt)
}

function refreshCampaignCounts(campaignId) {
  const own = leads.filter((lead) => lead.campaignId === campaignId)
  campaigns = campaigns.map((campaign) => {
    if (campaign.id !== campaignId) return campaign
    const completed = own.filter((lead) => lead.status === 'done' || lead.status === 'failed').length
    return {
      ...campaign,
      leads: own.length,
      completed,
      progress: own.length ? Math.round((completed / own.length) * 100) : 0,
    }
  })
}

export const mockBdrRepository = {
  async listCampaigns() {
    return clone(campaigns)
  },

  async createCampaign(input) {
    const campaign = { id: `c_${Date.now()}`, status: 'active', leads: 0, completed: 0, progress: 0, ...input }
    campaigns = [...campaigns, campaign]
    return clone(campaign)
  },

  async importLeads(campaignId, rows, source = 'import') {
    const invalid = []
    let inserted = 0
    let duplicates = 0
    rows.forEach((row, index) => {
      const digits = normalizePhone(row.phone)
      if (!digits) {
        invalid.push({ index, phone: String(row.phone ?? '') })
        return
      }
      if (leads.some((lead) => lead.campaignId === campaignId && lead.phoneDigits === digits)) {
        duplicates += 1
        return
      }
      leads.push({
        email: '',
        address: '',
        city: '',
        state: '',
        cep: '',
        cnpj: '',
        partnerCpf: '',
        ...row,
        id: `lead_${Date.now()}_${index}`,
        campaignId,
        source,
        phone: formatPhone(digits),
        phoneDigits: digits,
        partnerName: row.partnerName || row.name || '',
        identifier: row.company || '',
        socialReason: row.company || '',
        protocol: `L${Date.now()}${index}`,
        status: 'queued',
        attempts: 0,
        lastOutcome: null,
        nextAttemptAt: null,
      })
      inserted += 1
    })
    refreshCampaignCounts(campaignId)
    return { inserted, duplicates, invalid, summary: await this.leadSummary(campaignId) }
  },

  async leadSummary(campaignId) {
    const own = leads.filter((lead) => lead.campaignId === campaignId)
    const now = Date.now()
    return {
      total: own.length,
      ready: own.filter((l) => l.status === 'queued' && (!l.nextAttemptAt || l.nextAttemptAt <= now)).length,
      scheduled: own.filter((l) => l.status === 'queued' && l.nextAttemptAt > now).length,
      active: own.filter((l) => l.status === 'dialing' || l.status === 'in_call').length,
      done: own.filter((l) => l.status === 'done').length,
      exhausted: own.filter((l) => l.status === 'failed').length,
    }
  },

  async getDialerConfig() {
    return {
      provider: 'simulated',
      configured: true,
      extension,
      ringTimeoutSeconds: MOCK_RING_TIMEOUT_MS / 1000,
      maxAttempts: MOCK_MAX_ATTEMPTS,
    }
  },

  async setExtension(next) {
    extension = String(next).trim()
    return this.getDialerConfig()
  },

  async startAttempt(campaignId) {
    const campaign = campaigns.find((c) => c.id === campaignId)
    if (!campaign) throw new BdrApiError('Campaign not found', { status: 404, code: 'NOT_FOUND' })
    if (campaign.status !== 'active') {
      throw new BdrApiError('Campanha pausada', { status: 409, code: 'CAMPAIGN_PAUSED' })
    }
    const now = Date.now()
    const lead = leads
      .filter((l) => l.campaignId === campaignId && l.status === 'queued')
      .filter((l) => !l.nextAttemptAt || l.nextAttemptAt <= now)
      .sort((a, b) => (a.nextAttemptAt || 0) - (b.nextAttemptAt || 0))[0]
    if (!lead) {
      throw new BdrApiError('Nenhum lead disponível nesta campanha agora', {
        status: 404,
        code: 'QUEUE_EMPTY',
      })
    }
    lead.status = 'dialing'
    lead.attempts += 1
    return originate({ phone: lead.phoneDigits, campaignId, leadId: lead.id })
  },

  async startManualAttempt(phone, campaignId) {
    const digits = normalizePhone(phone)
    if (!digits) {
      throw new BdrApiError('Telefone inválido (use DDD + número)', {
        status: 400,
        code: 'VALIDATION_ERROR',
      })
    }
    return originate({ phone: digits, campaignId: campaignId ?? null, leadId: null })
  },

  async pollAttempt(attemptId) {
    const attempt = attempts.get(attemptId)
    if (!attempt) throw new BdrApiError('Attempt not found', { status: 404, code: 'NOT_FOUND' })
    if (attempt.status !== 'ringing') return present(attempt)
    const elapsed = Date.now() - attempt.startedAtMs
    if (elapsed < attempt.ringMs) return present(attempt)
    if (attempt.plan === 'answered') {
      attempt.status = 'answered'
      attempt.answeredAt = new Date().toISOString()
      const lead = attempt.leadId ? findLead(attempt.leadId) : null
      if (lead) lead.status = 'in_call'
    } else {
      endAttempt(attempt, attempt.plan)
    }
    return present(attempt)
  },

  async hangupAttempt(attemptId) {
    const attempt = attempts.get(attemptId)
    if (!attempt) return null
    if (attempt.status === 'ringing') endAttempt(attempt, 'cancelled')
    return present(attempt)
  },

  async markAttemptOutcome(attemptId, outcome) {
    const attempt = attempts.get(attemptId)
    if (!attempt) throw new BdrApiError('Attempt not found', { status: 404, code: 'NOT_FOUND' })
    endAttempt(attempt, outcome)
    return present(attempt)
  },

  async listHistory() {
    return clone(history)
  },

  async saveHistory(row) {
    const attempt = row.attemptId ? attempts.get(row.attemptId) : null
    if (attempt) {
      attempt.status = 'ended'
      attempt.outcome = 'answered'
      attempt.endedAt = new Date().toISOString()
      const lead = attempt.leadId ? findLead(attempt.leadId) : null
      if (lead) {
        const requeue = row.qualificationId === 'callback' || row.qualificationId === 'no_contact'
        lead.status = requeue ? 'queued' : 'done'
        lead.lastOutcome = row.qualificationId || 'answered'
        lead.nextAttemptAt = requeue
          ? row.callbackAt
            ? new Date(row.callbackAt).getTime()
            : Date.now() + MOCK_RETRY_MS
          : null
        refreshCampaignCounts(lead.campaignId)
      }
    }
    const saved = { ...row, recordingUrl: null, recordingStatus: 'missing' }
    history = [saved, ...history]
    return clone(saved)
  },

  async listMeetings() {
    return clone(meetings)
  },

  async saveMeeting(meeting) {
    meetings = [meeting, ...meetings.filter((m) => m.id !== meeting.id)]
    return clone(meeting)
  },

  async updateMeeting(id, patch) {
    meetings = meetings.map((m) => (m.id === id ? { ...m, ...patch } : m))
    return meetings.find((m) => m.id === id) || null
  },

  async removeMeeting(id) {
    meetings = meetings.filter((m) => m.id !== id)
  },

  async getMetrics() {
    return clone(metrics)
  },

  async setMetrics(next) {
    metrics = { ...metrics, ...next }
  },

  async getObjections() {
    return clone(SEED_OBJECTION_CATEGORIES)
  },

  /** Reset in-memory store (tests / demo) */
  __reset() {
    campaigns = clone(SEED_CAMPAIGNS)
    history = seedHistory()
    meetings = clone(SEED_MEETINGS)
    metrics = clone(SEED_METRICS)
    leads = seedLeads()
    attempts = new Map()
    extension = '1001'
  },
}

export default mockBdrRepository
