import { SEED_DIAL_POOL, SEED_OBJECTION_CATEGORIES } from '../data/seeds.js'
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
    throw new Error(body?.error?.message || `Request failed (${response.status})`)
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

const apiBdrRepository = {
  async listCampaigns() {
    return listAll('/api/modules/bdr/campaigns')
  },

  /** Campaign choice does not filter the dial pool. */
  async listDialPool() {
    return clone(SEED_DIAL_POOL)
  },

  async pickNextLead() {
    const lead = SEED_DIAL_POOL[Math.floor(Math.random() * SEED_DIAL_POOL.length)]
    return clone(lead)
  },

  async listHistory() {
    return listAll('/api/modules/bdr/calls')
  },

  async saveHistory(row) {
    const payload = await request('/api/modules/bdr/calls', {
      method: 'POST',
      body: JSON.stringify(row),
    })
    return payload.data
  },

  async listMeetings() {
    return listAll('/api/modules/bdr/meetings')
  },

  async saveMeeting(meeting) {
    const payload = await request('/api/modules/bdr/meetings', {
      method: 'POST',
      body: JSON.stringify(meeting),
    })
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
