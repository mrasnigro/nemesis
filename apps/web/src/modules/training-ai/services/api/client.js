import { PLATFORM_API_BASE, platformListAll, platformRequest } from '../../../../core/api/platformClient.js'

const BASE = '/api/modules/training-ai'

/** Every call goes to the platform API. Scores, replies and transcripts are produced and stored there. */
export const trainingApi = {
  getStatus: () => platformRequest(`${BASE}/status`).then((payload) => payload.data),
  getMetrics: () => platformRequest(`${BASE}/metrics`).then((payload) => payload.data),

  listPersonas: () => platformListAll(`${BASE}/personas`),
  listScenarios: () => platformListAll(`${BASE}/scenarios`),
  listTemplates: () => platformListAll(`${BASE}/templates`),
  /** Completed sessions page. Returns `{ data, page }` so callers can paginate. */
  listSessions: (query = {}) =>
    platformRequest(`${BASE}/sessions`, { query: { pageSize: 50, ...query } }).then((payload) => ({
      data: payload?.data || [],
      page: payload?.page || { page: 1, pageSize: 50, total: 0 },
    })),
  /** All completed sessions (follows API pages). Prefer `listSessions` when showing a paged UI. */
  listSessionsAll: (query = {}) => platformListAll(`${BASE}/sessions`, { pageSize: 100, ...query }),
  getDashboards: (query = {}) =>
    platformRequest(`${BASE}/dashboards`, { query }).then((payload) => payload.data),
  listGroups: () => platformRequest(`${BASE}/groups`).then((payload) => payload.data),
  getGroup: (id) => platformRequest(`${BASE}/groups/${id}`).then((payload) => payload.data),
  listDirectory: () => platformRequest(`${BASE}/directory`).then((payload) => payload.data),
  patchDirectoryUser: (id, body) =>
    platformRequest(`${BASE}/directory/${id}`, { method: 'PATCH', body }).then((payload) => payload.data),
  createGroup: (body) => platformRequest(`${BASE}/groups`, { method: 'POST', body }).then((payload) => payload.data),
  updateGroup: (id, body) =>
    platformRequest(`${BASE}/groups/${id}`, { method: 'PATCH', body }).then((payload) => payload.data),
  deleteGroup: (id) => platformRequest(`${BASE}/groups/${id}`, { method: 'DELETE' }),
  getSettings: () => platformRequest(`${BASE}/settings`).then((payload) => payload.data),
  patchSettings: (body) =>
    platformRequest(`${BASE}/settings`, { method: 'PATCH', body }).then((payload) => payload.data),

  createPersona: (body) => platformRequest(`${BASE}/personas`, { method: 'POST', body }),
  updatePersona: (id, body) => platformRequest(`${BASE}/personas/${id}`, { method: 'PATCH', body }),
  deletePersona: (id) => platformRequest(`${BASE}/personas/${id}`, { method: 'DELETE' }),
  createScenario: (body) => platformRequest(`${BASE}/scenarios`, { method: 'POST', body }),
  updateScenario: (id, body) => platformRequest(`${BASE}/scenarios/${id}`, { method: 'PATCH', body }),
  deleteScenario: (id) => platformRequest(`${BASE}/scenarios/${id}`, { method: 'DELETE' }),
  createTemplate: (body) => platformRequest(`${BASE}/templates`, { method: 'POST', body }),
  updateTemplate: (id, body) => platformRequest(`${BASE}/templates/${id}`, { method: 'PATCH', body }),
  deleteTemplate: (id) => platformRequest(`${BASE}/templates/${id}`, { method: 'DELETE' }),
  installStarterCatalog: () => platformRequest(`${BASE}/starter-catalog`, { method: 'POST' }),

  startSession: (body) => platformRequest(`${BASE}/sessions`, { method: 'POST', body }).then((payload) => payload.data),
  getSession: (id) => platformRequest(`${BASE}/sessions/${id}`).then((payload) => payload.data),
  sendMessage: (id, text, timing = {}) =>
    platformRequest(`${BASE}/sessions/${id}/messages`, { method: 'POST', body: { text, ...timing } }).then(
      (payload) => payload.data,
    ),
  finishSession: (id) => platformRequest(`${BASE}/sessions/${id}/finish`, { method: 'POST' }).then((payload) => payload.data),
  rejudgeSession: (id) =>
    platformRequest(`${BASE}/sessions/${id}/rejudge`, { method: 'POST' }).then((payload) => payload.data),
  uploadSessionAudio: async (id, blob) => {
    const response = await fetch(`${PLATFORM_API_BASE}${BASE}/sessions/${id}/audio`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': blob.type || 'audio/webm' },
      body: blob,
    })
    if (!response.ok) throw new Error('Não foi possível guardar a gravação.')
    return response.json()
  },
  sessionAudioUrl: (id) => `${PLATFORM_API_BASE}${BASE}/sessions/${id}/audio`,
}
