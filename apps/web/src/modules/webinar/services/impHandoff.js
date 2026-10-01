/**
 * IMP → Webinar handoff.
 * The platform API mints the one-time code server-side (it holds the shared key and takes the
 * identity from the session); the browser only receives the code and opens the Webinar FE with it.
 */

import { platformRequest } from '../../../core/api/platformClient.js'
import { buildWebinarLaunchUrl, isWebinarServiceConfigured } from '../config/webinarConfig.js'
import { launchWebinarService } from './webinarLauncher.js'

/**
 * @typedef {{
 *   username: string,
 *   name?: string,
 *   role?: string,
 *   profile?: string,
 *   returnTo?: string,
 * }} ImpHandoffUser
 */

/**
 * @param {{ returnTo?: string }} [options]
 * @returns {Promise<{ ok: boolean, code?: string, reason?: string, detail?: string }>}
 */
export async function registerImpHandoff(options = {}) {
  try {
    const payload = await platformRequest('/api/modules/webinar/handoff', {
      method: 'POST',
      body: { returnTo: options.returnTo },
    })
    if (!payload?.data?.code) {
      return { ok: false, reason: 'register_failed', detail: 'Resposta sem code' }
    }
    return { ok: true, code: payload.data.code }
  } catch (error) {
    return {
      ok: false,
      reason: error?.code === 'NETWORK_ERROR' ? 'network_error' : 'register_failed',
      detail: error?.message,
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

  const returnTo =
    user.returnTo ||
    (typeof window !== 'undefined' ? `${window.location.origin}/modules/webinar` : undefined)
  const registered = await registerImpHandoff({ returnTo })

  if (!registered.ok || !registered.code) {
    const fallback = launchWebinarService({ returnTo: user.returnTo })
    return {
      ...fallback,
      handoff: false,
      handoffError: registered.reason,
      handoffDetail: registered.detail,
    }
  }

  const opened = launchWebinarService({ handoffCode: registered.code, returnTo })

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
