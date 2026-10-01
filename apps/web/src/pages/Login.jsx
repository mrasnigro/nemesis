import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './Login.css'

/** Accounts created by `npm run db:seed`. Shown only in development builds. */
const DEV_CREDENTIALS = import.meta.env.DEV
  ? [
      { role: 'BDR', username: 'bdr', password: 'bdr' },
      { role: 'SDR', username: 'sdr', password: 'sdr' },
      { role: 'Gestor', username: 'gestor', password: 'gestor' },
      { role: 'Admin IMP', username: 'admin', password: 'admin' },
    ]
  : []

export default function Login() {
  const { isAuthenticated, isLoading, user, login, getHomeForRole } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to={getHomeForRole(user.role)} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const result = await login(username, password)
    setSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    const from = location.state?.from?.pathname
    const canReturn = from && from !== '/login' && (result.user.role === 'admin') === from.startsWith('/admin')
    navigate(canReturn ? from : result.redirectTo, { replace: true })
  }

  function fillCredentials(userValue, passValue) {
    setUsername(userValue)
    setPassword(passValue)
    setError('')
  }

  return (
    <div className="login-page">
      <div className="login-page__pattern" aria-hidden="true" />

      <div className="login-page__panel">
        <div className="login-page__brand">
          <span className="login-page__mark">IMP</span>
          <h1>CRM IMP</h1>
          <p>Sistema de Gestão de Leads</p>
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
              placeholder="Digite seu usuário"
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
              placeholder="Digite sua senha"
              required
            />
          </label>

          {error ? <p className="login-form__error">{error}</p> : null}

          <button type="submit" disabled={submitting || isLoading}>
            {submitting ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>

        {DEV_CREDENTIALS.length ? (
          <div className="login-page__credentials">
            <p className="login-page__credentials-title">Credenciais de desenvolvimento (seed):</p>
            <ul>
              {DEV_CREDENTIALS.map((item) => (
                <li key={item.role}>
                  <button
                    type="button"
                    className="login-page__credential"
                    onClick={() => fillCredentials(item.username, item.password)}
                  >
                    <span>{item.role}</span>
                    <strong>
                      {item.username} / {item.password}
                    </strong>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}
