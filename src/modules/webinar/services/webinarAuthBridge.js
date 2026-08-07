/**
 * In-app auth bridge: IMP user → Webinar JWT via existing handoff endpoints (M2 start / M1).
 * No new tab — tokens stay in module memory + sessionStorage.
 */

import { getImpHandoffSharedKey } from '../config/webinarConfig.js'
import { webinarApiFetch } from './webinarApi.js'

const STORAGE_KEY = 'imp_webinar_session_v1'

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

/**
 * Mint + exchange handoff against Webinar API using IMP identity.
 * @param {{ username: string, name?: string, role?: string, profile?: string }} impUser
 * @returns {Promise<WebinarSession>}
 */
export async function bridgeImpUserToWebinar(impUser) {
  if (!impUser?.username) {
    throw new Error('Usuário IMP ausente para bridge')
  }

  const registered = await webinarApiFetch('/auth/imp-handoff/register', {
    method: 'POST',
    headers: {
      'X-IMP-Handoff-Key': getImpHandoffSharedKey(),
    },
    body: {
      username: impUser.username,
      name: impUser.name || impUser.username,
      role: impUser.role || 'imp',
      profile: impUser.profile,
      returnTo:
        typeof window !== 'undefined' ? `${window.location.origin}/modules/webinar` : undefined,
    },
  })

  if (!registered?.code) {
    throw new Error('Handoff register não retornou code')
  }

  const exchanged = await webinarApiFetch('/auth/imp-handoff/exchange', {
    method: 'POST',
    body: { code: registered.code },
  })

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
