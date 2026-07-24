export { customers, getCustomerById } from './customers'
export { users, getUsersByCustomer } from './users'
export { permissions, rolePermissionMap } from './permissions'
export {
  moduleAssignments,
  getAssignmentForCustomer,
  getModuleCatalog,
} from './modules'
export { integrations } from './integrations'
export { activityLogs } from './logs'

import { customers } from './customers'
import { users } from './users'
import { moduleAssignments } from './modules'
import { integrations } from './integrations'
import { activityLogs } from './logs'
import { modules } from '../../modules'

/** Overview metrics derived from mock data — swap for API aggregates later */
export function getAdminOverviewMetrics() {
  const activeCustomers = customers.filter((c) => c.status === 'active').length
  const activeUsers = users.filter((u) => u.status === 'active').length
  const connectedIntegrations = integrations.filter((i) => i.status === 'connected').length
  const assignedModules = new Set(moduleAssignments.flatMap((a) => a.moduleIds)).size

  return [
    {
      id: 'customers',
      label: 'Clientes',
      value: String(customers.length),
      hint: `${activeCustomers} ativos`,
      accent: 'blue',
      trend: { direction: 'up', value: '2' },
    },
    {
      id: 'users',
      label: 'Usuários',
      value: String(users.length),
      hint: `${activeUsers} ativos`,
      accent: 'violet',
      trend: { direction: 'up', value: '4%' },
    },
    {
      id: 'modules',
      label: 'Módulos',
      value: String(modules.length),
      hint: `${assignedModules} em uso`,
      accent: 'cyan',
    },
    {
      id: 'integrations',
      label: 'Integrações',
      value: String(integrations.length),
      hint: `${connectedIntegrations} conectadas`,
      accent: 'emerald',
    },
  ]
}

export function getRecentActivity(limit = 5) {
  return [...activityLogs]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
}
