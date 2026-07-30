import { useState } from 'react'
import { formatIsoDatePt } from '../services/historyMapping.js'

/**
 * Meeting card with Ouvir Gravação / Anotações / Reenviar Email / dismiss.
 */
export default function MeetingCard({ meeting, compact = false, onUpdate, onRemove }) {
  const [showNotes, setShowNotes] = useState(false)
  const [draftNotes, setDraftNotes] = useState(meeting.notes || '')
  const [toast, setToast] = useState('')

  const playRecording = () => {
    if (!meeting.recordingUrl) {
      setToast('Sem gravação vinculada (mock).')
      return
    }
    setToast(`Simulação: ouvir gravação — ${meeting.recordingUrl}`)
  }

  const resendEmail = () => {
    const at = new Date().toISOString()
    onUpdate?.(meeting.id, { emailResentAt: at })
    setToast(
      `E-mail de convite reenviado (simulado) para ${meeting.email || 'contato sem e-mail'}.`,
    )
  }

  const saveNotes = () => {
    onUpdate?.(meeting.id, { notes: draftNotes })
    setToast('Anotações salvas.')
    setShowNotes(false)
  }

  return (
    <li className={`bdr-meeting-card${compact ? ' bdr-meeting-card--compact' : ''}`}>
      <div className="bdr-meeting-card__top">
        <div>
          <strong>{meeting.leadName}</strong>
          <span>{meeting.company}</span>
        </div>
        <button
          type="button"
          className="bdr-meeting-card__dismiss"
          aria-label="Remover agendamento"
          onClick={() => onRemove?.(meeting.id)}
        >
          ×
        </button>
      </div>

      <span>
        {formatIsoDatePt(meeting.date)} · {meeting.time}
        {meeting.endTime ? ` – ${meeting.endTime}` : ''}
      </span>
      <span>{meeting.phone}</span>
      <span>Protocolo: {meeting.protocol || 'N/A'}</span>
      {meeting.email ? <span>{meeting.email}</span> : null}
      {meeting.notes && !showNotes ? (
        <span className="bdr-meeting-card__notes-preview">{meeting.notes}</span>
      ) : null}
      {meeting.emailResentAt ? (
        <span className="bdr-script__ok">
          Convite reenviado em {new Date(meeting.emailResentAt).toLocaleString('pt-BR')}
        </span>
      ) : null}

      {!compact ? (
        <div className="bdr-meeting-card__actions">
          <button type="button" onClick={playRecording}>
            Ouvir Gravação
          </button>
          <button type="button" onClick={() => setShowNotes((v) => !v)}>
            Anotações
          </button>
          <button type="button" onClick={resendEmail}>
            Reenviar Email
          </button>
        </div>
      ) : (
        <div className="bdr-meeting-card__actions bdr-meeting-card__actions--compact">
          <button type="button" onClick={() => setShowNotes(true)}>
            Ver
          </button>
          <button type="button" onClick={resendEmail}>
            Reenviar
          </button>
        </div>
      )}

      {showNotes ? (
        <div className="bdr-meeting-card__notes-editor">
          <textarea
            rows={3}
            value={draftNotes}
            onChange={(e) => setDraftNotes(e.target.value)}
            placeholder="Anotações da reunião…"
          />
          <div className="bdr-meeting-card__actions">
            <button type="button" onClick={saveNotes}>
              Salvar anotações
            </button>
            <button type="button" onClick={() => setShowNotes(false)}>
              Fechar
            </button>
          </div>
        </div>
      ) : null}

      {toast ? <p className="bdr-script__hint">{toast}</p> : null}
    </li>
  )
}
