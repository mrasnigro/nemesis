import { Link, useParams } from 'react-router-dom'
import { PARTICIPANT_STATUS, STATUS_LABELS } from '../data/seeds.js'
import { useWebinar } from '../context/WebinarContext.jsx'

export default function WebinarDetailPage() {
  const { eventId } = useParams()
  const { getEvent, getParticipants, markAttendance, canParticipants, canMetrics } = useWebinar()
  const event = getEvent(eventId)
  const participants = getParticipants(eventId)

  if (!event) {
    return (
      <section className="imp-module">
        <div className="imp-empty">
          Evento não encontrado. <Link to="/modules/webinar">Voltar</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="imp-module">
      <div className="imp-actions">
        <Link to="/modules/webinar" className="imp-btn imp-btn--ghost">
          ← Voltar aos eventos
        </Link>
        {canMetrics ? (
          <Link to={`/modules/webinar/${eventId}/metricas`} className="imp-btn imp-btn--primary">
            Ver métricas
          </Link>
        ) : null}
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>{event.title}</h2>
            <p>
              {STATUS_LABELS[event.status]} ·{' '}
              {new Date(event.startsAt).toLocaleString('pt-BR')} · {event.registrants} inscritos
            </p>
          </div>
          <span className="imp-pill imp-pill--amber">{event.durationMin} min</span>
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>{event.description}</p>
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Participantes</h2>
            <p>Controle de inscrição e presença (mock).</p>
          </div>
        </div>

        {!canParticipants ? (
          <div className="imp-empty">Sem permissão para ver participantes.</div>
        ) : participants.length === 0 ? (
          <div className="imp-empty">Nenhum participante neste evento ainda.</div>
        ) : (
          <table className="imp-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Empresa</th>
                <th>Status</th>
                <th>Min. assistidos</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {participants.map((person) => (
                <tr key={person.id}>
                  <td>{person.name}</td>
                  <td>{person.company}</td>
                  <td>
                    <span
                      className={`imp-pill ${
                        person.status === 'attended'
                          ? 'imp-pill--green'
                          : person.status === 'no_show'
                            ? 'imp-pill--rose'
                            : 'imp-pill--muted'
                      }`}
                    >
                      {PARTICIPANT_STATUS[person.status]}
                    </span>
                  </td>
                  <td>{person.watchMin}</td>
                  <td>
                    <div className="imp-actions">
                      <button
                        type="button"
                        className="imp-btn imp-btn--ghost"
                        onClick={() => markAttendance(eventId, person.id, 'attended')}
                      >
                        Presente
                      </button>
                      <button
                        type="button"
                        className="imp-btn imp-btn--ghost"
                        onClick={() => markAttendance(eventId, person.id, 'no_show')}
                      >
                        No-show
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
