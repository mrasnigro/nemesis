import { useMemo, useState } from 'react'
import { SCHEDULE_HOURS } from '../data/catalogs.js'
import { useBdrSession } from '../hooks/useBdrSession.js'

function pad(n) {
  return String(n).padStart(2, '0')
}

function todayIsoLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function buildTimeSlots() {
  const [openH] = SCHEDULE_HOURS.open.split(':').map(Number)
  const [closeH] = SCHEDULE_HOURS.close.split(':').map(Number)
  const interval = SCHEDULE_HOURS.intervalMin
  const slots = []
  for (let mins = openH * 60; mins < closeH * 60; mins += interval) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    slots.push(`${pad(h)}:${pad(m)}`)
  }
  return slots
}

function endTimeFromStart(start) {
  const [h, m] = start.split(':').map(Number)
  const total = h * 60 + m + SCHEDULE_HOURS.intervalMin
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

/**
 * In-IMP scheduling — past dates blocked; hours 9–18 / 30 min.
 */
export default function ScheduleMeetingModal({ open, onClose }) {
  const { call, scheduleAllowed, prependMeeting } = useBdrSession()
  const slots = useMemo(() => buildTimeSlots(), [])
  const minDate = todayIsoLocal()
  const [date, setDate] = useState(minDate)
  const [time, setTime] = useState(slots[0] || '09:00')
  const [meetingNotes, setMeetingNotes] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  if (!open) return null

  const lead = call.currentLead
  const phone =
    call.mode === 'manual' && call.manualPhone ? call.manualPhone : lead?.phone || ''

  const handleSave = () => {
    setError('')
    setSaved(false)
    if (!scheduleAllowed) {
      setError('Aguarde a conexão da chamada')
      return
    }
    if (!date || date < minDate) {
      setError('Datas passadas não podem ser selecionadas.')
      return
    }
    if (!slots.includes(time)) {
      setError(`Horário fora do funcionamento (${SCHEDULE_HOURS.open} – ${SCHEDULE_HOURS.close}).`)
      return
    }

    const meeting = {
      id: `m_${Date.now()}`,
      leadName: lead?.name || 'Lead',
      company: lead?.company || (call.mode === 'manual' ? 'Manual' : ''),
      phone,
      date,
      time,
      endTime: endTimeFromStart(time),
      protocol: lead?.protocol || 'N/A',
      notes: meetingNotes,
      createdAt: new Date().toISOString(),
    }
    prependMeeting(meeting)
    setSaved(true)
  }

  return (
    <div className="bdr-modal-scrim" role="presentation" onClick={onClose}>
      <div
        className="bdr-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bdr-schedule-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="bdr-modal__header">
          <h3 id="bdr-schedule-title">Agendar Reunião</h3>
          <button type="button" className="bdr-modal__close" onClick={onClose} aria-label="Fechar">
            × Fechar
          </button>
        </header>

        <p className="bdr-script__hint">
          Funcionamento {SCHEDULE_HOURS.open} – {SCHEDULE_HOURS.close} · Intervalo:{' '}
          {SCHEDULE_HOURS.intervalMin} min
        </p>

        <label>
          Data
          <input
            type="date"
            min={minDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label>
          Hora início
          <select value={time} onChange={(e) => setTime(e.target.value)}>
            {slots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </label>

        <label>
          Hora fim
          <input type="text" readOnly value={endTimeFromStart(time)} />
        </label>

        <label>
          Detalhes / notas da reunião
          <textarea
            rows={3}
            value={meetingNotes}
            onChange={(e) => setMeetingNotes(e.target.value)}
          />
        </label>

        {error ? <p className="bdr-manual-form__error">{error}</p> : null}
        {saved ? (
          <p className="bdr-script__ok">
            Reunião salva. Finalize o atendimento com a disposição adequada (ex.: Agendamento /
            Retorno).
          </p>
        ) : null}

        <div className="bdr-modal__actions">
          <button type="button" className="bdr-discagem__schedule" onClick={handleSave}>
            Confirmar agendamento
          </button>
          <button type="button" className="bdr-modal__secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
