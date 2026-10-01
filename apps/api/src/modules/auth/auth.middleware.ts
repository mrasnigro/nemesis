import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../../core/errors.js'
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

export function requireModule(moduleId: string) {
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
