import { useEffect, useState } from 'react'
import './AssignmentMatrix.css'

function toMap(initialAssignments) {
  return Object.fromEntries(
    initialAssignments.map((item) => [item.customerId, new Set(item.moduleIds)])
  )
}

export default function AssignmentMatrix({
  customers = [],
  modules = [],
  initialAssignments = [],
  onChange,
}) {
  const [assignments, setAssignments] = useState(() => toMap(initialAssignments))
  const [pending, setPending] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setAssignments(toMap(initialAssignments))
  }, [initialAssignments])

  async function toggle(customerId, moduleId) {
    const previous = assignments[customerId] ?? new Set()
    const current = new Set(previous)
    if (current.has(moduleId)) {
      current.delete(moduleId)
    } else {
      current.add(moduleId)
    }

    setAssignments((prev) => ({ ...prev, [customerId]: current }))
    setError('')
    if (!onChange) return

    setPending(customerId)
    try {
      await onChange(customerId, [...current])
    } catch (err) {
      setAssignments((prev) => ({ ...prev, [customerId]: previous }))
      setError(err?.message || 'Não foi possível salvar a alteração.')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="assignment-matrix-wrap">
      <table className="assignment-matrix">
        <thead>
          <tr>
            <th>Cliente</th>
            {modules.map((module) => (
              <th key={module.id} title={module.title}>
                {module.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>
                <strong>{customer.name}</strong>
                <span>{customer.plan}</span>
              </td>
              {modules.map((module) => {
                const checked = assignments[customer.id]?.has(module.id)
                return (
                  <td key={`${customer.id}-${module.id}`}>
                    <label className="assignment-matrix__toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(checked)}
                        disabled={pending === customer.id}
                        onChange={() => toggle(customer.id, module.id)}
                        aria-label={`${module.title} para ${customer.name}`}
                      />
                      <span />
                    </label>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {error ? <p className="form-modal__error">{error}</p> : null}
      <p className="assignment-matrix__hint">
        Remover um módulo do contrato também o remove dos usuários desse cliente.
      </p>
    </div>
  )
}
