import { Link } from 'react-router-dom'
import { STATUS_LABELS } from '../data/seeds.js'
import { useWebinar } from '../context/WebinarContext.jsx'

export default function WebinarEventsPage() {
  const { metrics, events, publishDraft, canManage } = useWebinar()

  return (
    <section className="imp-module">
      <div className="imp-module__metrics">
        <article className="imp-metric">
          <p>Próximos</p>
          <strong className="accent">{metrics.upcoming}</strong>
          <span>Eventos agendados</span>
        </article>
        <article className="imp-metric">
          <p>Em destaque</p>
          <strong>{metrics.liveOrSoon}</strong>
          <span>Janela de 7 dias</span>
        </article>
        <article className="imp-metric">
          <p>Presença média</p>
          <strong className="success">{metrics.avgAttendance}</strong>
          <span>Eventos concluídos</span>
        </article>
        <article className="imp-metric">
          <p>Reuniões geradas</p>
          <strong>{metrics.meetingsBooked}</strong>
          <span>Pós-webinar</span>
        </article>
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Gestão de eventos</h2>
            <p>Webinars do workspace — simulação operacional.</p>
          </div>
        </div>

        <div className="imp-list">
          {events.map((event) => (
            <div key={event.id} className="imp-list-item" style={{ cursor: 'default' }}>
              <div>
                <h3>{event.title}</h3>
                <p>
                  {new Date(event.startsAt).toLocaleString('pt-BR')} · {event.durationMin} min ·
                  Host {event.host}
                </p>
                <p>{event.description}</p>
              </div>
              <div className="imp-actions" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                <span
                  className={`imp-pill ${
                    event.status === 'completed'
                      ? 'imp-pill--green'
                      : event.status === 'draft'
                        ? 'imp-pill--muted'
                        : 'imp-pill--amber'
                  }`}
                >
                  {STATUS_LABELS[event.status]}
                </span>
                <Link to={`/modules/webinar/${event.id}`} className="imp-btn imp-btn--ghost">
                  Abrir
                </Link>
                {event.status === 'draft' ? (
                  <button
                    type="button"
                    className="imp-btn imp-btn--primary"
                    disabled={!canManage}
                    onClick={() => publishDraft(event.id)}
                  >
                    Publicar
                  </button>
                ) : null}
                {event.status === 'completed' ? (
                  <Link
                    to={`/modules/webinar/${event.id}/metricas`}
                    className="imp-btn imp-btn--ghost"
                  >
                    Métricas
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
