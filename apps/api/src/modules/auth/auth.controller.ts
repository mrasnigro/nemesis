import type { Request, Response } from 'express'
import { z } from 'zod'
import { config } from '../../core/config.js'
import { login, sessionCookieName } from './auth.service.js'

const loginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

function publicUser(user: NonNullable<Request['user']>) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    customerId: user.customerId,
    modules: user.modules,
  }
}

export async function loginController(req: Request, res: Response) {
  const body = loginBody.parse(req.body)
  const result = await login(body.username, body.password)
  res.cookie(sessionCookieName(), result.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  })
  res.json({ data: publicUser(result.user) })
}

export async function logoutController(_req: Request, res: Response) {
  res.clearCookie(sessionCookieName(), { path: '/' })
  res.status(204).send()
}

export async function meController(req: Request, res: Response) {
  res.json({ data: publicUser(req.user!) })
}
