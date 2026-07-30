import { useMemo, useState } from 'react'
import {
  buildMonthGrid,
  formatIsoDatePt,
  meetingDateSet,
  meetingsForDate,
  monthTitlePt,
  pad2,
} from '../services/historyMapping.js'
import { SCHEDULE_HOURS } from '../data/catalogs.js'
import MeetingCard from './MeetingCard.jsx'

/**
 * Calendar + confirmed meetings list for Agendamentos.
 */
export default function MeetingsCalendar({ meetings, onUpdateMeeting, onRemoveMeeting }) {
  const initial = useMemo(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  }, [])
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  })

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month])
  const datesWithMeetings = useMemo(() => meetingDateSet(meetings), [meetings])
  const dayMeetings = useMemo(
    () => meetingsForDate(meetings, selectedDate),
    [meetings, selectedDate],
  )

  const shiftMonth = (delta) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  return (
    <div className="bdr-agenda">
      <div className="bdr-agenda__top">
        <section className="bdr-agenda__calendar">
          <header className="bdr-agenda__cal-header">
            <h3>Calendário</h3>
            <div className="bdr-agenda__nav">
              <button type="button" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
                ‹
              </button>
              <strong>{monthTitlePt(year, month)}</strong>
              <button type="button" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
                ›
              </button>
            </div>
          </header>
          <div className="bdr-agenda__weekdays">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="bdr-agenda__grid">
            {cells.map((cell, idx) => {
              if (!cell) return <span key={`e-${idx}`} className="bdr-agenda__day is-empty" />
              const selected = cell.iso === selectedDate
              const has = datesWithMeetings.has(cell.iso)
              return (
                <button
                  key={cell.iso}
                  type="button"
                  className={`bdr-agenda__day${selected ? ' is-selected' : ''}${has ? ' has-meeting' : ''}`}
                  onClick={() => setSelectedDate(cell.iso)}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>
        </section>

        <aside className="bdr-agenda__hours">
          <h3>Horários</h3>
          <p>
            Funcionamento <strong>{SCHEDULE_HOURS.open} – {SCHEDULE_HOURS.close}</strong>
          </p>
          <p>
            Intervalo: <strong>{SCHEDULE_HOURS.intervalMin} min</strong>
          </p>
          <p className="bdr-script__hint">Datas passadas bloqueadas ao agendar na Discagem.</p>
        </aside>
      </div>

      <section className="bdr-agenda__day-panel">
        <h3>
          {selectedDate
            ? `Agendamentos em ${formatIsoDatePt(selectedDate)}`
            : 'Selecione uma data'}
        </h3>
        {!selectedDate ? (
          <p className="bdr-agenda__empty">Selecione uma data no calendário</p>
        ) : dayMeetings.length === 0 ? (
          <p className="bdr-agenda__empty">Nenhum agendamento neste dia.</p>
        ) : (
          <ul className="bdr-meeting-list">
            {dayMeetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onUpdate={onUpdateMeeting}
                onRemove={onRemoveMeeting}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="bdr-agenda__confirmed">
        <h3>Agendamentos Confirmados</h3>
        <ul className="bdr-meeting-list">
          {meetings.map((meeting) => (
            <MeetingCard
              key={`all-${meeting.id}`}
              meeting={meeting}
              compact
              onUpdate={onUpdateMeeting}
              onRemove={onRemoveMeeting}
            />
          ))}
        </ul>
      </section>
    </div>
  )
}
