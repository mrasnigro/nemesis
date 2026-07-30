import { Link } from 'react-router-dom'
import { SCHEDULE_HOURS } from '../data/catalogs.js'
import { useBdrSession } from '../hooks/useBdrSession.js'
import '../../../pages/modules/Bdr.css'
import '../styles/bdr-foundation.css'

export default function BdrAgendamentosPage() {
  const { meetings } = useBdrSession()

  return (
    <section className="bdr-section">
      <div className="bdr-discagem__header">
        <h2>Agendamentos Realizados</h2>
        <Link to="/modules/bdr" className="bdr-page__back">
          ← Voltar
        </Link>
      </div>

      <article className="bdr-section__card">
        <p className="bdr-foundation-placeholder">
          Horário de funcionamento: {SCHEDULE_HOURS.open} – {SCHEDULE_HOURS.close} · Intervalo:{' '}
          {SCHEDULE_HOURS.intervalMin} min (calendário completo na fase de scheduling).
        </p>

        <ul className="bdr-meeting-list">
          {meetings.map((meeting) => (
            <li key={meeting.id} className="bdr-meeting-card">
              <strong>{meeting.leadName}</strong>
              <span>{meeting.company}</span>
              <span>
                {meeting.date} · {meeting.time}
              </span>
              <span>{meeting.phone}</span>
              <span>{meeting.protocol}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  )
}
