/**
 * IMP → Webinar sidecar configuration.
 * Do not import anything from services/webinar.
 */

const ENV_KEY = 'VITE_WEBINAR_URL'

export function getWebinarServiceUrl() {
  const raw = import.meta.env[ENV_KEY]
  if (typeof raw !== 'string') return ''
  return raw.trim().replace(/\/$/, '')
}

export function isWebinarServiceConfigured() {
  return getWebinarServiceUrl().length > 0
}

/**
 * Future SSO / JWT handoff extension point.
 * Phase 1 returns the configured base URL only.
 *
 * @param {{ handoffCode?: string, returnTo?: string }} [options]
 * @returns {string}
 */
export function buildWebinarLaunchUrl(options = {}) {
  const base = getWebinarServiceUrl()
  if (!base) return ''

  // Reserved for Phase 3 auth bridge (one-time code / SSO).
  // Do not put long-lived tokens in the query string.
  if (options.handoffCode) {
    const url = new URL(base)
    url.searchParams.set('imp_handoff', options.handoffCode)
    if (options.returnTo) {
      url.searchParams.set('return_to', options.returnTo)
    }
    return url.toString()
  }

  return base
}

export const webinarConfig = {
  envKey: ENV_KEY,
  openMode: 'new_tab',
  getServiceUrl: getWebinarServiceUrl,
  isConfigured: isWebinarServiceConfigured,
  buildLaunchUrl: buildWebinarLaunchUrl,
}

export default webinarConfig
