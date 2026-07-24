import { useState } from 'react'
import './AssignmentMatrix.css'

export default function AssignmentMatrix({ customers = [], modules = [], initialAssignments = [] }) {
  const [assignments, setAssignments] = useState(() =>
    Object.fromEntries(initialAssignments.map((item) => [item.customerId, new Set(item.moduleIds)]))
  )

  function toggle(customerId, moduleId) {
    setAssignments((prev) => {
      const next = { ...prev }
      const current = new Set(next[customerId] ?? [])
      if (current.has(moduleId)) {
        current.delete(moduleId)
      } else {
        current.add(moduleId)
      }
      next[customerId] = current
      return next
    })
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
      <p className="assignment-matrix__hint">
        Alterações são locais (mock). Pronto para conectar em PUT /customers/:id/modules.
      </p>
    </div>
  )
}
