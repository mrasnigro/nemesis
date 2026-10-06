import { useState } from 'react'
import { Link } from 'react-router-dom'
import { webinarApi } from '../services/webinarPlatformApi.js'
import { useLoad } from '../hooks/useLoad.js'
import { errorMessage, formatDateTime } from '../utils/format.js'
import StatusPill from '../components/StatusPill.jsx'
import SubscriptionBanner from '../components/SubscriptionBanner.jsx'
import { PLATFORM_BASE } from '../PlatformLayout.jsx'

export default function PlatformDashboard() {
  const [mine, setMine] = useState(false)
  const stats = useLoad(() => webinarApi.stats({ mine }), [mine])
  const upcoming = useLoad(
    () => webinarApi.listWebinars({ pageSize: 10, sort: 'scheduledAt', from: new Date().toISOString().slice(0, 10), mine }),
    [mine],
  )

  const s = stats.data
  const rows = (upcoming.data?.data || [])
    .filter((webinar) => webinar.status !== 'cancelled' && webinar.status !== 'completed')
    .slice(0, 5)

  return (
    <section className="imp-module">
      <header className="webinar-page-header">
        <div>
          <h2>Webinars</h2>
          <p>Seus webinars, inscritos e presença num só lugar.</p>
        </div>
        <div className="imp-actions">
          <label className="webinar-toggle">
            <input type="checkbox" checked={mine} onChange={(event) => setMine(event.target.checked)} />
            Só os meus
          </label>
          <Link to={`${PLATFORM_BASE}/webinars/novo`} className="imp-btn imp-btn--primary">
            + Novo webinar
          </Link>
        </div>
      </header>

      <SubscriptionBanner />
      {stats.error ? <p className="webinar-note webinar-note--error">{errorMessage(stats.error)}</p> : null}

      <div className="imp-module__metrics">
        <article className="imp-metric">
          <p>Webinars</p>
          <strong className="accent">{s?.webinars.total ?? '—'}</strong>
          <span>{s ? `${s.webinars.completed} encerrados` : ' '}</span>
        </article>
        <article className="imp-metric">
          <p>Próximos</p>
          <strong>{s?.webinars.upcoming ?? '—'}</strong>
          <span>{s && s.webinars.live > 0 ? `${s.webinars.live} ao vivo agora` : 'Agendados e rascunhos'}</span>
        </article>
        <article className="imp-metric">
          <p>Leads</p>
          <strong>{s?.leads.total ?? '—'}</strong>
          <span>{s ? `${s.leads.attended} presentes` : ' '}</span>
        </article>
        <article className="imp-metric">
          <p>Presença</p>
          <strong className="success">{s ? `${s.leads.attendanceRate}%` : '—'}</strong>
          <span>Presentes entre inscritos</span>
        </article>
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h3>Próximos webinars</h3>
          </div>
          <Link to={`${PLATFORM_BASE}/webinars`} className="imp-btn imp-btn--ghost">
            Ver todos
          </Link>
        </div>
        {upcoming.loading && !upcoming.data ? <p className="webinar-note">Carregando…</p> : null}
        {upcoming.data && rows.length === 0 ? (
          <div className="imp-empty">Nenhum webinar à frente. Crie o primeiro para começar a captar leads.</div>
        ) : null}
        <div className="imp-list">
          {rows.map((webinar) => (
            <Link key={webinar.id} to={`${PLATFORM_BASE}/webinars/${webinar.id}`} className="imp-list-item">
              <div>
                <h3>{webinar.title}</h3>
                <p>
                  {formatDateTime(webinar.scheduledAt, webinar.timezone)} · {webinar.durationMinutes} min
                  {webinar.presenterName ? ` · ${webinar.presenterName}` : ''}
                </p>
              </div>
              <StatusPill status={webinar.status} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
