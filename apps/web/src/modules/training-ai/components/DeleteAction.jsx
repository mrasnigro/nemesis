import { useState } from 'react'

/**
 * "Excluir" button with a confirmation. The server refuses to delete something still in use
 * (an agent or playbook used by a scenario, a scenario with sessions); its message is shown here.
 */
export default function DeleteAction({ label = 'Excluir', confirmText, onDelete, onDeleted }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    if (!window.confirm(confirmText)) return
    setBusy(true)
    setError('')
    const result = await onDelete()
    setBusy(false)
    if (result.ok) onDeleted?.()
    else setError(result.error || 'Não foi possível excluir.')
  }

  return (
    <>
      <button type="button" className="imp-btn imp-btn--ghost" onClick={handleClick} disabled={busy}>
        {busy ? 'Excluindo…' : label}
      </button>
      {error ? (
        <p className="training-ai__composer-hint" role="alert" style={{ flexBasis: '100%', margin: 0 }}>
          {error}
        </p>
      ) : null}
    </>
  )
}
