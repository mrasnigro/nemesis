/**
 * M3c-lite — open Studio / Live on the Webinar sidecar with optional SSO handoff.
 */

import {
  buildLiveViewerUrl,
  buildStudioPreviewUrl,
  isWebinarServiceConfigured,
} from '../config/webinarConfig.js'
import { registerImpHandoff } from './impHandoff.js'

/**
 * @param {{
 *   kind: 'studio'|'live',
 *   webinarId: string|number,
 *   user?: { username: string, name?: string, role?: string, profile?: string },
 *   returnTo?: string,
 * }} input
 */
export async function openSidecarMediaRoom(input) {
  const webinarId = String(input.webinarId || '').trim()
  if (!webinarId) {
    return { ok: false, reason: 'missing_webinar_id' }
  }
  if (!isWebinarServiceConfigured()) {
    return { ok: false, reason: 'missing_url' }
  }

  let handoffCode
  if (input.user?.username) {
    const registered = await registerImpHandoff({ returnTo: input.returnTo })
    if (registered.ok) handoffCode = registered.code
  }

  const url =
    input.kind === 'live'
      ? buildLiveViewerUrl(webinarId, {
          handoffCode,
          returnTo: input.returnTo,
        })
      : buildStudioPreviewUrl(webinarId, {
          handoffCode,
          returnTo: input.returnTo,
        })

  if (!url) return { ok: false, reason: 'invalid_url' }

  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (!opened) {
    return { ok: false, reason: 'popup_blocked', url, handoff: Boolean(handoffCode) }
  }
  return { ok: true, url, handoff: Boolean(handoffCode) }
}
