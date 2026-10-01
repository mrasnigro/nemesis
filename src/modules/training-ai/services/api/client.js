const BASE = '/platform-api'

export const trainingDataMode = import.meta.env.VITE_TRAINING_AI_DATA === 'api' ? 'api' : 'mock'

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
    const message = body?.error?.message || `Request failed (${response.status})`
    const error = new Error(message)
    error.status = response.status
    error.details = body?.error?.details || []
    throw error
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

export const trainingApi = {
  listPersonas: () => listAll('/api/modules/training-ai/personas'),
  listScenarios: () => listAll('/api/modules/training-ai/scenarios'),
  listTemplates: () => listAll('/api/modules/training-ai/templates'),
  listSessions: () => listAll('/api/modules/training-ai/sessions'),
  createPersona: (body) =>
    request('/api/modules/training-ai/personas', { method: 'POST', body: JSON.stringify(body) }),
  updatePersona: (id, body) =>
    request(`/api/modules/training-ai/personas/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  createScenario: (body) =>
    request('/api/modules/training-ai/scenarios', { method: 'POST', body: JSON.stringify(body) }),
  updateScenario: (id, body) =>
    request(`/api/modules/training-ai/scenarios/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  createTemplate: (body) =>
    request('/api/modules/training-ai/templates', { method: 'POST', body: JSON.stringify(body) }),
  updateTemplate: (id, body) =>
    request(`/api/modules/training-ai/templates/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  createSession: (body) =>
    request('/api/modules/training-ai/sessions', { method: 'POST', body: JSON.stringify(body) }),
}
