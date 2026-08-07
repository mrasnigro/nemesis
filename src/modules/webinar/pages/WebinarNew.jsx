import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import WebinarSessionGate from '../components/WebinarSessionGate.jsx'
import { useWebinarSession } from '../context/WebinarSessionContext.jsx'

function defaultScheduleIso() {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000)
  d.setMinutes(0, 0, 0)
  return d.toISOString().slice(0, 16)
}

export default function WebinarNewPage() {
  const navigate = useNavigate()
  const { apiRequest } = useWebinarSession()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledLocal, setScheduledLocal] = useState(defaultScheduleIso)
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [presenterName, setPresenterName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const trimmed = title.trim()
    if (!trimmed) {
      setError('Informe o título.')
      return
    }
    if (!scheduledLocal) {
      setError('Informe a data/hora.')
      return
    }

    setSaving(true)
    try {
      const scheduledDate = new Date(scheduledLocal).toISOString()
      const created = await apiRequest('/client/webinars', {
        method: 'POST',
        body: {
          title: trimmed,
          description: description.trim(),
          scheduledDate,
          durationMinutes: Number(durationMinutes) || 60,
          presenterName: presenterName.trim() || undefined,
          status: 'draft',
        },
      })
      const id = created?.id || created?.webinar?.id
      if (id) {
        navigate(`/modules/webinar/webinars/${id}`, { replace: true })
        return
      }
      navigate('/modules/webinar/webinars', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar webinar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <WebinarSessionGate>
      <section className="imp-module webinar-page">
        <header className="webinar-page__intro webinar-page__intro--row">
          <div>
            <h2>Novo webinar</h2>
            <p>POST /client/webinars · rascunho rápido (M3a stub).</p>
          </div>
          <Link to="/modules/webinar/webinars" className="imp-btn imp-btn--ghost">
            ← Lista
          </Link>
        </header>

        <form className="imp-panel webinar-m3__form" onSubmit={handleSubmit}>
          <label className="imp-field">
            <span>Título*</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              placeholder="Ex.: Discovery com lead XYZ"
            />
          </label>
          <label className="imp-field">
            <span>Descrição</span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
          </label>
          <div className="webinar-m3__form-row">
            <label className="imp-field">
              <span>Data / hora*</span>
              <input
                type="datetime-local"
                value={scheduledLocal}
                onChange={(e) => setScheduledLocal(e.target.value)}
                required
              />
            </label>
            <label className="imp-field">
              <span>Duração (min)*</span>
              <input
                type="number"
                min={15}
                max={480}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                required
              />
            </label>
          </div>
          <label className="imp-field">
            <span>Apresentador</span>
            <input
              value={presenterName}
              onChange={(e) => setPresenterName(e.target.value)}
              placeholder="Nome do host"
            />
          </label>

          {error ? (
            <p className="webinar-launcher__error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="webinar-launcher__actions">
            <button type="submit" className="imp-btn imp-btn--primary" disabled={saving}>
              {saving ? 'Salvando…' : 'Criar rascunho'}
            </button>
            <Link to="/modules/webinar/webinars" className="imp-btn imp-btn--ghost">
              Cancelar
            </Link>
          </div>
        </form>
      </section>
    </WebinarSessionGate>
  )
}
