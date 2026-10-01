export type ModuleId = 'training-ai' | 'bdr' | 'prospecting' | 'webinar' | 'radar' | 'vsl'
export type PlatformRole = 'admin' | 'imp'
export type UserProfile = 'customer_admin' | 'sdr_bdr' | 'closer'
export type UserStatus = 'active' | 'invited' | 'inactive'
export type CustomerStatus = 'active' | 'trial' | 'suspended'
export type CustomerPlan = 'Starter' | 'Growth' | 'Enterprise'

export declare const MODULE_IDS: readonly ['training-ai', 'bdr', 'prospecting', 'webinar', 'radar', 'vsl']
export declare const PLATFORM_ROLES: readonly ['admin', 'imp']
export declare const USER_PROFILES: readonly ['customer_admin', 'sdr_bdr', 'closer']
export declare const USER_STATUSES: readonly ['active', 'invited', 'inactive']
export declare const CUSTOMER_STATUSES: readonly ['active', 'trial', 'suspended']
export declare const CUSTOMER_PLANS: readonly ['Starter', 'Growth', 'Enterprise']

export declare function isModuleId(value: unknown): value is ModuleId
export declare function effectiveModuleIds(
  customerModuleIds: readonly string[],
  userModuleIds: readonly string[],
): ModuleId[]
