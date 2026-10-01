/**
 * Single HTTP client for the IMP platform API (apps/api).
 * Auth is the httpOnly `imp_session` cookie; the browser never sees or sends a token itself.
 */

export const PLATFORM_API_BASE = import.meta.env.VITE_PLATFORM_API_URL?.trim() || '/platform-api'

export class PlatformApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message)
    this.name = 'PlatformApiError'
    this.status = status
    this.code = code
    this.details = details || []
  }
}

const sessionExpiredListeners = new Set()

/** Called when any request (other than the auth calls themselves) gets a 401. */
export function onSessionExpired(listener) {
  sessionExpiredListeners.add(listener)
  return () => sessionExpiredListeners.delete(listener)
}

function buildUrl(path, query) {
  const url = `${PLATFORM_API_BASE}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const search = params.toString()
  return search ? `${url}?${search}` : url
}

export async function platformRequest(path, { method = 'GET', body, query, signal, headers } = {}) {
  let response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new PlatformApiError('Não foi possível conectar à API da plataforma.', {
      status: 0,
      code: 'NETWORK_ERROR',
    })
  }

  if (response.status === 204) return null

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/api/auth/')) {
      sessionExpiredListeners.forEach((listener) => listener())
    }
    throw new PlatformApiError(payload?.error?.message || `Request failed (${response.status})`, {
      status: response.status,
      code: payload?.error?.code,
      details: payload?.error?.details,
    })
  }
  return payload
}

/** Follows `{ data, page }` pagination until every row is loaded. */
export async function platformListAll(path, query = {}) {
  const pageSize = 100
  const rows = []
  for (let page = 1; ; page += 1) {
    const payload = await platformRequest(path, { query: { ...query, page, pageSize } })
    const data = payload?.data || []
    rows.push(...data)
    const total = payload?.page?.total ?? rows.length
    if (data.length === 0 || rows.length >= total) return rows
  }
}
