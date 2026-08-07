import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import WebinarSessionGate from '../components/WebinarSessionGate.jsx'
import { useWebinarSession } from '../context/WebinarSessionContext.jsx'
import {
  formatWebinarWhen,
  normalizeWebinar,
  webinarStatusLabel,
  webinarStatusTone,
} from '../utils/webinarNormalize.js'

export default function WebinarDetailPage() {
  const { webinarId } = useParams()
  const { apiGet, ensureSession, status } = useWebinarSession()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'idle' || status === 'error') void ensureSession()
  }, [ensureSession, status])

  useEffect(() => {
    if (!webinarId) return undefined
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const payload = await apiGet(`/client/webinars/${webinarId}`)
        const raw = payload?.webinar || payload
        if (!cancelled) setItem(normalizeWebinar(raw))
      } catch (err) {
        if (!cancelled) {
          setItem(null)
          setError(err instanceof Error ? err.message : 'Webinar não encontrado')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [apiGet, webinarId])

  return (
    <WebinarSessionGate>
      <section className="imp-module webinar-page">
        <header className="webinar-page__intro webinar-page__intro--row">
          <div>
            <h2>{item?.title || 'Detalhe do webinar'}</h2>
            <p>GET /client/webinars/:id · M3a</p>
          </div>
          <div className="training-ai__page-header-actions">
            <Link to="/modules/webinar/webinars" className="imp-btn imp-btn--ghost">
              ← Lista
            </Link>
          </div>
        </header>

        {loading ? <p className="webinar-launcher__note">Carregando…</p> : null}
        {error ? (
          <p className="webinar-launcher__error" role="alert">
            {error}
          </p>
        ) : null}

        {item ? (
          <div className="imp-panel">
            <div className="imp-panel__header">
              <div>
                <h2>{item.title}</h2>
                <p>{item.description || 'Sem descrição'}</p>
              </div>
              <span className={`imp-pill imp-pill--${webinarStatusTone(item.status)}`}>
                {webinarStatusLabel(item.status)}
              </span>
            </div>

            <dl className="webinar-m3__detail-grid">
              <div>
                <dt>ID</dt>
                <dd>{item.id}</dd>
              </div>
              <div>
                <dt>Quando</dt>
                <dd>{formatWebinarWhen(item.scheduledDate)}</dd>
              </div>
              <div>
                <dt>Duração</dt>
                <dd>{item.durationMinutes ? `${item.durationMinutes} min` : '—'}</dd>
              </div>
              <div>
                <dt>Apresentador</dt>
                <dd>{item.presenterName || '—'}</dd>
              </div>
              <div>
                <dt>Timezone</dt>
                <dd>{item.timezone || '—'}</dd>
              </div>
              <div>
                <dt>Máx. participantes</dt>
                <dd>{item.maxParticipants ?? '—'}</dd>
              </div>
            </dl>

            <p className="webinar-launcher__note" style={{ marginTop: '1rem' }}>
              Studio / sala ao vivo entram no M3c. Sidecar ainda pode abrir o FE legado se
              necessário.
            </p>
          </div>
        ) : null}
      </section>
    </WebinarSessionGate>
  )
}
