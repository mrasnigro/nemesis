import { customers } from './customers'
import { modules } from '../../modules'

/**
 * Module assignment matrix per customer.
 * Ready for API:
 *   GET  /customers/:id/modules
 *   PUT  /customers/:id/modules  { moduleIds: string[] }
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

/** Mock API: list modules enabled for a customer */
export async function apiGetCustomerModules(customerId) {
  const assignment = getAssignmentForCustomer(customerId)
  return {
    customerId,
    moduleIds: assignment ? [...assignment.moduleIds] : [],
  }
}

/** Mock API: replace customer module assignments */
export async function apiPutCustomerModules(customerId, moduleIds) {
  const assignment = getAssignmentForCustomer(customerId)
  if (assignment) {
    assignment.moduleIds = [...moduleIds]
  }

  const customer = customers.find((item) => item.id === customerId)
  if (customer) {
    customer.modulesEnabled = [...moduleIds]
  }

  return apiGetCustomerModules(customerId)
}
