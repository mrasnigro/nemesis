import { useState } from 'react'
import { webinarApi } from '../services/webinarPlatformApi.js'
import { useLoad } from '../hooks/useLoad.js'
import { errorMessage, formatDateTime, fromLocalInput, publicJoinUrl, toLocalInput } from '../utils/format.js'

function defaultWindow(webinar) {
  const start = new Date(webinar.scheduledAt)
  const end = new Date(start.getTime() + (webinar.durationMinutes + 120) * 60_000)
  return {
    scheduledAt: toLocalInput(start.toISOString(), webinar.timezone),
    expiresAt: toLocalInput(end.toISOString(), webinar.timezone),
  }
}

/** Codes a visitor uses to register for this webinar, with the link to share. */
export default function AccessCodesPanel({ webinar, canEdit }) {
  const { data: codes, error, loading, reload } = useLoad(() => webinarApi.listAccessCodes(webinar.id), [webinar.id])
  const [form, setForm] = useState({ code: '', maxLeads: '', ...defaultWindow(webinar) })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ kind: '', text: '' })

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  async function create(event) {
    event.preventDefault()
    setSaving(true)
    setMessage({ kind: '', text: '' })
    try {
      await webinarApi.createAccessCode(webinar.id, {
        ...(form.code.trim() ? { code: form.code.trim() } : {}),
        scheduledAt: fromLocalInput(form.scheduledAt, webinar.timezone),
        expiresAt: fromLocalInput(form.expiresAt, webinar.timezone),
        maxLeads: form.maxLeads ? Number(form.maxLeads) : null,
      })
      setForm((prev) => ({ ...prev, code: '', maxLeads: '' }))
      await reload()
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(code) {
    if (!window.confirm(`Desativar o código ${code.code}? Quem ainda não se inscreveu não conseguirá usá-lo.`)) return
    try {
      await webinarApi.deactivateAccessCode(webinar.id, code.id)
      await reload()
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err) })
    }
  }

  async function copy(code) {
    try {
      await navigator.clipboard.writeText(publicJoinUrl(code.code))
      setMessage({ kind: 'ok', text: `Link do código ${code.code} copiado.` })
    } catch {
      setMessage({ kind: 'error', text: `Copie manualmente: ${publicJoinUrl(code.code)}` })
    }
  }

  return (
    <div className="imp-panel">
      <div className="imp-panel__header">
        <div>
          <h3>Códigos de acesso</h3>
          <p>Cada código abre a inscrição neste webinar. Compartilhe o link com seus leads.</p>
        </div>
      </div>

      {message.text ? (
        <p className={message.kind === 'error' ? 'webinar-note webinar-note--error' : 'imp-toast'}>{message.text}</p>
      ) : null}
      {error ? <p className="webinar-note webinar-note--error">{errorMessage(error)}</p> : null}

      {loading && !codes ? <p className="webinar-note">Carregando…</p> : null}
      {codes && codes.length === 0 ? <div className="imp-empty">Nenhum código criado ainda.</div> : null}
      {codes && codes.length > 0 ? (
        <table className="imp-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Válido</th>
              <th>Inscritos</th>
              <th>Situação</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {codes.map((code) => {
              const expired = code.expiresAt && new Date(code.expiresAt) < new Date()
              const full = code.maxLeads != null && code.leadCount >= code.maxLeads
              const usable = code.active && !expired && !full
              return (
                <tr key={code.id}>
                  <td>
                    <code>{code.code}</code>
                  </td>
                  <td>
                    {formatDateTime(code.scheduledAt, webinar.timezone)} → {formatDateTime(code.expiresAt, webinar.timezone)}
                  </td>
                  <td>
                    {code.leadCount}
                    {code.maxLeads != null ? ` / ${code.maxLeads}` : ''}
                  </td>
                  <td>
                    <span className={`imp-pill imp-pill--${usable ? 'green' : 'muted'}`}>
                      {!code.active ? 'Desativado' : expired ? 'Expirado' : full ? 'Lotado' : 'Ativo'}
                    </span>
                  </td>
                  <td className="webinar-table__actions">
                    <button type="button" className="imp-btn imp-btn--ghost" onClick={() => copy(code)} disabled={!usable}>
                      Copiar link
                    </button>
                    {canEdit && code.active ? (
                      <button type="button" className="imp-btn imp-btn--ghost" onClick={() => deactivate(code)}>
                        Desativar
                      </button>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : null}

      {canEdit ? (
        <form className="webinar-form webinar-form--inline" onSubmit={create}>
          <h4>Novo código</h4>
          <div className="webinar-form__row">
            <label className="imp-field">
              <span>Código (opcional)</span>
              <input value={form.code} onChange={set('code')} placeholder="Gerado automaticamente" maxLength={50} />
            </label>
            <label className="imp-field">
              <span>Limite de inscritos</span>
              <input type="number" min="1" value={form.maxLeads} onChange={set('maxLeads')} placeholder="Sem limite" />
            </label>
          </div>
          <div className="webinar-form__row">
            <label className="imp-field">
              <span>Válido a partir de ({webinar.timezone})</span>
              <input type="datetime-local" value={form.scheduledAt} onChange={set('scheduledAt')} required />
            </label>
            <label className="imp-field">
              <span>Expira em ({webinar.timezone})</span>
              <input type="datetime-local" value={form.expiresAt} onChange={set('expiresAt')} required />
            </label>
          </div>
          <div className="imp-actions">
            <button type="submit" className="imp-btn imp-btn--primary" disabled={saving}>
              {saving ? 'Criando…' : 'Criar código'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
