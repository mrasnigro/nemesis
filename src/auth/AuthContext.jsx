import { createContext, useContext, useMemo, useState } from 'react'

const USERS = {
  admin: { password: 'admin', role: 'admin', name: 'Administrador' },
  imp: { password: 'imp', role: 'imp', name: 'IMP User' },
}

const ROLE_HOME = {
  admin: '/admin',
  imp: '/dashboard',
}

const AuthContext = createContext(null)

function loadStoredUser() {
  try {
    const raw = sessionStorage.getItem('imp_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadStoredUser)

  const value = useMemo(() => {
    function login(username, password) {
      const account = USERS[username.trim().toLowerCase()]

      if (!account || account.password !== password) {
        return { ok: false, error: 'Usuário ou senha inválidos.' }
      }

      const nextUser = {
        username: username.trim().toLowerCase(),
        role: account.role,
        name: account.name,
      }

      sessionStorage.setItem('imp_user', JSON.stringify(nextUser))
      setUser(nextUser)

      return { ok: true, user: nextUser, redirectTo: ROLE_HOME[account.role] }
    }

    function logout() {
      sessionStorage.removeItem('imp_user')
      setUser(null)
    }

    return {
      user,
      isAuthenticated: Boolean(user),
      login,
      logout,
      getHomeForRole: (role) => ROLE_HOME[role] ?? '/login',
    }
  }, [user])

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
