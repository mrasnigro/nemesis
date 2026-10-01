/**
 * IMP → Webinar sidecar configuration.
 * Do not import app trees from services/webinar.
 */

const ENV_KEY = 'VITE_WEBINAR_URL'
const API_ENV_KEY = 'VITE_WEBINAR_API_URL'
const HANDOFF_KEY_ENV = 'VITE_IMP_HANDOFF_SHARED_KEY'

export function getWebinarServiceUrl() {
  const raw = import.meta.env[ENV_KEY]
  if (typeof raw !== 'string') return ''
  return raw.trim().replace(/\/$/, '')
}

/**
 * Webinar API base for in-app calls.
 * Prefer same-origin `/webinar-api` (Vite proxy / future nginx) over cross-origin :3001.
 */
export function getWebinarApiUrl() {
  const raw = import.meta.env[API_ENV_KEY]
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().replace(/\/$/, '')
  }
  // Dev / merged-app default: proxied path (M1)
  return '/webinar-api'
}

/** Dev shared key — must match Webinar `IMP_HANDOFF_SHARED_KEY`. */
export function getImpHandoffSharedKey() {
  const raw = import.meta.env[HANDOFF_KEY_ENV]
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return 'imp-dev-handoff-key'
}

export function isWebinarServiceConfigured() {
  return getWebinarServiceUrl().length > 0
}

/**
 * Build absolute sidecar URL for an app path (e.g. /studio/preview/12).
 * @param {string} path
 * @param {{ handoffCode?: string, returnTo?: string }} [options]
 */
export function buildWebinarAppPathUrl(path, options = {}) {
  const base = getWebinarServiceUrl()
  if (!base) return ''
  const normalized = String(path || '/').startsWith('/') ? path : `/${path}`
  const url = new URL(normalized, `${base}/`)
  if (options.handoffCode) {
    url.searchParams.set('imp_handoff', options.handoffCode)
  }
  if (options.returnTo) {
    url.searchParams.set('return_to', options.returnTo)
  }
  return url.toString()
}

export function buildStudioPreviewUrl(webinarId, options = {}) {
  return buildWebinarAppPathUrl(`/studio/preview/${encodeURIComponent(webinarId)}`, options)
}

export function buildLiveViewerUrl(webinarId, options = {}) {
  return buildWebinarAppPathUrl(`/live/${encodeURIComponent(webinarId)}`, options)
}

/**
 * @param {{ handoffCode?: string, returnTo?: string }} [options]
 * @returns {string}
 */
export function buildWebinarLaunchUrl(options = {}) {
  const base = getWebinarServiceUrl()
  if (!base) return ''

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
  apiEnvKey: API_ENV_KEY,
  openMode: 'in_app',
  getServiceUrl: getWebinarServiceUrl,
  getApiUrl: getWebinarApiUrl,
  getHandoffSharedKey: getImpHandoffSharedKey,
  isConfigured: isWebinarServiceConfigured,
  buildLaunchUrl: buildWebinarLaunchUrl,
  buildAppPathUrl: buildWebinarAppPathUrl,
  buildStudioPreviewUrl,
  buildLiveViewerUrl,
}

export default webinarConfig
