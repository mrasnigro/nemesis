import { customers } from './customers'
import { modules } from '../../modules'

/**
 * Module assignment matrix per customer.
 * Ready for API: GET/PUT /customers/:id/modules
 */
export const moduleAssignments = customers.map((customer) => ({
  customerId: customer.id,
  customerName: customer.name,
  moduleIds: [...customer.modulesEnabled],
}))

export function getAssignmentForCustomer(customerId) {
  return moduleAssignments.find((item) => item.customerId === customerId) ?? null
}

export function getModuleCatalog() {
  return modules.map((module) => ({
    id: module.id,
    title: module.title,
    status: module.status,
    path: module.path,
  }))
}
