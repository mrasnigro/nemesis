import { Link } from 'react-router-dom'
import { STATUS_LABELS } from '../data/seeds.js'
import { eventStatusPillClass } from '../utils/status.js'
import { IconChart, IconOpen } from './WebinarIcons.jsx'

export default function WebinarEventCard({ event, canManage, onPublish }) {
  return (
    <article className="imp-list-item webinar-event-card">
      <div>
        <div className="webinar-event-card__title-row">
          <h3>{event.title}</h3>
          <span className={eventStatusPillClass(event.status)}>
            {STATUS_LABELS[event.status]}
          </span>
        </div>
        <p className="webinar-event-card__meta">
          {new Date(event.startsAt).toLocaleString('pt-BR')} · {event.durationMin} min · Host{' '}
          {event.host}
        </p>
        <p className="webinar-event-card__desc">{event.description}</p>
      </div>

      <div className="webinar-event-card__aside">
        <div className="webinar-event-card__actions">
          <Link to={`/modules/webinar/${event.id}`} className="imp-btn imp-btn--ghost">
            <IconOpen />
            Abrir
          </Link>
          {event.status === 'draft' ? (
            <button
              type="button"
              className="imp-btn imp-btn--primary"
              disabled={!canManage}
              onClick={() => onPublish(event.id)}
            >
              Publicar
            </button>
          ) : null}
          {event.status === 'completed' ? (
            <Link
              to={`/modules/webinar/${event.id}/metricas`}
              className="imp-btn imp-btn--ghost"
            >
              <IconChart />
              Métricas
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  )
}
