import { useMemo, useState } from 'react'
import { SCHEDULE_HOURS } from '../data/catalogs.js'
import { useBdrSession } from '../hooks/useBdrSession.js'
import {
  buildMonthGrid,
  formatIsoDatePt,
  isPastIsoDate,
  meetingDateSet,
  monthTitlePt,
  todayIsoLocal,
} from '../services/historyMapping.js'

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M18 6 6 18M6 6l12 12"
      />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 2v2m8-2v2M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
      />
    </svg>
  )
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l2.5 2.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"
      />
    </svg>
  )
}

function IconChevron({ dir }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
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

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V21c0 .6-.4 1-1 1C10.6 22 2 13.4 2 2.9 2 2.4 2.4 2 3 2h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z"
      />
    </svg>
  )
}

function IconClockSm() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l2.5 2.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"
      />
    </svg>
  )
}

function IconId() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
      />
    </svg>
  )
}

function IconCalSm() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 2v2m8-2v2M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
      />
    </svg>
  )
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M18 6 6 18M6 6l12 12"
      />
    </svg>
  )
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function buildTimeSlots() {
  const [openH] = SCHEDULE_HOURS.open.split(':').map(Number)
  const [closeH] = SCHEDULE_HOURS.close.split(':').map(Number)
  const interval = SCHEDULE_HOURS.intervalMin
  const slots = []
  for (let mins = openH * 60; mins < closeH * 60; mins += interval) {
    slots.push(`${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`)
  }
  return slots
}

function endTimeFromStart(start) {
  const [h, m] = start.split(':').map(Number)
  const total = h * 60 + m + SCHEDULE_HOURS.intervalMin
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

/**
 * Full-screen Agendamentos UI opened from Discagem "Agendar Reunião".
 */
export default function ScheduleMeetingModal({ open, onClose }) {
  const { call, scheduleAllowed, meetings, prependMeeting, removeMeeting } = useBdrSession()
  const todayIso = useMemo(() => todayIsoLocal(), [])
  const slots = useMemo(() => buildTimeSlots(), [])
  const initial = useMemo(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  }, [])

  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(slots[0] || '09:00')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month])
  const datesWithMeetings = useMemo(() => meetingDateSet(meetings), [meetings])

  if (!open) return null

  const lead = call.currentLead
  const phone =
    call.mode === 'manual' && call.manualPhone ? call.manualPhone : lead?.phone || ''

  const shiftMonth = (delta) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  const handlePickDate = (iso, past) => {
    if (past) return
    setSelectedDate(iso)
    setError('')
    setSaved(false)
  }

  const handleSave = () => {
    setError('')
    setSaved(false)
    if (!scheduleAllowed) {
      setError('Aguarde a conexão da chamada')
      return
    }
    if (!selectedDate || selectedDate < todayIso) {
      setError('Selecione uma data válida (datas passadas bloqueadas).')
      return
    }
    if (!slots.includes(selectedTime)) {
      setError(`Horário fora do funcionamento (${SCHEDULE_HOURS.open} – ${SCHEDULE_HOURS.close}).`)
      return
    }

    const meeting = {
      id: `m_${Date.now()}`,
      leadName: lead?.name || 'Lead',
      company: lead?.company || (call.mode === 'manual' ? 'Manual' : ''),
      phone,
      email: lead?.email || '',
      date: selectedDate,
      time: selectedTime,
      endTime: endTimeFromStart(selectedTime),
      protocol: lead?.protocol || 'N/A',
      notes: '',
      recordingUrl: '',
      createdAt: new Date().toISOString(),
      emailResentAt: null,
      linkedHistoryId: null,
    }
    prependMeeting(meeting)
    setSaved(true)
  }

  return (
    <div className="bdr-schedule-page" role="dialog" aria-modal="true" aria-labelledby="bdr-schedule-page-title">
      <header className="bdr-schedule-page__header">
        <div className="bdr-schedule-page__header-inner">
          <h1 id="bdr-schedule-page-title">Agendamentos</h1>
          <button type="button" className="bdr-schedule-page__close" onClick={onClose}>
            Fechar
            <IconClose />
          </button>
        </div>
      </header>

      <main className="bdr-schedule-page__main">
        <div className="bdr-schedule-page__grid">
          <div className="bdr-schedule-page__cal-col">
            <section className="bdr-schedule-card">
              <div className="bdr-schedule-card__head">
                <h2>
                  Calendário
                  <IconCalendar />
                </h2>
                <div className="bdr-schedule-card__nav">
                  <button type="button" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
                    <IconChevron dir="prev" />
                  </button>
                  <span>{monthTitlePt(year, month)}</span>
                  <button type="button" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
                    <IconChevron dir="next" />
                  </button>
                </div>
              </div>

              <div className="bdr-schedule-card__weekdays">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div className="bdr-schedule-card__grid">
                {cells.map((cell, idx) => {
                  if (!cell) return <div key={`e-${idx}`} className="bdr-schedule-card__pad" />
                  const past = isPastIsoDate(cell.iso, todayIso)
                  const selected = cell.iso === selectedDate
                  const has = datesWithMeetings.has(cell.iso)
                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      disabled={past}
                      className={[
                        'bdr-schedule-card__day',
                        past ? 'is-past' : '',
                        has && !selected ? 'has-meeting' : '',
                        selected ? 'is-selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => handlePickDate(cell.iso, past)}
                    >
                      {cell.day}
                    </button>
                  )
                })}
              </div>
            </section>
          </div>

          <div className="bdr-schedule-page__hours-col">
            <section className="bdr-schedule-card">
              <div className="bdr-schedule-card__head">
                <h2>
                  Horários
                  <IconClock />
                </h2>
                <button type="button" className="bdr-schedule-card__gear" aria-label="Configurações">
                  ⚙️
                </button>
              </div>

              <div className="bdr-schedule-card__hours-box">
                <p className="bdr-schedule-card__hours-label">Horário de funcionamento</p>
                <p className="bdr-schedule-card__hours-value">
                  {SCHEDULE_HOURS.open} - {SCHEDULE_HOURS.close}
                </p>
                <p className="bdr-schedule-card__hours-interval">
                  Intervalo: {SCHEDULE_HOURS.intervalMin} min
                </p>
              </div>

              {selectedDate ? (
                <div className="bdr-schedule-card__slots">
                  <p className="bdr-schedule-card__hours-label">
                    Horários para {formatIsoDatePt(selectedDate)}
                  </p>
                  <div className="bdr-schedule-card__slot-grid">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        className={`bdr-schedule-card__slot${
                          selectedTime === slot ? ' is-selected' : ''
                        }`}
                        onClick={() => setSelectedTime(slot)}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="bdr-schedule-card__confirm"
                    disabled={!scheduleAllowed}
                    onClick={handleSave}
                  >
                    Confirmar agendamento
                  </button>
                  {error ? <p className="bdr-schedule-card__error">{error}</p> : null}
                  {saved ? (
                    <p className="bdr-schedule-card__ok">Reunião salva com sucesso.</p>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>
        </div>

        <section className="bdr-schedule-card bdr-schedule-card--confirmed">
          <h2>Agendamentos Confirmados</h2>
          <div className="bdr-schedule-confirmed">
            {meetings.length === 0 ? (
              <p className="bdr-schedule-confirmed__empty">Nenhum agendamento confirmado.</p>
            ) : (
              meetings.map((meeting) => (
                <article key={meeting.id} className="bdr-schedule-confirmed__item">
                  <div className="bdr-schedule-confirmed__top">
                    <div>
                      <p className="bdr-schedule-confirmed__name">{meeting.leadName}</p>
                      <p className="bdr-schedule-confirmed__company">{meeting.company}</p>
                    </div>
                    <button
                      type="button"
                      className="bdr-schedule-confirmed__remove"
                      aria-label="Remover agendamento"
                      onClick={() => removeMeeting?.(meeting.id)}
                    >
                      <IconX />
                    </button>
                  </div>
                  <div className="bdr-schedule-confirmed__meta">
                    <div>
                      <IconCalSm />
                      <span>{formatIsoDatePt(meeting.date)}</span>
                    </div>
                    <div>
                      <IconClockSm />
                      <span>{meeting.time}</span>
                    </div>
                    <div>
                      <IconPhone />
                      <span>{meeting.phone}</span>
                    </div>
                    <div>
                      <IconId />
                      <span>{meeting.protocol || 'N/A'}</span>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
