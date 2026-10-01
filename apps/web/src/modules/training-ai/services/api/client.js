import { platformListAll, platformRequest } from '../../../../core/api/platformClient.js'

const BASE = '/api/modules/training-ai'

/** Every call goes to the platform API. Scores, replies and transcripts are produced and stored there. */
export const trainingApi = {
  getStatus: () => platformRequest(`${BASE}/status`).then((payload) => payload.data),
  getMetrics: () => platformRequest(`${BASE}/metrics`).then((payload) => payload.data),

  listPersonas: () => platformListAll(`${BASE}/personas`),
  listScenarios: () => platformListAll(`${BASE}/scenarios`),
  listTemplates: () => platformListAll(`${BASE}/templates`),
  /** Completed sessions, newest first (the 50 most recent). Trainees see their own; the administrator sees all. */
  listSessions: () =>
    platformRequest(`${BASE}/sessions`, { query: { pageSize: 50 } }).then((payload) => payload.data),

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
  sendMessage: (id, text) =>
    platformRequest(`${BASE}/sessions/${id}/messages`, { method: 'POST', body: { text } }).then((payload) => payload.data),
  finishSession: (id) => platformRequest(`${BASE}/sessions/${id}/finish`, { method: 'POST' }).then((payload) => payload.data),
}
