import { useMemo } from 'react'
import { AssignmentMatrix, SectionHeader } from '../../components/admin'
import Panel from '../../components/Panel'
import { assignCustomerModules, assignUserModules } from '../../data/admin/store'
import { useAdminStore } from '../../hooks/useAdminStore'
import { getModuleCatalog } from '../../data/admin'
import { getModuleById } from '../../modules'
import './admin-shared.css'

export default function ModulesPage() {
  const { customers, users, moduleAssignments } = useAdminStore()
  const catalog = getModuleCatalog()

  const userAssignments = useMemo(
    () =>
      users
        .filter((user) => user.assignedModules?.length)
        .map((user) => ({
          userId: user.id,
          name: user.name,
          email: user.email,
          customerId: user.customerId,
          moduleIds: user.assignedModules,
        })),
    [users]
  )

  return (
    <section className="admin-page">
      <div className="admin-page__stack">
        <Panel>
          <SectionHeader
            title="Atribuir módulos por cliente"
            description="Habilite módulos do registry para cada conta. As alterações alimentam o acesso do workspace."
          />
          <AssignmentMatrix
            customers={customers}
            modules={catalog}
            initialAssignments={moduleAssignments}
            onChange={(customerId, moduleIds) => assignCustomerModules(customerId, moduleIds)}
          />
        </Panel>

        <Panel>
          <SectionHeader
            title="Módulos habilitados por cliente"
            description="Visão rápida do que cada conta pode liberar aos seus usuários."
          />
          <div className="admin-enabled-modules admin-enabled-modules--grid">
            {customers.map((customer) => (
              <article key={customer.id} className="admin-enabled-module">
                <strong>{customer.name}</strong>
                <span>{customer.plan}</span>
                <div className="data-table__chips">
                  {customer.modulesEnabled.length ? (
                    customer.modulesEnabled.map((moduleId) => (
                      <span key={moduleId} className="data-table__chip">
                        {getModuleById(moduleId)?.badge ?? moduleId}
                      </span>
                    ))
                  ) : (
                    <span className="data-table__secondary">Sem módulos</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            title="Atribuição por usuário"
            description="Acesso efetivo = módulos do cliente ∩ módulos do usuário."
          />
          <div className="admin-user-assignments">
            {userAssignments.map((item) => {
              const customer = customers.find((entry) => entry.id === item.customerId)
              const customerModules = customer?.modulesEnabled ?? []

              return (
                <article key={item.userId} className="admin-user-assignment">
                  <strong>{item.name}</strong>
                  <span>{item.email}</span>
                  <span className="data-table__secondary">{customer?.name ?? 'Cliente'}</span>
                  <div className="form-modal__checkboxes">
                    {customerModules.map((moduleId) => {
                      const checked = item.moduleIds.includes(moduleId)
                      return (
                        <label key={moduleId} className="form-modal__check">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = checked
                                ? item.moduleIds.filter((id) => id !== moduleId)
                                : [...item.moduleIds, moduleId]
                              assignUserModules(item.userId, next)
                            }}
                          />
                          {getModuleById(moduleId)?.title ?? moduleId}
                        </label>
                      )
                    })}
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
