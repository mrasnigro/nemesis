import type { ModuleId } from '@imp/shared'
import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../../core/errors.js'
import type { AuthUser } from '../../types/express.js'
import { sessionCookieName, userFromDevHeader, userFromToken } from './auth.service.js'

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[sessionCookieName()]
    if (typeof token === 'string' && token.length > 0) {
      req.user = await userFromToken(token)
      next()
      return
    }
    const header = req.header('x-dev-user')
    req.user = await userFromDevHeader(header)
    next()
  } catch (error) {
    next(error)
  }
}

export function requireModule(moduleId: ModuleId) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user
    if (!user) {
      next(new AppError(401, 'UNAUTHORIZED', 'Missing session'))
      return
    }
    if (user.role !== 'admin' && !user.modules.includes(moduleId)) {
      next(new AppError(403, 'MODULE_FORBIDDEN', 'Module access denied'))
      return
    }
    if (!user.customerId) {
      next(new AppError(403, 'MODULE_FORBIDDEN', 'User is not bound to a customer'))
      return
    }
    next()
  }
}

export function isPlatformAdmin(user: AuthUser): boolean {
  return user.role === 'admin'
}

export function isAccountManager(user: AuthUser): boolean {
  return isPlatformAdmin(user) || (user.profile === 'customer_admin' && Boolean(user.customerId))
}

/** Platform admins and customer admins. Services still scope every query with managedCustomerId(). */
export function requireAccountManager(req: Request, _res: Response, next: NextFunction) {
  if (!req.user || !isAccountManager(req.user)) {
    next(new AppError(403, 'FORBIDDEN', 'Account management requires an administrator'))
    return
  }
  next()
}

export function requirePlatformAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user || !isPlatformAdmin(req.user)) {
    next(new AppError(403, 'FORBIDDEN', 'Only IMP administrators can do this'))
    return
  }
  next()
}

/** null = every customer (platform admin); otherwise the only customer this manager may touch. */
export function managedCustomerId(user: AuthUser): string | null {
  return isPlatformAdmin(user) ? null : user.customerId
}
