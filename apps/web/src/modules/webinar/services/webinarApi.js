/**
 * Thin fetch client for Webinar API (no axios).
 */

import { getWebinarApiUrl } from '../config/webinarConfig.js'

const DEFAULT_TIMEOUT_MS = 8000

/**
 * @param {string} path - e.g. `/auth/imp-handoff/exchange`
 * @param {{ method?: string, body?: unknown, token?: string|null, headers?: Record<string,string>, timeoutMs?: number }} [options]
 */
export async function webinarApiFetch(path, options = {}) {
  const base = getWebinarApiUrl()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = `${base}${normalizedPath}`
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT_MS

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body != null ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      let message = data.error || `Webinar API HTTP ${response.status}`
      if (response.status === 404) {
        message = `Rota não encontrada (${url}). Suba o backend atualizado em :3001 (rotas /api/auth/imp-handoff/*) ou reinicie o Vite para ativar o proxy /webinar-api.`
      }
      const error = new Error(message)
      error.status = response.status
      error.data = data
      throw error
    }
    return data
  } catch (err) {
    if (err?.name === 'AbortError') {
      const error = new Error(
        `Timeout ao falar com a API Webinar (${timeoutMs}ms) em ${url}. Confirme o backend em :3001 e o proxy /webinar-api.`,
      )
      error.status = 408
      error.code = 'timeout'
      throw error
    }
    if (err instanceof TypeError || /Failed to fetch|NetworkError/i.test(String(err?.message))) {
      const error = new Error(
        `API Webinar inacessível (${url}). Suba services/webinar no :3001 e reinicie o IMP se o proxy mudou.`,
      )
      error.status = 0
      error.code = 'network'
      throw error
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
