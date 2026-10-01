/**
 * IMP → Webinar handoff mint (Phase C stub).
 * Registers a one-time code on the Webinar API, then opens the FE with ?imp_handoff=.
 */

import {
  buildWebinarLaunchUrl,
  getWebinarApiUrl,
  getImpHandoffSharedKey,
  isWebinarServiceConfigured,
} from '../config/webinarConfig.js'
import { launchWebinarService } from './webinarLauncher.js'

/**
 * @typedef {{
 *   username: string,
 *   name?: string,
 *   role?: string,
 *   profile?: string,
 *   returnTo?: string,
 *   workspaceId?: string,
 * }} ImpHandoffUser
 */

/**
 * @param {ImpHandoffUser} user
 * @returns {Promise<{ ok: boolean, code?: string, reason?: string, detail?: string }>}
 */
export async function registerImpHandoff(user) {
  const apiBase = getWebinarApiUrl()
  if (!apiBase) {
    return { ok: false, reason: 'missing_api_url' }
  }

  try {
    const response = await fetch(`${apiBase}/auth/imp-handoff/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-IMP-Handoff-Key': getImpHandoffSharedKey(),
      },
      body: JSON.stringify({
        username: user.username,
        name: user.name || user.username,
        role: user.role || 'imp',
        profile: user.profile,
        returnTo: user.returnTo,
        workspaceId: user.workspaceId,
      }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return {
        ok: false,
        reason: 'register_failed',
        detail: data.error || `HTTP ${response.status}`,
      }
    }

    if (!data.code) {
      return { ok: false, reason: 'register_failed', detail: 'Resposta sem code' }
    }

    return { ok: true, code: data.code }
  } catch (error) {
    return {
      ok: false,
      reason: 'network_error',
      detail: error instanceof Error ? error.message : 'network',
    }
  }
}

/**
 * Preferred launch path when the user is authenticated in IMP.
 * Falls back to plain open if handoff registration fails.
 *
 * @param {ImpHandoffUser} user
 * @param {{ preferHandoff?: boolean }} [options]
 */
export async function launchWebinarWithImpSession(user, options = {}) {
  const preferHandoff = options.preferHandoff !== false

  if (!isWebinarServiceConfigured()) {
    return { ok: false, reason: 'missing_url' }
  }

  if (!preferHandoff || !user?.username) {
    return launchWebinarService({
      returnTo: user?.returnTo,
    })
  }

  const registered = await registerImpHandoff({
    ...user,
    returnTo:
      user.returnTo ||
      (typeof window !== 'undefined' ? `${window.location.origin}/modules/webinar` : undefined),
  })

  if (!registered.ok || !registered.code) {
    const fallback = launchWebinarService({ returnTo: user.returnTo })
    return {
      ...fallback,
      handoff: false,
      handoffError: registered.reason,
      handoffDetail: registered.detail,
    }
  }

  const opened = launchWebinarService({
    handoffCode: registered.code,
    returnTo:
      user.returnTo ||
      (typeof window !== 'undefined' ? `${window.location.origin}/modules/webinar` : undefined),
  })

  return {
    ...opened,
    handoff: true,
    code: registered.code,
    launchUrl: buildWebinarLaunchUrl({
      handoffCode: registered.code,
      returnTo: user.returnTo,
    }),
  }
}
