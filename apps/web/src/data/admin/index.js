import { modules } from '../../modules'

export { permissions, rolePermissionMap } from './permissions'
export {
  assignCustomerModules,
  assignUserModules,
  createCustomer,
  createUser,
  getAdminSnapshot,
  loadAdminData,
  resetAdminStore,
  subscribeAdminStore,
  updateCustomer,
  updateUser,
} from './store'

export const USER_PROFILE_LABELS = {
  customer_admin: 'Gestor do cliente',
  sdr_bdr: 'SDR/BDR',
  closer: 'Closer',
}

export function getModuleCatalog() {
  return modules.map((module) => ({
    id: module.id,
    title: module.title,
    status: module.status,
    path: module.path,
  }))
}

export function buildAdminOverviewMetrics({ customers, users, logs }) {
  const activeCustomers = customers.filter((customer) => customer.status === 'active').length
  const activeUsers = users.filter((user) => user.status === 'active').length
  const modulesInUse = new Set(customers.flatMap((customer) => customer.modulesEnabled)).size

  return [
    {
      id: 'customers',
      label: 'Clientes',
      value: String(customers.length),
      hint: `${activeCustomers} ativos`,
      accent: 'amber',
    },
    {
      id: 'users',
      label: 'Usuários',
      value: String(users.length),
      hint: `${activeUsers} ativos`,
      accent: 'amber',
    },
    {
      id: 'modules',
      label: 'Módulos',
      value: String(modules.length),
      hint: `${modulesInUse} em uso`,
      accent: 'amber',
    },
    {
      id: 'logs',
      label: 'Eventos',
      value: String(logs.length),
      hint: 'recentes na auditoria',
      accent: 'amber',
    },
  ]
}
