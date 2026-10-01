import { Router } from 'express'
import { config } from '../../core/config.js'
import { asyncHandler } from '../../core/http.js'
import { rateLimit } from '../../core/rateLimit.js'
import { loginController, logoutController, meController } from './auth.controller.js'
import { requireAuth } from './auth.middleware.js'

export const authRouter = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.LOGIN_RATE_LIMIT_MAX,
  key: (req) => `${req.ip}:${String(req.body?.username ?? '').trim().toLowerCase()}`,
})

authRouter.post('/login', loginLimiter, asyncHandler(loginController))
authRouter.post('/logout', asyncHandler(logoutController))
authRouter.get('/me', requireAuth, asyncHandler(meController))
