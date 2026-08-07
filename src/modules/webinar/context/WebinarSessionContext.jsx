import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../auth/AuthContext'
import {
  bridgeImpUserToWebinar,
  clearWebinarSession,
  loadStoredWebinarSession,
} from '../services/webinarAuthBridge.js'
import { webinarApiFetch } from '../services/webinarApi.js'

const WebinarSessionContext = createContext(null)

export function WebinarSessionProvider({ children }) {
  const { user: impUser, isAuthenticated } = useAuth()
  const [session, setSession] = useState(() => loadStoredWebinarSession())
  const [status, setStatus] = useState('idle') // idle | bridging | ready | error
  const [error, setError] = useState('')

  const ensureSession = useCallback(async () => {
    if (!isAuthenticated || !impUser?.username) {
      setSession(null)
      clearWebinarSession()
      setStatus('idle')
      return null
    }

    const cached = loadStoredWebinarSession()
    if (cached?.accessToken && cached.impUsername === impUser.username) {
      setSession(cached)
      setStatus('ready')
      setError('')
      return cached
    }

    setStatus('bridging')
    setError('')
    try {
      const next = await bridgeImpUserToWebinar(impUser)
      setSession(next)
      setStatus('ready')
      return next
    } catch (err) {
      setSession(null)
      clearWebinarSession()
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Falha no bridge Webinar')
      return null
    }
  }, [impUser, isAuthenticated])

  useEffect(() => {
    void ensureSession()
  }, [ensureSession])

  const apiGet = useCallback(
    async (path) => {
      const token = session?.accessToken
      if (!token) throw new Error('Sem sessão Webinar')
      return webinarApiFetch(path, { token })
    },
    [session?.accessToken],
  )

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
      isReady: status === 'ready' && Boolean(session?.accessToken),
    }),
    [apiGet, ensureSession, error, session, status],
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
