import { useState } from 'react'
import { formatIsoDatePt } from '../services/historyMapping.js'

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 6h18M8 6V4h8v2m-1 0v14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6h10zM10 11v6M14 11v6"
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

function IconClock() {
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

function IconVolume() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5 6 9H2v6h4l5 4V5zm4.5 4a3.5 3.5 0 0 1 0 6M18 7a7 7 0 0 1 0 10"
      />
    </svg>
  )
}

function IconNotes() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      />
    </svg>
  )
}

function IconMail() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 0 8 7 8-7"
      />
    </svg>
  )
}

function IconFlag() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22V15"
      />
    </svg>
  )
}

/**
 * Day meeting card — Reuniões do Dia layout from sample.
 */
export default function MeetingCard({ meeting, onUpdate, onRemove }) {
  const [showNotes, setShowNotes] = useState(false)
  const [confirmResend, setConfirmResend] = useState(false)
  const [toast, setToast] = useState('')

  const playRecording = () => {
    if (!meeting.recordingUrl) {
      setToast('Sem gravação vinculada (mock).')
      return
    }
    setToast(`Simulação: ouvir gravação — ${meeting.recordingUrl}`)
  }

  const confirmResendEmail = () => {
    const at = new Date().toISOString()
    onUpdate?.(meeting.id, { emailResentAt: at })
    setConfirmResend(false)
    setToast(
      `E-mail de convite reenviado (simulado) para ${meeting.email || 'contato sem e-mail'}.`,
    )
  }

  const dateTimeLabel = `${formatIsoDatePt(meeting.date)} às ${meeting.time}`

  return (
    <article className="bdr-meeting-card">
      <div className="bdr-meeting-card__top">
        <div>
          <p className="bdr-meeting-card__name">{meeting.leadName}</p>
          <p className="bdr-meeting-card__company">{meeting.company}</p>
        </div>
        <button
          type="button"
          className="bdr-meeting-card__delete"
          title="Deletar agendamento"
          aria-label="Deletar agendamento"
          onClick={() => onRemove?.(meeting.id)}
        >
          <IconTrash />
        </button>
      </div>

      <div className="bdr-meeting-card__meta">
        <div className="bdr-meeting-card__meta-item">
          <IconPhone />
          <span>{meeting.phone}</span>
        </div>
        <div className="bdr-meeting-card__meta-item">
          <IconClock />
          <span>{meeting.time}</span>
        </div>
      </div>

      <div className="bdr-meeting-card__recording">
        <button type="button" onClick={playRecording}>
          <IconVolume />
          Ouvir Gravação
        </button>
      </div>

      <div className="bdr-meeting-card__actions">
        <button type="button" onClick={() => setShowNotes(true)}>
          <IconNotes />
          Anotações
        </button>
        <button type="button" onClick={() => setConfirmResend(true)}>
          <IconMail />
          Reenviar Email
        </button>
      </div>

      {toast ? <p className="bdr-meeting-card__toast">{toast}</p> : null}

      {showNotes ? (
        <div className="bdr-modal-scrim" role="presentation" onClick={() => setShowNotes(false)}>
          <div
            className="bdr-notes-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`bdr-notes-title-${meeting.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="bdr-notes-modal__header">
              <h2 id={`bdr-notes-title-${meeting.id}`} className="bdr-notes-modal__title">
                Anotações do Agendamento
                <IconFlag />
              </h2>
              <button
                type="button"
                className="bdr-notes-modal__close"
                aria-label="Fechar"
                onClick={() => setShowNotes(false)}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    d="M18 6 6 18M6 6l12 12"
                  />
                </svg>
              </button>
            </header>

            <div className="bdr-notes-modal__body">
              <div className="bdr-notes-modal__fields">
                <div>
                  <p className="bdr-notes-modal__label">Cliente</p>
                  <p className="bdr-notes-modal__value">{meeting.leadName}</p>
                </div>
                <div>
                  <p className="bdr-notes-modal__label">Empresa</p>
                  <p className="bdr-notes-modal__value">{meeting.company}</p>
                </div>
                <div>
                  <p className="bdr-notes-modal__label">Data e Hora</p>
                  <p className="bdr-notes-modal__value">{dateTimeLabel}</p>
                </div>
              </div>

              <div className="bdr-notes-modal__notes">
                <p className="bdr-notes-modal__label bdr-notes-modal__label--notes">Anotações</p>
                <div className="bdr-notes-modal__notes-box">
                  <p>
                    {meeting.notes?.trim()
                      ? meeting.notes
                      : 'Nenhuma anotação registrada para este agendamento.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {confirmResend ? (
        <div
          className="bdr-modal-scrim"
          role="presentation"
          onClick={() => setConfirmResend(false)}
        >
          <div
            className="bdr-resend-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`bdr-resend-title-${meeting.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={`bdr-resend-title-${meeting.id}`}>Reenviar Email</h3>
            <p>Deseja realmente reenviar o email de confirmação agora?</p>
            <div className="bdr-resend-modal__actions">
              <button
                type="button"
                className="bdr-resend-modal__cancel"
                onClick={() => setConfirmResend(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="bdr-resend-modal__confirm"
                onClick={confirmResendEmail}
              >
                Reenviar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  )
}
