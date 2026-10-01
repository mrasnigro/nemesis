import { platformListAll, platformRequest } from '../../../../core/api/platformClient.js'

export const trainingDataMode = import.meta.env.VITE_TRAINING_AI_DATA === 'api' ? 'api' : 'mock'

const BASE = '/api/modules/training-ai'

export const trainingApi = {
  listPersonas: () => platformListAll(`${BASE}/personas`),
  listScenarios: () => platformListAll(`${BASE}/scenarios`),
  listTemplates: () => platformListAll(`${BASE}/templates`),
  listSessions: () => platformListAll(`${BASE}/sessions`),
  createPersona: (body) => platformRequest(`${BASE}/personas`, { method: 'POST', body }),
  updatePersona: (id, body) => platformRequest(`${BASE}/personas/${id}`, { method: 'PATCH', body }),
  createScenario: (body) => platformRequest(`${BASE}/scenarios`, { method: 'POST', body }),
  updateScenario: (id, body) => platformRequest(`${BASE}/scenarios/${id}`, { method: 'PATCH', body }),
  createTemplate: (body) => platformRequest(`${BASE}/templates`, { method: 'POST', body }),
  updateTemplate: (id, body) => platformRequest(`${BASE}/templates/${id}`, { method: 'PATCH', body }),
  createSession: (body) => platformRequest(`${BASE}/sessions`, { method: 'POST', body }),
}
