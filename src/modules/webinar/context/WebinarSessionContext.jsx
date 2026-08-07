import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../../auth/AuthContext'
import {
  clearWebinarSession,
  ensureWebinarSession,
  loadStoredWebinarSession,
} from '../services/webinarAuthBridge.js'
import { webinarApiFetch } from '../services/webinarApi.js'

const WebinarSessionContext = createContext(null)

export function WebinarSessionProvider({ children }) {
  const { user: impUser, isAuthenticated } = useAuth()
  const [session, setSession] = useState(() => loadStoredWebinarSession())
  const [status, setStatus] = useState('idle') // idle | bridging | ready | error
  const [error, setError] = useState('')
  const bridgingRef = useRef(false)

  const ensureSession = useCallback(
    async (options = {}) => {
      if (!isAuthenticated || !impUser?.username) {
        setSession(null)
        clearWebinarSession()
        setStatus('idle')
        return null
      }

      if (bridgingRef.current && !options.force) {
        return session
      }

      bridgingRef.current = true
      setStatus('bridging')
      setError('')
      try {
        const next = await ensureWebinarSession(impUser, { force: Boolean(options.force) })
        setSession(next)
        setStatus('ready')
        return next
      } catch (err) {
        setSession(null)
        clearWebinarSession()
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Falha no bridge Webinar')
        return null
      } finally {
        bridgingRef.current = false
      }
    },
    [impUser, isAuthenticated, session],
  )

  useEffect(() => {
    void ensureSession()
    // intentionally only when IMP identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impUser?.username, isAuthenticated])

  const apiRequest = useCallback(
    async (path, options = {}) => {
      let token = session?.accessToken
      if (!token) {
        const next = await ensureSession({ force: true })
        token = next?.accessToken
      }
      if (!token) throw new Error('Sem sessão Webinar')

      try {
        return await webinarApiFetch(path, { ...options, token })
      } catch (err) {
        if (err?.status === 401) {
          const next = await ensureSession({ force: true })
          if (!next?.accessToken) throw err
          return webinarApiFetch(path, { ...options, token: next.accessToken })
        }
        throw err
      }
    },
    [ensureSession, session?.accessToken],
  )

  const apiGet = useCallback((path) => apiRequest(path, { method: 'GET' }), [apiRequest])

  const value = useMemo(
    () => ({
      session,
      status,
      error,
      ensureSession,
      clearSession: () => {
        clearWebinarSession()
        setSession(null)
        setStatus('idle')
      },
      apiGet,
      apiRequest,
      isReady: status === 'ready' && Boolean(session?.accessToken),
    }),
    [apiGet, apiRequest, ensureSession, error, session, status],
  )

  return (
    <WebinarSessionContext.Provider value={value}>{children}</WebinarSessionContext.Provider>
  )
}

export function useWebinarSession() {
  const ctx = useContext(WebinarSessionContext)
  if (!ctx) {
    throw new Error('useWebinarSession must be used within WebinarSessionProvider')
  }
  return ctx
}
