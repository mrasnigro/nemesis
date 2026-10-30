import { PLATFORM_API_BASE, PlatformApiError, platformRequest } from '../../../core/api/platformClient.js'
import { BdrApiError } from './bdrErrors.js'

async function request(path, options = {}) {
  try {
    return await platformRequest(path, options)
  } catch (error) {
    if (error instanceof PlatformApiError) {
      throw new BdrApiError(error.message, { status: error.status, code: error.code })
    }
    throw error
  }
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
  return { ...row, recordingUrl: row.recordingUrl ? `${PLATFORM_API_BASE}${row.recordingUrl}` : null }
}

/** History rows are displayed in the operator's locale, derived from the server's start time. */
function presentCall(row) {
  const call = withRecordingUrl(row)
  if (!call) return call
  return { ...call, timestamp: call.startedAt ? new Date(call.startedAt).toLocaleString('pt-BR') : '' }
}

function post(path, body) {
  return request(path, { method: 'POST', body: body ?? {} })
}

export const bdrRepository = {
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

  async getTelephonySettings() {
    const payload = await request('/api/modules/bdr/telephony/settings')
    return payload.data
  },

  async saveTelephonySettings(settings) {
    const payload = await request('/api/modules/bdr/telephony/settings', {
      method: 'PUT',
      body: settings,
    })
    return payload.data
  },

  async setExtension(extension, sipPassword) {
    const payload = await request('/api/modules/bdr/dialer/extension', {
      method: 'PUT',
      body: { extension, ...(sipPassword ? { sipPassword } : {}) },
    })
    return payload.data
  },

  async getWebRtcConfig() {
    const payload = await request('/api/modules/bdr/dialer/webrtc-config')
    return payload.data
  },

  /** `{ attempt }` when a lead is ringing, or `{ attempt: null, queue }` (lead summary) when none is due now. */
  async startAttempt(campaignId) {
    const payload = await post('/api/modules/bdr/dialer/attempts', { campaignId })
    return { attempt: payload.data ?? null, queue: payload.queue ?? null }
  },

  async startManualAttempt(phone, campaignId) {
    const payload = await post('/api/modules/bdr/dialer/attempts/manual', { phone, campaignId })
    return payload.data
  },

  async startBridgeAttempt(phone, otherPhone) {
    const payload = await post('/api/modules/bdr/dialer/attempts/bridge', { phone, otherPhone })
    return payload.data
  },

  async transferAttempt(attemptId, extension) {
    const payload = await post(`/api/modules/bdr/dialer/attempts/${attemptId}/transfer`, { extension })
    return payload.data
  },

  async listDialAttempts() {
    const payload = await request('/api/modules/bdr/dialer/attempts?page=1&pageSize=20')
    return payload.data || []
  },

  async listInbound() {
    const payload = await request('/api/modules/bdr/dialer/inbound')
    return payload.data || []
  },

  async scheduleLead(campaignId, phone, at) {
    const payload = await post(`/api/modules/bdr/campaigns/${campaignId}/schedule`, { phone, at })
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
    return (await listAll('/api/modules/bdr/calls')).map(presentCall)
  },

  /** One call with its summary and, when the recording was transcribed, the transcript. */
  async getCall(id) {
    const payload = await request(`/api/modules/bdr/calls/${id}`)
    return presentCall(payload.data)
  },

  async saveHistory(row) {
    const payload = await post('/api/modules/bdr/calls', row)
    return presentCall(payload.data)
  },

  async listMeetings() {
    return (await listAll('/api/modules/bdr/meetings')).map(withRecordingUrl)
  },

  async saveMeeting(meeting) {
    const payload = await post('/api/modules/bdr/meetings', meeting)
    return withRecordingUrl(payload.data)
  },

  async updateMeeting(id, patch) {
    const payload = await request(`/api/modules/bdr/meetings/${id}`, {
      method: 'PATCH',
      body: patch,
    })
    return withRecordingUrl(payload.data)
  },

  async removeMeeting(id) {
    await request(`/api/modules/bdr/meetings/${id}`, { method: 'DELETE' })
  },

  async getMetrics() {
    const payload = await request('/api/modules/bdr/metrics')
    return payload.data
  },
}
