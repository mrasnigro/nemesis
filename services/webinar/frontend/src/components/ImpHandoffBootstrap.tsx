import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const RETURN_TO_KEY = 'imp_return_to'

function resolveExchangeUrl(): string {
  const raw = String(import.meta.env.REACT_APP_API_URL || 'http://localhost:3001/api').replace(
    /\/$/,
    '',
  )
  if (raw.endsWith('/api')) {
    return `${raw}/auth/imp-handoff/exchange`
  }
  return `${raw}/api/auth/imp-handoff/exchange`
}

/**
 * Consumes ?imp_handoff=… from IMP launcher, exchanges for Webinar JWT,
 * then navigates to the role dashboard. Stores return_to for "Back to IMP".
 */
export function ImpHandoffBootstrap() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)
  const setTokens = useAuthStore((s) => s.setTokens)
  const setError = useAuthStore((s) => s.setError)
  const [status, setStatus] = useState<'idle' | 'working' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('imp_handoff')
    if (!code) return

    let cancelled = false

    async function exchange() {
      setStatus('working')
      setMessage('Validando sessão IMP…')
      try {
        const response = await fetch(resolveExchangeUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })
        const data = await response.json().catch(() => ({}))
        if (cancelled) return

        if (!response.ok) {
          throw new Error(data.error || `HTTP ${response.status}`)
        }

        const { user, accessToken, refreshToken, returnTo } = data
        setUser(user)
        setTokens(accessToken, refreshToken)
        setError(null)

        if (returnTo) {
          try {
            sessionStorage.setItem(RETURN_TO_KEY, String(returnTo))
          } catch {
            /* ignore */
          }
        }

        params.delete('imp_handoff')
        params.delete('return_to')
        const cleaned = params.toString()
        const path = window.location.pathname || '/'
        const nextUrl = `${path}${cleaned ? `?${cleaned}` : ''}${window.location.hash}`
        window.history.replaceState({}, '', nextUrl)

        // Deep-link: keep studio/live (etc.). Only bounce home from marketing/login routes.
        const deep =
          path !== '/' &&
          path !== '/login' &&
          path !== '/register' &&
          !path.startsWith('/forgot') &&
          !path.startsWith('/reset')
        const dest = deep
          ? path
          : user?.role === 'admin'
            ? '/admin/dashboard'
            : '/dashboard'
        navigate(dest, { replace: true })
        setStatus('idle')
      } catch (err: any) {
        if (cancelled) return
        const detail = err?.message || 'Falha no handoff IMP'
        setStatus('error')
        setMessage(detail)
        setError(detail)
      }
    }

    void exchange()
    return () => {
      cancelled = true
    }
  }, [navigate, setError, setTokens, setUser])

  if (status === 'idle') return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(10, 12, 18, 0.72)',
        color: '#f9fafb',
        padding: '1.5rem',
        textAlign: 'center',
      }}
      role="status"
      aria-live="polite"
    >
      <div
        style={{
          maxWidth: '22rem',
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          background: '#111827',
          border: '1px solid rgba(148,163,184,0.35)',
        }}
      >
        <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
          {status === 'working' ? 'Entrando via IMP…' : 'Handoff falhou'}
        </strong>
        <p style={{ margin: 0, opacity: 0.85, fontSize: '0.9rem' }}>{message}</p>
        {status === 'error' ? (
          <button
            type="button"
            style={{
              marginTop: '1rem',
              padding: '0.5rem 0.9rem',
              borderRadius: '8px',
              border: '0',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/login', { replace: true })}
          >
            Ir para login
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function getStoredImpReturnTo(): string | null {
  try {
    return sessionStorage.getItem(RETURN_TO_KEY)
  } catch {
    return null
  }
}

export function clearStoredImpReturnTo() {
  try {
    sessionStorage.removeItem(RETURN_TO_KEY)
  } catch {
    /* ignore */
  }
}
