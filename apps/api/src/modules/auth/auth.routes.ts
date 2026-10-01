import { Router } from 'express'
import { asyncHandler } from '../../core/http.js'
import { loginController, logoutController, meController } from './auth.controller.js'
import { requireAuth } from './auth.middleware.js'

export const authRouter = Router()

authRouter.post('/login', asyncHandler(loginController))
authRouter.post('/logout', asyncHandler(logoutController))
authRouter.get('/me', requireAuth, asyncHandler(meController))
