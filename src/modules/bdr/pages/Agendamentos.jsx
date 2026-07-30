import { Link } from 'react-router-dom'
import MeetingsCalendar from '../components/MeetingsCalendar.jsx'
import { useBdrSession } from '../hooks/useBdrSession.js'
import '../../../pages/modules/Bdr.css'
import '../styles/bdr-foundation.css'

export default function BdrAgendamentosPage() {
  const { meetings, updateMeeting, removeMeeting } = useBdrSession()

  return (
    <section className="bdr-section">
      <div className="bdr-discagem__header">
        <h2>Agendamentos</h2>
        <Link to="/modules/bdr" className="bdr-page__back">
          ← Voltar
        </Link>
      </div>

      <article className="bdr-section__card">
        <MeetingsCalendar
          meetings={meetings}
          onUpdateMeeting={updateMeeting}
          onRemoveMeeting={removeMeeting}
        />
      </article>
    </section>
  )
}
