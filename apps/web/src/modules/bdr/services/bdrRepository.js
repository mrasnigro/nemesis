import { SEED_OBJECTION_CATEGORIES } from '../data/seeds.js'
import { BdrApiError } from './bdrErrors.js'
import { mockBdrRepository } from './mockBdrRepository.js'

const BASE = '/platform-api'

export const bdrDataMode = import.meta.env.VITE_BDR_DATA === 'api' ? 'api' : 'mock'

function clone(value) {
  return structuredClone(value)
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Dev-User': 'imp',
      ...(options.headers || {}),
    },
    ...options,
  })
  if (response.status === 204) return null
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new BdrApiError(body?.error?.message || `Request failed (${response.status})`, {
      status: response.status,
      code: body?.error?.code,
    })
  }
  return body
}

async function listAll(path) {
  const pageSize = 100
  let page = 1
  let total = Infinity
  const rows = []
  while (rows.length < total) {
    const payload = await request(`${path}?page=${page}&pageSize=${pageSize}`)
    rows.push(...(payload.data || []))
    total = payload.page?.total ?? rows.length
    if (!(payload.data || []).length) break
    page += 1
  }
  return rows
}

function withRecordingUrl(row) {
  if (!row) return row
  return { ...row, recordingUrl: row.recordingUrl ? `${BASE}${row.recordingUrl}` : null }
}

function post(path, body) {
  return request(path, { method: 'POST', body: JSON.stringify(body ?? {}) })
}

const apiBdrRepository = {
  async listCampaigns() {
    return listAll('/api/modules/bdr/campaigns')
  },

  async createCampaign(input) {
    const payload = await post('/api/modules/bdr/campaigns', input)
    return payload.data
  },

  async importLeads(campaignId, leads, source = 'import') {
    const payload = await post(`/api/modules/bdr/campaigns/${campaignId}/leads`, { leads, source })
    return payload.data
  },

  async leadSummary(campaignId) {
    const payload = await request(`/api/modules/bdr/campaigns/${campaignId}/leads/summary`)
    return payload.data
  },

  async getDialerConfig() {
    const payload = await request('/api/modules/bdr/dialer/config')
    return payload.data
  },

  async setExtension(extension) {
    const payload = await request('/api/modules/bdr/dialer/extension', {
      method: 'PUT',
      body: JSON.stringify({ extension }),
    })
    return payload.data
  },

  async startAttempt(campaignId) {
    const payload = await post('/api/modules/bdr/dialer/attempts', { campaignId })
    return payload.data
  },

  async startManualAttempt(phone, campaignId) {
    const payload = await post('/api/modules/bdr/dialer/attempts/manual', { phone, campaignId })
    return payload.data
  },

  async pollAttempt(attemptId) {
    const payload = await request(`/api/modules/bdr/dialer/attempts/${attemptId}`)
    return payload.data
  },

  async hangupAttempt(attemptId) {
    const payload = await post(`/api/modules/bdr/dialer/attempts/${attemptId}/hangup`)
    return payload.data
  },

  async markAttemptOutcome(attemptId, outcome) {
    const payload = await post(`/api/modules/bdr/dialer/attempts/${attemptId}/outcome`, { outcome })
    return payload.data
  },

  async listHistory() {
    return (await listAll('/api/modules/bdr/calls')).map(withRecordingUrl)
  },

  async saveHistory(row) {
    const payload = await post('/api/modules/bdr/calls', row)
    return withRecordingUrl(payload.data)
  },

  async listMeetings() {
    return listAll('/api/modules/bdr/meetings')
  },

  async saveMeeting(meeting) {
    const payload = await post('/api/modules/bdr/meetings', meeting)
    return payload.data
  },

  async updateMeeting(id, patch) {
    const payload = await request(`/api/modules/bdr/meetings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    return payload.data
  },

  async removeMeeting(id) {
    await request(`/api/modules/bdr/meetings/${id}`, { method: 'DELETE' })
  },

  async getMetrics() {
    const payload = await request('/api/modules/bdr/metrics')
    return payload.data
  },

  async setMetrics(next) {
    return next
  },

  async getObjections() {
    return clone(SEED_OBJECTION_CATEGORIES)
  },
}

export const bdrRepository = bdrDataMode === 'api' ? apiBdrRepository : mockBdrRepository
