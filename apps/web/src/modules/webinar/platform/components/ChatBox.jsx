import { useEffect, useRef, useState } from 'react'
import { errorMessage, formatTime } from '../utils/format.js'

/**
 * Presentational chat. The parent owns the messages (and how often they refresh) and the send call,
 * so staff and visitors share one look while using different endpoints.
 * `mine(message)` decides which side a message sits on.
 */
export default function ChatBox({ messages, onSend, mine, disabled = false, placeholder = 'Escreva uma mensagem…', height = 360 }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)
  const last = messages[messages.length - 1]?.id

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [last])

  async function submit(event) {
    event.preventDefault()
    const message = text.trim()
    if (!message || sending) return
    setSending(true)
    setError('')
    try {
      await onSend(message)
      setText('')
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível enviar a mensagem.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="webinar-chat">
      <div className="imp-chat webinar-chat__list" style={{ maxHeight: height, minHeight: Math.min(height, 200) }}>
        {messages.length === 0 ? <p className="webinar-chat__empty">Nenhuma mensagem ainda.</p> : null}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`imp-chat__bubble ${mine(message) ? 'imp-chat__bubble--user' : 'imp-chat__bubble--ai'}`}
          >
            <span className="imp-chat__meta">
              {message.senderName}
              {message.role === 'presenter' ? ' · apresentador' : ''} · {formatTime(message.createdAt)}
            </span>
            {message.message}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {error ? <p className="webinar-chat__error">{error}</p> : null}
      <form className="webinar-chat__form" onSubmit={submit}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={placeholder}
          maxLength={1000}
          disabled={disabled || sending}
          aria-label="Mensagem"
        />
        <button type="submit" className="imp-btn imp-btn--primary" disabled={disabled || sending || !text.trim()}>
          Enviar
        </button>
      </form>
    </div>
  )
}
