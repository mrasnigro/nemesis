import type { Request, Response } from 'express'
import { z } from 'zod'
import { config } from '../../core/config.js'
import type { AuthUser } from '../../types/express.js'
import { login, SESSION_TTL_SECONDS, sessionCookieName } from './auth.service.js'

const loginBody = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200),
})

function publicUser(user: AuthUser) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    profile: user.profile,
    customer: user.customerId ? { id: user.customerId, name: user.customerName } : null,
    modules: user.modules,
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.NODE_ENV === 'production',
    path: '/',
  }
}

export async function loginController(req: Request, res: Response) {
  const body = loginBody.parse(req.body)
  const result = await login(body.username, body.password, req.ip)
  res.cookie(sessionCookieName(), result.token, { ...cookieOptions(), maxAge: SESSION_TTL_SECONDS * 1000 })
  res.json({ data: publicUser(result.user) })
}

export async function logoutController(_req: Request, res: Response) {
  res.clearCookie(sessionCookieName(), cookieOptions())
  res.status(204).send()
}

export async function meController(req: Request, res: Response) {
  res.json({ data: publicUser(req.user!) })
}
