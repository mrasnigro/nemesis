/**
 * In-memory BDR data store for the local prototype.
 * @typedef {import('../data/seeds.js').SEED_DIAL_POOL[number]} Lead
 */

import {
  SEED_CAMPAIGNS,
  SEED_DIAL_POOL,
  SEED_HISTORY,
  SEED_MEETINGS,
  SEED_METRICS,
  SEED_OBJECTION_CATEGORIES,
} from '../data/seeds.js'

function clone(value) {
  return structuredClone(value)
}

let campaigns = clone(SEED_CAMPAIGNS)
let history = clone(SEED_HISTORY)
let meetings = clone(SEED_MEETINGS)
let metrics = clone(SEED_METRICS)

export const mockBdrRepository = {
  async listCampaigns() {
    return clone(campaigns)
  },

  /** Live rule: campaignId does not filter the dial pool */
  async listDialPool(_campaignId) {
    return clone(SEED_DIAL_POOL)
  },

  async pickNextLead(_campaignId) {
    const pool = SEED_DIAL_POOL
    const lead = pool[Math.floor(Math.random() * pool.length)]
    return clone(lead)
  },

  async listHistory() {
    return clone(history)
  },

  async saveHistory(row) {
    history = [row, ...history]
  },

  async listMeetings() {
    return clone(meetings)
  },

  async saveMeeting(meeting) {
    meetings = [meeting, ...meetings.filter((m) => m.id !== meeting.id)]
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
    history = clone(SEED_HISTORY)
    meetings = clone(SEED_MEETINGS)
    metrics = clone(SEED_METRICS)
  },
}

export default mockBdrRepository
