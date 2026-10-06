import {
  PLATFORM_API_BASE,
  platformDownload,
  platformRequest,
  platformUpload,
} from '../../../../core/api/platformClient.js'

const BASE = '/api/modules/webinar'
const PUBLIC = '/api/public/webinar'

const unwrap = (payload) => payload.data

/**
 * Webinar on the platform API: same session, same database, same customer scoping as the other modules.
 */
export const webinarApi = {
  /** The plan, its limits and where the subscription stands. Payments come only for customer administrators. */
  subscription: () => platformRequest(`${BASE}/subscription`).then(unwrap),
  /** The plans on offer, to compare with the current one. */
  plans: () => platformRequest(`${BASE}/plans`).then(unwrap),

  stats: ({ mine = false } = {}) => platformRequest(`${BASE}/stats`, { query: { mine } }).then(unwrap),

  listWebinars: (query) => platformRequest(`${BASE}/webinars`, { query }),
  getWebinar: (id) => platformRequest(`${BASE}/webinars/${id}`).then(unwrap),
  createWebinar: (body) => platformRequest(`${BASE}/webinars`, { method: 'POST', body }).then(unwrap),
  updateWebinar: (id, body) => platformRequest(`${BASE}/webinars/${id}`, { method: 'PATCH', body }).then(unwrap),
  setStatus: (id, status) =>
    platformRequest(`${BASE}/webinars/${id}/status`, { method: 'POST', body: { status } }).then(unwrap),
  deleteWebinar: (id) => platformRequest(`${BASE}/webinars/${id}`, { method: 'DELETE' }),

  listAccessCodes: (id) => platformRequest(`${BASE}/webinars/${id}/access-codes`).then(unwrap),
  createAccessCode: (id, body) =>
    platformRequest(`${BASE}/webinars/${id}/access-codes`, { method: 'POST', body }).then(unwrap),
  deactivateAccessCode: (id, codeId) =>
    platformRequest(`${BASE}/webinars/${id}/access-codes/${codeId}`, { method: 'DELETE' }),

  listLeads: (id, query) => platformRequest(`${BASE}/webinars/${id}/leads`, { query }),
  leadStats: (id) => platformRequest(`${BASE}/webinars/${id}/leads/stats`).then(unwrap),
  updateLead: (id, leadId, status) =>
    platformRequest(`${BASE}/webinars/${id}/leads/${leadId}`, { method: 'PATCH', body: { status } }).then(unwrap),
  deleteLead: (id, leadId) => platformRequest(`${BASE}/webinars/${id}/leads/${leadId}`, { method: 'DELETE' }),
  exportLeads: (id) => platformDownload(`${BASE}/webinars/${id}/leads/export.csv`, `leads-webinar-${id}.csv`),

  listChat: (id, query) => platformRequest(`${BASE}/webinars/${id}/chat`, { query }).then(unwrap),
  postChat: (id, message) =>
    platformRequest(`${BASE}/webinars/${id}/chat`, { method: 'POST', body: { message } }).then(unwrap),

  /** Signal and audience of the live broadcast (real numbers from the relay). */
  streamState: (id, { signal } = {}) => platformRequest(`${BASE}/webinars/${id}/stream`, { signal }).then(unwrap),
  /** One piece of the presenter's recording. `header` marks the first piece of a recording. */
  sendChunk: (id, blob, { header = false, signal } = {}) =>
    platformUpload(`${BASE}/webinars/${id}/stream/chunk`, blob, { query: header ? { header: 1 } : undefined, signal }),
}

/** Pages a visitor opens without an account. */
export const publicWebinarApi = {
  openCode: (code) => platformRequest(`${PUBLIC}/access`, { method: 'POST', body: { code } }).then(unwrap),
  register: (body) => platformRequest(`${PUBLIC}/register`, { method: 'POST', body }).then(unwrap),
  session: (leadId) => platformRequest(`${PUBLIC}/leads/${leadId}`).then(unwrap),
  attend: (leadId) => platformRequest(`${PUBLIC}/leads/${leadId}/attend`, { method: 'POST' }),
  listChat: (leadId, query) => platformRequest(`${PUBLIC}/leads/${leadId}/chat`, { query }).then(unwrap),
  postChat: (leadId, message) =>
    platformRequest(`${PUBLIC}/leads/${leadId}/chat`, { method: 'POST', body: { message } }).then(unwrap),
  /** Address the player streams from; the lead id in it is the visitor's key. */
  streamUrl: (leadId) => `${PLATFORM_API_BASE}${PUBLIC}/leads/${leadId}/stream`,
}
