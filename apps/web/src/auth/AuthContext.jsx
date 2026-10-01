import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { onSessionExpired, platformRequest } from '../core/api/platformClient.js'

/**
 * Session state backed by the platform API (`imp_session` httpOnly cookie).
 * user = { id, username, name, email, role, profile, customer: { id, name } | null, modules }
 */

const ROLE_HOME = {
  admin: '/admin',
  imp: '/dashboard',
}

const LOGIN_ERRORS = {
  UNAUTHORIZED: 'Usuário ou senha inválidos.',
  ACCOUNT_DISABLED: 'Esta conta está desativada. Fale com o administrador.',
  CUSTOMER_SUSPENDED: 'A conta do cliente está suspensa. Fale com o suporte IMP.',
  RATE_LIMITED: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  NETWORK_ERROR: 'Não foi possível conectar à API da plataforma.',
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null })

  const refreshSession = useCallback(async () => {
    try {
      const payload = await platformRequest('/api/auth/me')
      setState({ status: 'authenticated', user: payload.data })
      return payload.data
    } catch {
      setState({ status: 'anonymous', user: null })
      return null
    }
  }, [])

  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  useEffect(() => onSessionExpired(() => setState({ status: 'anonymous', user: null })), [])

  const value = useMemo(() => {
    async function login(username, password) {
      try {
        const payload = await platformRequest('/api/auth/login', {
          method: 'POST',
          body: { username: username.trim(), password },
        })
        const user = payload.data
        setState({ status: 'authenticated', user })
        return { ok: true, user, redirectTo: ROLE_HOME[user.role] ?? '/login' }
      } catch (error) {
        return { ok: false, error: LOGIN_ERRORS[error?.code] ?? 'Não foi possível entrar. Tente novamente.' }
      }
    }

    async function logout() {
      await platformRequest('/api/auth/logout', { method: 'POST' }).catch(() => {})
      setState({ status: 'anonymous', user: null })
    }

    return {
      user: state.user,
      isAuthenticated: state.status === 'authenticated',
      isLoading: state.status === 'loading',
      login,
      logout,
      refreshSession,
      getHomeForRole: (role) => ROLE_HOME[role] ?? '/login',
    }
  }, [state, refreshSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}

export { ROLE_HOME }
