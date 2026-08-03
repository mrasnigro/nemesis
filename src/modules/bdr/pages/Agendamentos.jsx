import MeetingsCalendar from '../components/MeetingsCalendar.jsx'
import { useBdrSession } from '../hooks/useBdrSession.js'
import '../../../pages/modules/Bdr.css'
import '../styles/bdr-foundation.css'

export default function BdrAgendamentosPage() {
  const { meetings, updateMeeting, removeMeeting } = useBdrSession()

  return (
    <section className="bdr-section bdr-agenda-page">
      <MeetingsCalendar
        meetings={meetings}
        onUpdateMeeting={updateMeeting}
        onRemoveMeeting={removeMeeting}
      />
    </section>
  )
}
