/**
 * In-app auth bridge: IMP user → Webinar JWT via handoff endpoints (M2).
 */

import { registerImpHandoff } from './impHandoff.js'
import { webinarApiFetch } from './webinarApi.js'

const STORAGE_KEY = 'imp_webinar_session_v1'
const MAX_SESSION_AGE_MS = 14 * 60 * 1000 // re-bridge before typical 15m JWT expiry

/**
 * @typedef {{
 *   user: { id: number|string, email: string, name: string, role: string },
 *   accessToken: string,
 *   refreshToken: string,
 *   syncedAt: string,
 *   impUsername: string,
 * }} WebinarSession
 */

export function loadStoredWebinarSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function persistWebinarSession(session) {
  try {
    if (!session) {
      sessionStorage.removeItem(STORAGE_KEY)
      return
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    /* ignore */
  }
}

export function clearWebinarSession() {
  persistWebinarSession(null)
}

/** True if cached session looks fresh enough to attempt /auth/me. */
export function isSessionFresh(session) {
  if (!session?.accessToken || !session?.syncedAt) return false
  const age = Date.now() - new Date(session.syncedAt).getTime()
  return Number.isFinite(age) && age >= 0 && age < MAX_SESSION_AGE_MS
}

/**
 * @param {WebinarSession} session
 * @returns {Promise<{ ok: boolean, user?: object, reason?: string }>}
 */
export async function validateWebinarSession(session) {
  if (!session?.accessToken) return { ok: false, reason: 'missing_token' }
  try {
    const me = await webinarApiFetch('/auth/me', { token: session.accessToken })
    return { ok: true, user: me }
  } catch (err) {
    return {
      ok: false,
      reason: err?.status === 401 ? 'unauthorized' : 'validate_failed',
    }
  }
}

/**
 * Mint + exchange handoff against Webinar API using IMP identity.
 * @param {{ username: string, name?: string, role?: string, profile?: string }} impUser
 * @returns {Promise<WebinarSession>}
 */
export async function bridgeImpUserToWebinar(impUser) {
  if (!impUser?.username) {
    throw new Error('Usuário IMP ausente para bridge')
  }

  const registered = await registerImpHandoff({
    returnTo: typeof window !== 'undefined' ? `${window.location.origin}/modules/webinar/app` : undefined,
  })

  if (!registered.ok || !registered.code) {
    throw new Error(registered.detail || 'Não foi possível iniciar a sessão do Webinar')
  }

  const exchanged = await webinarApiFetch('/auth/imp-handoff/exchange', {
    method: 'POST',
    body: { code: registered.code },
  })

  if (!exchanged?.accessToken) {
    throw new Error('Handoff exchange não retornou accessToken')
  }

  const session = {
    user: exchanged.user,
    accessToken: exchanged.accessToken,
    refreshToken: exchanged.refreshToken,
    syncedAt: new Date().toISOString(),
    impUsername: impUser.username,
  }

  persistWebinarSession(session)
  return session
}

/**
 * Prefer cached session if valid; otherwise mint a new one.
 * @param {object} impUser
 * @param {{ force?: boolean }} [options]
 */
export async function ensureWebinarSession(impUser, options = {}) {
  if (!options.force) {
    const cached = loadStoredWebinarSession()
    if (
      cached?.impUsername === impUser?.username &&
      isSessionFresh(cached)
    ) {
      const checked = await validateWebinarSession(cached)
      if (checked.ok) {
        const next = {
          ...cached,
          user: checked.user || cached.user,
          syncedAt: new Date().toISOString(),
        }
        persistWebinarSession(next)
        return next
      }
    }
  }

  return bridgeImpUserToWebinar(impUser)
}
