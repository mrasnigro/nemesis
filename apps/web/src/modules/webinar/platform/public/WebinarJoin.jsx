import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { publicWebinarApi } from '../services/webinarPlatformApi.js'
import { errorMessage, formatDateTime } from '../utils/format.js'
import PublicShell from './PublicShell.jsx'

/**
 * Public entry: the visitor types (or follows a link with) an access code, sees the webinar,
 * registers, and lands in the waiting room. No account involved.
 */
export default function WebinarJoin() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [code, setCode] = useState(params.get('codigo') || '')
  const [access, setAccess] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function openCode(value) {
    setBusy(true)
    setError('')
    try {
      setAccess(await publicWebinarApi.openCode(value.trim()))
    } catch (err) {
      setAccess(null)
      setError(
        err.code === 'CODE_UNAVAILABLE'
          ? 'Este código expirou ou não está mais disponível.'
          : err.code === 'CODE_INVALID'
            ? 'Não encontramos esse código. Confira e tente de novo.'
            : errorMessage(err),
      )
    } finally {
      setBusy(false)
    }
  }

  // A shared link arrives with the code filled in: open it without making the visitor click.
  useEffect(() => {
    const fromLink = params.get('codigo')
    if (fromLink) openCode(fromLink)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function register(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await publicWebinarApi.register({
        code: access.accessCode.code,
        name: form.name,
        email: form.email,
        phone: form.phone || null,
      })
      navigate(`/webinar/sala/${result.leadId}`, { replace: true })
    } catch (err) {
      setError(err.code === 'WEBINAR_FULL' ? 'As vagas deste webinar acabaram.' : errorMessage(err))
      setBusy(false)
    }
  }

  const webinar = access?.webinar
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  return (
    <PublicShell color={webinar?.registrationColor}>
      {!webinar ? (
        <form
          className="public-card"
          onSubmit={(event) => {
            event.preventDefault()
            openCode(code)
          }}
        >
          <h1>Entrar no webinar</h1>
          <p>Digite o código de acesso que você recebeu.</p>
          <label className="public-field">
            <span>Código de acesso</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              required
              maxLength={50}
            />
          </label>
          {error ? <p className="public-error">{error}</p> : null}
          <button type="submit" className="public-button" disabled={busy || !code.trim()}>
            {busy ? 'Verificando…' : 'Continuar'}
          </button>
        </form>
      ) : (
        <form className="public-card" onSubmit={register}>
          <h1>{webinar.title}</h1>
          <p className="public-when">
            {formatDateTime(webinar.scheduledAt, webinar.timezone)} · {webinar.durationMinutes} min
            {webinar.presenterName ? ` · com ${webinar.presenterName}` : ''}
          </p>
          {webinar.description ? <p>{webinar.description}</p> : null}
          <label className="public-field">
            <span>Nome</span>
            <input value={form.name} onChange={set('name')} required maxLength={255} autoComplete="name" />
          </label>
          <label className="public-field">
            <span>E-mail</span>
            <input type="email" value={form.email} onChange={set('email')} required maxLength={255} autoComplete="email" />
          </label>
          <label className="public-field">
            <span>Telefone (opcional)</span>
            <input type="tel" value={form.phone} onChange={set('phone')} maxLength={30} autoComplete="tel" />
          </label>
          {error ? <p className="public-error">{error}</p> : null}
          <button type="submit" className="public-button" disabled={busy}>
            {busy ? 'Enviando…' : 'Garantir minha vaga'}
          </button>
        </form>
      )}
    </PublicShell>
  )
}
