import { Link, useParams } from 'react-router-dom'
import { useWebinar } from '../context/WebinarContext.jsx'

export default function WebinarMetricsPage() {
  const { eventId } = useParams()
  const { getEvent, getParticipants, canMetrics } = useWebinar()
  const event = getEvent(eventId)
  const participants = getParticipants(eventId)

  if (!canMetrics) {
    return (
      <section className="imp-module">
        <div className="imp-empty">Sem permissão para métricas.</div>
      </section>
    )
  }

  if (!event) {
    return (
      <section className="imp-module">
        <div className="imp-empty">
          Evento não encontrado. <Link to="/modules/webinar">Voltar</Link>
        </div>
      </section>
    )
  }

  const attended = participants.filter((p) => p.status === 'attended').length
  const noShow = participants.filter((p) => p.status === 'no_show').length
  const registered = participants.length || event.registrants
  const liveAttendance =
    participants.length > 0
      ? Math.round((attended / participants.length) * 100)
      : event.attendanceRate
  const avgWatch =
    participants.length > 0
      ? Math.round(
          participants.reduce((sum, p) => sum + p.watchMin, 0) / Math.max(attended, 1),
        )
      : Math.round(event.durationMin * 0.7)

  return (
    <section className="imp-module">
      <div className="imp-actions">
        <Link to={`/modules/webinar/${eventId}`} className="imp-btn imp-btn--ghost">
          ← Voltar ao evento
        </Link>
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Métricas de presença</h2>
            <p>{event.title}</p>
          </div>
        </div>
      </div>

      <div className="imp-module__metrics">
        <article className="imp-metric">
          <p>Inscritos</p>
          <strong>{registered}</strong>
          <span>Base do evento</span>
        </article>
        <article className="imp-metric">
          <p>Presentes</p>
          <strong className="success">{attended || event.attended}</strong>
          <span>Check-in confirmado</span>
        </article>
        <article className="imp-metric">
          <p>Taxa de presença</p>
          <strong className="accent">{liveAttendance}%</strong>
          <span>Sobre a lista</span>
        </article>
        <article className="imp-metric">
          <p>No-shows</p>
          <strong>{noShow}</strong>
          <span>Para reengajamento</span>
        </article>
      </div>

      <div className="imp-grid-2">
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Engajamento</h2>
              <p>Indicadores simulados do evento.</p>
            </div>
          </div>
          <p style={{ margin: '0 0 0.5rem', color: 'var(--text-muted)' }}>
            Tempo médio assistido: <strong style={{ color: 'var(--text-h)' }}>{avgWatch} min</strong>
          </p>
          <div className="imp-progress">
            <span style={{ width: `${Math.min(100, liveAttendance)}%` }} />
          </div>
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Engajamento estimado: {event.engagement || Math.min(95, liveAttendance + 6)}%
          </p>
        </div>
        <div className="imp-panel">
          <div className="imp-panel__header">
            <div>
              <h2>Próximos passos</h2>
              <p>Workflow recomendado pós-evento.</p>
            </div>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-muted)' }}>
            <li style={{ marginBottom: '0.4rem' }}>Exportar presentes para Prospecção / BDR</li>
            <li style={{ marginBottom: '0.4rem' }}>Reengajar no-shows com VSL curto</li>
            <li style={{ marginBottom: '0.4rem' }}>Agendar follow-up em até 24h</li>
          </ul>
          <div className="imp-actions" style={{ marginTop: '1rem' }}>
            <Link to="/modules/prospecting" className="imp-btn imp-btn--ghost">
              Abrir Prospecção
            </Link>
            <Link to="/modules/bdr" className="imp-btn imp-btn--primary">
              Abrir BDR
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
