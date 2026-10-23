import { CONTACT_METHODS } from '../data/catalogs.js'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBdrSession } from '../hooks/useBdrSession.js'

function MethodIcon({ id }) {
  if (id === 'whatsapp') {
    return (
      <span className="bdr-manual-modal__method-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M17.5 14.4c-.3-.1-1.6-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.1-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.5-.8-2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.7.5-.1 1.6-.6 1.8-1.3.2-.6.2-1.2.2-1.3 0-.1-.2-.2-.5-.3zM12.1 21c-1.6 0-3.1-.4-4.5-1.2L4 21l1.2-3.5C4.4 16 4 14.4 4 12.7 4 8.2 7.6 4.6 12.1 4.6s8.1 3.6 8.1 8.1S16.6 21 12.1 21zm0-14.9c-3.8 0-6.8 3-6.8 6.6 0 1.5.5 2.9 1.4 4l-.9 2.6 2.7-.9c1 .6 2.2.9 3.5.9 3.8 0 6.8-3 6.8-6.6s-3-6.6-6.7-6.6z"
          />
        </svg>
      </span>
    )
  }

  return (
    <span className="bdr-manual-modal__method-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V21c0 .6-.4 1-1 1C10.6 22 2 13.4 2 2.9 2 2.4 2.4 2 3 2h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z"
        />
      </svg>
    </span>
  )
}

/**
 * Ligação Manual modal — sample SDRDialer overlay.
 * On start, closes and shows the dialing status band on Discagem.
 */
export default function ManualDialForm({ open = true, onClose }) {
  const navigate = useNavigate()
  const { startManual } = useBdrSession()
  const [phone, setPhone] = useState('')
  const [otherPhone, setOtherPhone] = useState('')
  const [contactMethod, setContactMethod] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return undefined
    setPhone('')
    setOtherPhone('')
    setContactMethod('')
    setError('')
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const phoneReady = phone.replace(/\D/g, '').length >= 8
  const methodReady = Boolean(contactMethod)
  const canStart = phoneReady && methodReady

  function handleSubmit(event) {
    event.preventDefault()
    if (!canStart) return
    const result = startManual(phone, contactMethod, otherPhone)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
    navigate('/modules/bdr/discagem?mode=manual', { replace: true })
  }

  return (
    <div className="bdr-manual-modal" role="presentation" onClick={onClose}>
      <div
        className="bdr-manual-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bdr-manual-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="bdr-manual-modal__header">
          <h3 id="bdr-manual-title">Ligação Manual</h3>
          <button
            type="button"
            className="bdr-manual-modal__close"
            aria-label="Fechar"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <form className="bdr-manual-modal__form" onSubmit={handleSubmit}>
          <label className="bdr-manual-modal__field">
            Número de Telefone
            <input
              type="tel"
              value={phone}
              placeholder="(11) 99999-9999"
              autoFocus
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <label className="bdr-manual-modal__field">
            Conectar com outro número (opcional)
            <input
              type="tel"
              value={otherPhone}
              placeholder="Deixe vazio para tocar o seu ramal"
              onChange={(e) => setOtherPhone(e.target.value)}
            />
          </label>

          <fieldset className="bdr-manual-modal__methods">
            <legend>Tipo de Contato</legend>
            {CONTACT_METHODS.map((method) => (
              <button
                key={method.id}
                type="button"
                className={`bdr-manual-modal__method bdr-manual-modal__method--${method.id}${
                  contactMethod === method.id ? ' is-selected' : ''
                }`}
                onClick={() => setContactMethod(method.id)}
              >
                <MethodIcon id={method.id} />
                <span>{method.label}</span>
              </button>
            ))}
          </fieldset>

          {error ? <p className="bdr-manual-form__error">{error}</p> : null}

          <button
            type="submit"
            className={`bdr-manual-modal__submit${canStart ? ' is-ready' : ''}`}
            disabled={!canStart}
          >
            Iniciar Ligação
          </button>
        </form>
      </div>
    </div>
  )
}
