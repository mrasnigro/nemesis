import type { ModuleId, PlatformRole, UserProfile } from '@imp/shared'

export type AuthUser = {
  id: string
  username: string
  name: string
  email: string | null
  role: PlatformRole
  profile: UserProfile | null
  customerId: string | null
  customerName: string | null
  /** Effective modules: customer contract ∩ user grant. Always empty for platform admins. */
  modules: ModuleId[]
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
      requestId?: string
    }
  }
}

export {}
