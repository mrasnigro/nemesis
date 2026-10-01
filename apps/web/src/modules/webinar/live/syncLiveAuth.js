/**
 * Sync IMP↔Webinar handoff session into the live FE zustand authStore
 * so axios API calls in services/webinar/frontend keep working.
 */

import { useAuthStore } from '@webinar-live/store/authStore'

/**
 * @param {{
 *   user?: { id?: number|string, email?: string, name?: string, role?: string },
 *   accessToken?: string,
 *   refreshToken?: string,
 * } | null} session
 */
export function syncLiveAuthStore(session) {
  if (!session?.accessToken || !session?.user) {
    useAuthStore.getState().logout()
    return
  }

  const role = session.user.role === 'admin' ? 'admin' : 'client'
  useAuthStore.getState().setUser({
    id: Number(session.user.id) || 0,
    email: session.user.email || '',
    name: session.user.name || session.user.email || 'IMP',
    role,
  })
  useAuthStore.getState().setTokens(session.accessToken, session.refreshToken || '')
  useAuthStore.getState().setError(null)
  useAuthStore.getState().setLoading(false)
}

export function clearLiveAuthStore() {
  useAuthStore.getState().logout()
}
