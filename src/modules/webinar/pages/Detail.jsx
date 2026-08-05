import { Link, useParams } from 'react-router-dom'
import WebinarEmptyState from '../components/WebinarEmptyState.jsx'
import { IconChart, IconUsers } from '../components/WebinarIcons.jsx'
import WebinarPageToolbar from '../components/WebinarPageToolbar.jsx'
import { PARTICIPANT_STATUS, STATUS_LABELS } from '../data/seeds.js'
import { useWebinar } from '../context/WebinarContext.jsx'
import { eventStatusPillClass, participantStatusPillClass } from '../utils/status.js'

export default function WebinarDetailPage() {
  const { eventId } = useParams()
  const { getEvent, getParticipants, markAttendance, canParticipants, canMetrics } = useWebinar()
  const event = getEvent(eventId)
  const participants = getParticipants(eventId)

  if (!event) {
    return (
      <section className="imp-module webinar-page">
        <WebinarEmptyState
          title="Evento não encontrado"
          copy="Este webinar não existe no workspace atual ou o link está desatualizado."
          actionTo="/modules/webinar"
          actionLabel="Voltar aos eventos"
        />
      </section>
    )
  }

  return (
    <section className="imp-module webinar-page">
      <WebinarPageToolbar backTo="/modules/webinar" backLabel="Voltar aos eventos">
        {canMetrics ? (
          <Link to={`/modules/webinar/${eventId}/metricas`} className="imp-btn imp-btn--primary">
            <IconChart />
            Ver métricas
          </Link>
        ) : null}
      </WebinarPageToolbar>

      <div className="imp-panel webinar-hero">
        <div className="webinar-hero__title-row">
          <h2>{event.title}</h2>
          <span className={eventStatusPillClass(event.status)}>
            {STATUS_LABELS[event.status]}
          </span>
        </div>
        <p className="webinar-hero__meta">
          {new Date(event.startsAt).toLocaleString('pt-BR')} · Host {event.host} ·{' '}
          {event.registrants} inscritos
        </p>
        <p className="webinar-hero__desc">{event.description}</p>
        <div className="webinar-hero__chips">
          <span className="imp-pill imp-pill--amber">{event.durationMin} min</span>
        </div>
      </div>

      <div className="imp-panel">
        <div className="imp-panel__header">
          <div>
            <h2>Participantes</h2>
            <p>Controle de inscrição e presença (mock).</p>
          </div>
        </div>

        {!canParticipants ? (
          <WebinarEmptyState
            icon={IconUsers}
            title="Sem permissão"
            copy="Seu perfil não pode visualizar participantes deste webinar."
          />
        ) : participants.length === 0 ? (
          <WebinarEmptyState
            icon={IconUsers}
            title="Nenhum participante"
            copy="Este evento ainda não possui inscritos na simulação."
          />
        ) : (
          <div className="webinar-table-wrap">
            <table className="imp-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Empresa</th>
                  <th>Status</th>
                  <th>Min. assistidos</th>
                  <th>Presença</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((person) => (
                  <tr key={person.id}>
                    <td>{person.name}</td>
                    <td>{person.company}</td>
                    <td>
                      <span className={participantStatusPillClass(person.status)}>
                        {PARTICIPANT_STATUS[person.status]}
                      </span>
                    </td>
                    <td>{person.watchMin}</td>
                    <td>
                      <div className="webinar-attendance">
                        <button
                          type="button"
                          className="imp-btn imp-btn--success"
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
          </div>
        )}
      </div>
    </section>
  )
}
