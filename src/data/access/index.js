/**
 * Mock access layer: Customer -> Users -> Assigned Modules
 *
 * API-ready shapes for future integration:
 * - GET  /customers/:id/modules
 * - PUT  /customers/:id/modules
 * - GET  /users/:id/modules
 * - PUT  /users/:id/modules
 * - GET  /workspace/access
 */

import { customers, getCustomerById } from '../admin/customers'
import { getUserById, users } from '../admin/users'
import { getAssignmentForCustomer, moduleAssignments } from '../admin/modules'
import { getModuleById, modules as moduleRegistry } from '../../modules'

/**
 * Maps login usernames (AuthContext) to workspace user profiles.
 * Swap for session/JWT claims later.
 */
export const authWorkspaceMap = {
  bdr: {
    userId: 'usr_002',
    customerId: 'cus_001',
  },
  sdr: {
    userId: 'usr_006',
    customerId: 'cus_002',
  },
  imp: {
    userId: 'usr_002',
    customerId: 'cus_001',
  },
}

/** Live view of user module grants derived from users.assignedModules */
export function getUserModuleAssignments() {
  return users
    .filter((user) => user.assignedModules?.length)
    .map((user) => ({
      userId: user.id,
      customerId: user.customerId,
      moduleIds: [...user.assignedModules],
    }))
}

/** @deprecated Prefer getUserModuleAssignments() for live data */
export const userModuleAssignments = getUserModuleAssignments()

export function getUserModuleAssignment(userId) {
  return getUserModuleAssignments().find((item) => item.userId === userId) ?? null
}

export function getCustomerModuleIds(customerId) {
  const assignment = getAssignmentForCustomer(customerId)
  if (assignment) return [...assignment.moduleIds]

  const customer = getCustomerById(customerId)
  return customer ? [...customer.modulesEnabled] : []
}

export function getUserModuleIds(userId) {
  const user = getUserById(userId)
  if (user?.assignedModules) return [...user.assignedModules]

  const assignment = getUserModuleAssignment(userId)
  return assignment ? [...assignment.moduleIds] : []
}

/** Effective access = intersection(customer modules, user modules) */
export function resolveEffectiveModuleIds(customerId, userId) {
  const customerModules = new Set(getCustomerModuleIds(customerId))
  return getUserModuleIds(userId).filter((moduleId) => customerModules.has(moduleId))
}

export function resolveModulesFromIds(moduleIds = []) {
  return moduleIds.map((id) => getModuleById(id)).filter(Boolean)
}

export function canAccessModule(customerId, userId, moduleId) {
  return resolveEffectiveModuleIds(customerId, userId).includes(moduleId)
}

export async function fetchCustomerModules(customerId) {
  return {
    customerId,
    moduleIds: getCustomerModuleIds(customerId),
  }
}

export async function updateCustomerModules(customerId, moduleIds) {
  const assignment = getAssignmentForCustomer(customerId)
  if (assignment) {
    assignment.moduleIds = [...moduleIds]
  }

  const customer = getCustomerById(customerId)
  if (customer) {
    customer.modulesEnabled = [...moduleIds]
  }

  return fetchCustomerModules(customerId)
}

export async function fetchUserModules(userId) {
  return {
    userId,
    moduleIds: getUserModuleIds(userId),
  }
}

export async function updateUserModules(userId, moduleIds) {
  const user = getUserById(userId)
  if (user) {
    const allowed = new Set(getCustomerModuleIds(user.customerId))
    user.assignedModules = moduleIds.filter((id) => allowed.has(id))
  }

  return fetchUserModules(userId)
}

export async function fetchWorkspaceAccess(authUsername) {
  const mapping = authWorkspaceMap[authUsername]
  if (!mapping) {
    return {
      customer: null,
      user: null,
      moduleIds: [],
      modules: [],
    }
  }

  const customer = getCustomerById(mapping.customerId)
  const user = getUserById(mapping.userId)
  const moduleIds = resolveEffectiveModuleIds(mapping.customerId, mapping.userId)

  return {
    customer,
    user,
    moduleIds,
    modules: resolveModulesFromIds(moduleIds),
  }
}

export function getAccessOverview() {
  return {
    customers,
    moduleAssignments,
    userModuleAssignments: getUserModuleAssignments(),
    catalogSize: moduleRegistry.length,
  }
}
