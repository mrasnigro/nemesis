export { customers, getCustomerById, getCustomerMetrics } from './customers'
export { users, getUsersByCustomer, getUserById } from './users'
export { permissions, rolePermissionMap } from './permissions'
export {
  moduleAssignments,
  getAssignmentForCustomer,
  getModuleCatalog,
  apiGetCustomerModules,
  apiPutCustomerModules,
} from './modules'
export { activityLogs } from './logs'
export {
  createCustomer,
  createUser,
  assignCustomerModules,
  assignUserModules,
  subscribeAdminStore,
  getAdminSnapshot,
} from './store'

import { customers } from './customers'
import { users } from './users'
import { moduleAssignments } from './modules'
import { activityLogs } from './logs'
import { modules } from '../../modules'

/** Overview metrics derived from mock data */
export function getAdminOverviewMetrics() {
  const activeCustomers = customers.filter((c) => c.status === 'active').length
  const activeUsers = users.filter((u) => u.status === 'active').length
  const assignedModules = new Set(moduleAssignments.flatMap((a) => a.moduleIds)).size
  const recentEvents = activityLogs.length

  return [
    {
      id: 'customers',
      label: 'Clientes',
      value: String(customers.length),
      hint: `${activeCustomers} ativos`,
      accent: 'amber',
      trend: { direction: 'up', value: '2' },
    },
    {
      id: 'users',
      label: 'Usuários',
      value: String(users.length),
      hint: `${activeUsers} ativos`,
      accent: 'amber',
      trend: { direction: 'up', value: '4%' },
    },
    {
      id: 'modules',
      label: 'Módulos',
      value: String(modules.length),
      hint: `${assignedModules} em uso`,
      accent: 'amber',
    },
    {
      id: 'logs',
      label: 'Eventos',
      value: String(recentEvents),
      hint: 'na trilha de auditoria',
      accent: 'amber',
    },
  ]
}

export function getRecentActivity(limit = 5) {
  return [...activityLogs]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
}
