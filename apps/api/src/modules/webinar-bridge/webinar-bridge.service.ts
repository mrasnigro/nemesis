import { config } from '../../core/config.js'
import { AppError } from '../../core/errors.js'
import { log } from '../../core/logger.js'
import type { AuthUser } from '../../types/express.js'

export type WebinarHandoff = { code: string; expiresAt: string | null }

/**
 * Registers a one-time sign-on code on the Webinar service for the signed-in IMP user.
 * The shared key never leaves the server; identity comes from the session, not the request body.
 */
export async function mintWebinarHandoff(user: AuthUser, returnTo: string | undefined): Promise<WebinarHandoff> {
  if (!config.WEBINAR_API_URL || !config.WEBINAR_HANDOFF_SHARED_KEY) {
    throw new AppError(503, 'INTEGRATION_NOT_CONFIGURED', 'Webinar integration is not configured')
  }

  let response: Response
  try {
    response = await fetch(`${config.WEBINAR_API_URL.replace(/\/+$/, '')}/auth/imp-handoff/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-IMP-Handoff-Key': config.WEBINAR_HANDOFF_SHARED_KEY,
      },
      body: JSON.stringify({
        username: user.username,
        name: user.name,
        email: user.email ?? undefined,
        role: 'imp',
        profile: user.profile ?? undefined,
        workspaceId: user.customerId,
        returnTo: safeReturnTo(returnTo),
      }),
      signal: AbortSignal.timeout(5000),
    })
  } catch (error) {
    log('warn', 'webinar handoff unreachable', { err: String(error) })
    throw new AppError(502, 'INTEGRATION_UNAVAILABLE', 'Webinar service is unavailable')
  }

  const body = (await response.json().catch(() => ({}))) as { code?: string; expiresAt?: string }
  if (!response.ok || !body.code) {
    log('warn', 'webinar handoff rejected', { status: response.status })
    throw new AppError(502, 'INTEGRATION_UNAVAILABLE', 'Webinar service rejected the sign-on request')
  }
  return { code: body.code, expiresAt: body.expiresAt ?? null }
}

/** Only allow returning to an origin the API already trusts for CORS. */
function safeReturnTo(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return config.corsOrigins.includes(url.origin) ? url.toString() : undefined
  } catch {
    return undefined
  }
}
