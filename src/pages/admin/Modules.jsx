import { useEffect, useState } from 'react'
import { AssignmentMatrix, SectionHeader } from '../../components/admin'
import Panel from '../../components/Panel'
import {
  apiGetCustomerModules,
  apiPutCustomerModules,
  customers,
  getModuleCatalog,
  getUserById,
  moduleAssignments,
} from '../../data/admin'
import { userModuleAssignments } from '../../data/access'
import './admin-shared.css'

export default function ModulesPage() {
  const catalog = getModuleCatalog()
  const [assignments, setAssignments] = useState(moduleAssignments)

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      const next = await Promise.all(
        customers.map(async (customer) => {
          const result = await apiGetCustomerModules(customer.id)
          return {
            customerId: customer.id,
            customerName: customer.name,
            moduleIds: result.moduleIds,
          }
        })
      )

      if (!cancelled) {
        setAssignments(next)
      }
    }

    hydrate()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSave(customerId, moduleIds) {
    await apiPutCustomerModules(customerId, moduleIds)
    const refreshed = await apiGetCustomerModules(customerId)
    setAssignments((prev) =>
      prev.map((item) =>
        item.customerId === customerId
          ? { ...item, moduleIds: refreshed.moduleIds }
          : item
      )
    )
  }

  return (
    <section className="admin-page">
      <div className="admin-page__stack">
        <Panel>
          <SectionHeader
            title="Atribuição de módulos por cliente"
            description="Controle quais módulos do registry cada cliente pode acessar. Mock API: GET/PUT /customers/:id/modules."
          />
          <AssignmentMatrix
            customers={customers}
            modules={catalog}
            initialAssignments={assignments}
            onChange={handleSave}
          />
        </Panel>

        <Panel>
          <SectionHeader
            title="Atribuição por usuário"
            description="Acesso efetivo = interseção (módulos do cliente ∩ módulos do usuário). Mock API: GET/PUT /users/:id/modules."
          />
          <div className="admin-user-assignments">
            {userModuleAssignments.map((item) => {
              const user = getUserById(item.userId)
              return (
                <article key={item.userId} className="admin-user-assignment">
                  <strong>{user?.name ?? item.userId}</strong>
                  <span>{user?.email}</span>
                  <div className="data-table__chips">
                    {item.moduleIds.map((moduleId) => (
                      <span key={moduleId} className="data-table__chip">
                        {moduleId}
                      </span>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        </Panel>
      </div>
    </section>
  )
}
