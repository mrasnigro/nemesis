import { useMemo, useState } from 'react'
import {
  buildMonthGrid,
  formatLongDatePt,
  isPastIsoDate,
  meetingDateSet,
  meetingsForDate,
  monthTitlePt,
  todayIsoLocal,
} from '../services/historyMapping.js'
import MeetingCard from './MeetingCard.jsx'

function ChevronIcon({ dir }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d={dir === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'}
      />
    </svg>
  )
}

/**
 * Agendamentos Realizados — calendar (1/3) + Reuniões do Dia (2/3).
 */
export default function MeetingsCalendar({ meetings, onUpdateMeeting, onRemoveMeeting }) {
  const initial = useMemo(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  }, [])
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [selectedDate, setSelectedDate] = useState(null)
  const todayIso = useMemo(() => todayIsoLocal(), [])

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month])
  const datesWithMeetings = useMemo(() => meetingDateSet(meetings), [meetings])
  const dayMeetings = useMemo(
    () => (selectedDate ? meetingsForDate(meetings, selectedDate) : []),
    [meetings, selectedDate],
  )

  const shiftMonth = (delta) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  return (
    <div className="bdr-agenda">
      <div className="bdr-agenda__col bdr-agenda__col--cal">
        <section className="bdr-agenda__calendar">
          <header className="bdr-agenda__cal-header">
            <h2>Calendário</h2>
            <div className="bdr-agenda__nav">
              <button type="button" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
                <ChevronIcon dir="prev" />
              </button>
              <button type="button" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
                <ChevronIcon dir="next" />
              </button>
            </div>
          </header>

          <p className="bdr-agenda__month">{monthTitlePt(year, month)}</p>

          <div className="bdr-agenda__weekdays">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="bdr-agenda__grid">
            {cells.map((cell, idx) => {
              if (!cell) return <div key={`e-${idx}`} className="bdr-agenda__day-pad" />
              const past = isPastIsoDate(cell.iso, todayIso)
              const selected = cell.iso === selectedDate
              const has = datesWithMeetings.has(cell.iso)
              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={past}
                  className={[
                    'bdr-agenda__day',
                    past ? 'is-past' : '',
                    has && !selected ? 'has-meeting' : '',
                    selected ? 'is-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    if (!past) setSelectedDate(cell.iso)
                  }}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>

          {selectedDate ? (
            <div className="bdr-agenda__selected">
              <p className="bdr-agenda__selected-label">Data selecionada:</p>
              <p className="bdr-agenda__selected-value">{formatLongDatePt(selectedDate)}</p>
            </div>
          ) : null}
        </section>
      </div>

      <div className="bdr-agenda__col bdr-agenda__col--day">
        <section className="bdr-agenda__day-panel">
          <h2>{selectedDate ? 'Reuniões do Dia' : 'Selecione uma data'}</h2>

          {!selectedDate ? (
            <p className="bdr-agenda__empty">Selecione uma data no calendário.</p>
          ) : dayMeetings.length === 0 ? (
            <p className="bdr-agenda__empty">Nenhum agendamento neste dia.</p>
          ) : (
            <div className="bdr-agenda__meetings">
              {dayMeetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onUpdate={onUpdateMeeting}
                  onRemove={onRemoveMeeting}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
