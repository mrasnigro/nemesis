import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { webinarApi } from '../services/webinarPlatformApi.js'
import { useLoad } from '../hooks/useLoad.js'
import { useCanEdit } from '../hooks/useCanEdit.js'
import { errorMessage, timezoneOptions } from '../utils/format.js'
import { formFromWebinar, newWebinarForm, payloadFromForm } from '../utils/webinarForm.js'
import { PLATFORM_BASE } from '../PlatformLayout.jsx'

export default function PlatformWebinarForm() {
  const { webinarId } = useParams()
  const isEdit = Boolean(webinarId)
  const navigate = useNavigate()
  const canEditWebinar = useCanEdit()

  const existing = useLoad(() => (isEdit ? webinarApi.getWebinar(webinarId) : Promise.resolve(null)), [webinarId])
  // The plan's limits, so the form says what is allowed instead of failing on save.
  const subscription = useLoad(() => webinarApi.subscription(), [])
  const plan = subscription.data?.plan
  const [form, setForm] = useState(newWebinarForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (existing.data) setForm(formFromWebinar(existing.data))
  }, [existing.data])

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))

  if (isEdit && existing.loading && !existing.data) {
    return (
      <section className="imp-module">
        <p className="webinar-note">Carregando…</p>
      </section>
    )
  }
  if (isEdit && existing.error) {
    return (
      <section className="imp-module">
        <div className="imp-empty">
          {existing.error.status === 404 ? 'Webinar não encontrado.' : errorMessage(existing.error)}
          <div className="imp-actions webinar-center">
            <Link to={`${PLATFORM_BASE}/webinars`} className="imp-btn imp-btn--ghost">
              ← Voltar
            </Link>
          </div>
        </div>
      </section>
    )
  }
  if (isEdit && existing.data && !canEditWebinar(existing.data)) {
    return (
      <section className="imp-module">
        <div className="imp-empty">Só o responsável ou o administrador do cliente pode editar este webinar.</div>
      </section>
    )
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    const payload = payloadFromForm(form)
    if (!payload.scheduledAt) {
      setError('Informe a data e a hora do webinar.')
      return
    }
    setSaving(true)
    try {
      const saved = isEdit ? await webinarApi.updateWebinar(webinarId, payload) : await webinarApi.createWebinar(payload)
      navigate(`${PLATFORM_BASE}/webinars/${saved.id}`, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <section className="imp-module">
      <header className="webinar-page-header">
        <div>
          <h2>{isEdit ? 'Editar webinar' : 'Novo webinar'}</h2>
          <p>{isEdit ? 'Ajuste os dados e salve.' : 'Preencha o essencial. Os códigos de acesso você cria depois, na página do webinar.'}</p>
        </div>
      </header>

      <form className="imp-panel webinar-form" onSubmit={submit}>
        <label className="imp-field">
          <span>Título *</span>
          <input value={form.title} onChange={set('title')} required maxLength={255} />
        </label>
        <label className="imp-field">
          <span>Descrição</span>
          <textarea value={form.description} onChange={set('description')} maxLength={5000} />
        </label>

        <div className="webinar-form__row">
          <label className="imp-field">
            <span>Data e hora * (no fuso escolhido ao lado)</span>
            <input type="datetime-local" value={form.scheduledAt} onChange={set('scheduledAt')} required />
          </label>
          <label className="imp-field">
            <span>Fuso horário</span>
            <select value={form.timezone} onChange={set('timezone')}>
              {timezoneOptions(form.timezone).map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="imp-field">
          <span>Duração (minutos) *</span>
          <input
            type="number"
            min="1"
            max={plan?.maxDurationMinutes ?? 1440}
            value={form.durationMinutes}
            onChange={set('durationMinutes')}
            required
          />
          {plan?.maxDurationMinutes ? <small className="webinar-table__sub">Máximo no plano {plan.name}: {plan.maxDurationMinutes} min.</small> : null}
        </label>

        <div className="webinar-form__row">
          <label className="imp-field">
            <span>Apresentador</span>
            <input value={form.presenterName} onChange={set('presenterName')} maxLength={255} />
          </label>
          <label className="imp-field">
            <span>Foto do apresentador (URL)</span>
            <input type="url" value={form.presenterImageUrl} onChange={set('presenterImageUrl')} maxLength={500} placeholder="https://" />
          </label>
        </div>
        <label className="imp-field">
          <span>Sobre o apresentador</span>
          <textarea value={form.presenterBio} onChange={set('presenterBio')} maxLength={5000} />
        </label>

        <div className="webinar-form__row">
          <label className="imp-field">
            <span>Limite de participantes</span>
            <input
              type="number"
              min="1"
              max={plan?.maxParticipants ?? undefined}
              value={form.maxParticipants}
              onChange={set('maxParticipants')}
              placeholder={plan?.maxParticipants ? `Até ${plan.maxParticipants} (plano ${plan.name})` : 'Sem limite'}
            />
            {plan?.maxParticipants ? (
              <small className="webinar-table__sub">O plano {plan.name} permite até {plan.maxParticipants} por webinar.</small>
            ) : null}
          </label>
          <label className="imp-field">
            <span>Cor da página de inscrição</span>
            <input type="color" value={form.registrationColor} onChange={set('registrationColor')} />
          </label>
        </div>

        {error ? <p className="webinar-note webinar-note--error">{error}</p> : null}

        <div className="imp-actions">
          <button type="submit" className="imp-btn imp-btn--primary" disabled={saving}>
            {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar webinar'}
          </button>
          <Link
            to={isEdit ? `${PLATFORM_BASE}/webinars/${webinarId}` : `${PLATFORM_BASE}/webinars`}
            className="imp-btn imp-btn--ghost"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  )
}
