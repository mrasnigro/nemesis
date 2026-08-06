/**
 * Launches the external Webinar sidecar from IMP.
 * Integration boundary only — no Webinar UI imports.
 */

import { buildWebinarLaunchUrl, isWebinarServiceConfigured } from '../config/webinarConfig.js'

/**
 * @typedef {{ handoffCode?: string, returnTo?: string }} WebinarLaunchOptions
 */

/**
 * Opens the Webinar service in a new tab with noopener/noreferrer.
 *
 * @param {WebinarLaunchOptions} [options]
 * @returns {{ ok: boolean, reason?: string, url?: string }}
 */
export function launchWebinarService(options = {}) {
  if (!isWebinarServiceConfigured()) {
    return { ok: false, reason: 'missing_url' }
  }

  let url
  try {
    url = buildWebinarLaunchUrl(options)
    // Validate absolute URL before opening.
    // Relative values are rejected to avoid same-origin navigation surprises.
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, reason: 'invalid_url' }
    }
  } catch {
    return { ok: false, reason: 'invalid_url' }
  }

  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (!opened) {
    return { ok: false, reason: 'popup_blocked', url }
  }

  return { ok: true, url }
}

/**
 * Future SSO entry — call after IMP issues a one-time handoff code.
 * Phase 1 does not mint tokens; this only documents the seam.
 *
 * @param {string} handoffCode
 * @param {Omit<WebinarLaunchOptions, 'handoffCode'>} [options]
 */
export function launchWebinarWithHandoff(handoffCode, options = {}) {
  return launchWebinarService({ ...options, handoffCode })
}

export default {
  launchWebinarService,
  launchWebinarWithHandoff,
}
