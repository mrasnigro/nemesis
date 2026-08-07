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
  const sessionRef = useRef(session)
  const inFlightRef = useRef(null)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const ensureSession = useCallback(async (options = {}) => {
    if (!isAuthenticated || !impUser?.username) {
      setSession(null)
      clearWebinarSession()
      setStatus('idle')
      setError('')
      return null
    }

    if (inFlightRef.current && !options.force) {
      return inFlightRef.current
    }

    const run = (async () => {
      setStatus('bridging')
      setError('')
      try {
        const next = await ensureWebinarSession(impUser, { force: Boolean(options.force) })
        setSession(next)
        sessionRef.current = next
        setStatus('ready')
        setError('')
        return next
      } catch (err) {
        setSession(null)
        sessionRef.current = null
        clearWebinarSession()
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Falha no bridge Webinar')
        return null
      } finally {
        inFlightRef.current = null
      }
    })()

    inFlightRef.current = run
    return run
  }, [impUser, isAuthenticated])

  // Bridge once per IMP username — do not depend on ensureSession identity (avoids retry storms).
  useEffect(() => {
    if (!isAuthenticated || !impUser?.username) {
      setSession(null)
      clearWebinarSession()
      setStatus('idle')
      setError('')
      return
    }
    void ensureSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only auto-bridge on identity change
  }, [isAuthenticated, impUser?.username])

  const apiRequest = useCallback(
    async (path, options = {}) => {
      let token = sessionRef.current?.accessToken
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
    [ensureSession],
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
        sessionRef.current = null
        setStatus('idle')
        setError('')
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
