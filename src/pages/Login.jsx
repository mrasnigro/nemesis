import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './Login.css'

export default function Login() {
  const { isAuthenticated, user, login, getHomeForRole } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (isAuthenticated) {
    return <Navigate to={getHomeForRole(user.role)} replace />
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const result = login(username, password)

    if (!result.ok) {
      setError(result.error)
      return
    }

    navigate(result.redirectTo, { replace: true })
  }

  return (
    <div className="login-page">
      <div className="login-page__panel">
        <div className="login-page__brand">
          <span className="login-page__mark">IMP</span>
          <h1>IMP Platform</h1>
          <p>Acesse sua área com o perfil correspondente.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Usuário
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin ou imp"
              required
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {error ? <p className="login-form__error">{error}</p> : null}

          <button type="submit">Entrar</button>
        </form>

        <div className="login-page__hint">
          <p>
            <strong>admin / admin</strong> → /admin
          </p>
          <p>
            <strong>imp / imp</strong> → /dashboard
          </p>
        </div>
      </div>
    </div>
  )
}
