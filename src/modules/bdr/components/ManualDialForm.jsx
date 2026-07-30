import { CONTACT_METHODS } from '../data/catalogs.js'
import { useState } from 'react'
import { useBdrSession } from '../hooks/useBdrSession.js'

export default function ManualDialForm() {
  const { startManual, dialAllowed } = useBdrSession()
  const [phone, setPhone] = useState('')
  const [contactMethod, setContactMethod] = useState('phone')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (!dialAllowed) {
      setError('Disponível apenas com status Em atendimento.')
      return
    }
    const result = startManual(phone, contactMethod)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
  }

  return (
    <form className="bdr-manual-form" onSubmit={handleSubmit}>
      <h3>Ligação Manual</h3>
      <label>
        Número de Telefone
        <input
          type="tel"
          value={phone}
          placeholder="(11) 99999-9999"
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>

      <fieldset>
        <legend>Tipo de Contato</legend>
        {CONTACT_METHODS.map((method) => (
          <button
            key={method.id}
            type="button"
            className={`bdr-manual-form__method${
              contactMethod === method.id ? ' is-selected' : ''
            }`}
            onClick={() => setContactMethod(method.id)}
          >
            {method.label}
          </button>
        ))}
      </fieldset>

      {error ? <p className="bdr-manual-form__error">{error}</p> : null}

      <button type="submit" className="bdr-section__cta" disabled={!dialAllowed}>
        Iniciar Ligação
      </button>
    </form>
  )
}
