import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './Login.css'

const TEST_CREDENTIALS = [
  { role: 'BDR', username: 'bdr', password: 'bdr' },
  { role: 'SDR', username: 'sdr', password: 'sdr' },
  { role: 'Admin', username: 'admin', password: 'admin' },
]

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

  function fillCredentials(userValue, passValue) {
    setUsername(userValue)
    setPassword(passValue)
    setError('')
  }

  return (
    <div className="login-page">
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

          <button type="submit">Entrar no Sistema</button>
        </form>

        <div className="login-page__credentials">
          <p className="login-page__credentials-title">Credenciais de teste:</p>
          <ul>
            {TEST_CREDENTIALS.map((item) => (
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
      </div>
    </div>
  )
}
