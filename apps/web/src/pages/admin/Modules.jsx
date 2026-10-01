import { useState } from 'react'
import { AssignmentMatrix, SectionHeader } from '../../components/admin'
import Panel from '../../components/Panel'
import { getModuleCatalog } from '../../data/admin'
import { assignCustomerModules, assignUserModules } from '../../data/admin/store'
import { useAdminStore } from '../../hooks/useAdminStore'
import { getModuleById } from '../../modules'
import AdminLoadState from './AdminLoadState'
import './admin-shared.css'

const catalog = getModuleCatalog()

export default function ModulesPage() {
  const { customers, users, moduleAssignments } = useAdminStore()
  const [pendingUserId, setPendingUserId] = useState(null)
  const [userError, setUserError] = useState('')
  const customerUsers = users.filter((user) => user.role === 'imp' && user.customerId)

  async function toggleUserModule(user, moduleId) {
    const next = user.assignedModules.includes(moduleId)
      ? user.assignedModules.filter((id) => id !== moduleId)
      : [...user.assignedModules, moduleId]
    setPendingUserId(user.id)
    setUserError('')
    try {
      await assignUserModules(user.id, next)
    } catch (err) {
      setUserError(err.message)
    } finally {
      setPendingUserId(null)
    }
  }

  return (
    <AdminLoadState>
      <section className="admin-page">
        <div className="admin-page__stack">
          <Panel>
            <SectionHeader
              title="Contrato de módulos por cliente"
              description="Habilite módulos para cada conta. O acesso do workspace muda no próximo carregamento do usuário."
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
              title="Módulos contratados por cliente"
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
            {userError ? <p className="form-modal__error">{userError}</p> : null}
            <div className="admin-user-assignments">
              {customerUsers.map((user) => {
                const customer = customers.find((entry) => entry.id === user.customerId)
                const customerModules = customer?.modulesEnabled ?? []

                return (
                  <article key={user.id} className="admin-user-assignment">
                    <strong>{user.name}</strong>
                    <span>{user.email ?? user.username}</span>
                    <span className="data-table__secondary">{customer?.name ?? 'Cliente'}</span>
                    <div className="form-modal__checkboxes">
                      {customerModules.length ? (
                        customerModules.map((moduleId) => (
                          <label key={moduleId} className="form-modal__check">
                            <input
                              type="checkbox"
                              checked={user.assignedModules.includes(moduleId)}
                              disabled={pendingUserId === user.id}
                              onChange={() => toggleUserModule(user, moduleId)}
                            />
                            {getModuleById(moduleId)?.title ?? moduleId}
                          </label>
                        ))
                      ) : (
                        <span className="data-table__secondary">Cliente sem módulos contratados</span>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </Panel>
        </div>
      </section>
    </AdminLoadState>
  )
}
