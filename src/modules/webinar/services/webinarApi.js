/**
 * Thin fetch client for Webinar API (M1 scaffold — no axios dependency).
 */

import { getWebinarApiUrl } from '../config/webinarConfig.js'

/**
 * @param {string} path - e.g. `/auth/imp-handoff/exchange`
 * @param {{ method?: string, body?: unknown, token?: string|null, headers?: Record<string,string> }} [options]
 */
export async function webinarApiFetch(path, options = {}) {
  const base = getWebinarApiUrl()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = `${base}${normalizedPath}`

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || `Webinar API HTTP ${response.status}`)
    error.status = response.status
    error.data = data
    throw error
  }
  return data
}
