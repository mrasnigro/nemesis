// Contracts shared by apps/web and apps/api. Keep this package dependency-free.

export const MODULE_IDS = Object.freeze(['training-ai', 'bdr', 'prospecting', 'webinar', 'radar', 'vsl'])

/** admin = IMP staff (central management). imp = a user that belongs to a customer. */
export const PLATFORM_ROLES = Object.freeze(['admin', 'imp'])

export const USER_PROFILES = Object.freeze(['customer_admin', 'sdr_bdr', 'closer'])

export const USER_STATUSES = Object.freeze(['active', 'invited', 'inactive'])

export const CUSTOMER_STATUSES = Object.freeze(['active', 'trial', 'suspended'])

export const CUSTOMER_PLANS = Object.freeze(['Starter', 'Growth', 'Enterprise'])

export function isModuleId(value) {
  return MODULE_IDS.includes(value)
}

/** A user can open a module only if both the customer contract and the user grant include it. */
export function effectiveModuleIds(customerModuleIds, userModuleIds) {
  const contracted = new Set(customerModuleIds)
  return MODULE_IDS.filter((id) => contracted.has(id) && userModuleIds.includes(id))
}
