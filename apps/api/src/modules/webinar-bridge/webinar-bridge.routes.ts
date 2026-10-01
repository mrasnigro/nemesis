import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../core/http.js'
import { requireAuth, requireModule } from '../auth/auth.middleware.js'
import { mintWebinarHandoff } from './webinar-bridge.service.js'

const handoffBody = z.object({
  returnTo: z.string().max(2000).optional(),
})

export const webinarBridgeRouter = Router()

webinarBridgeRouter.use(requireAuth, requireModule('webinar'))

webinarBridgeRouter.post(
  '/handoff',
  asyncHandler(async (req, res) => {
    const { returnTo } = handoffBody.parse(req.body ?? {})
    res.status(201).json({ data: await mintWebinarHandoff(req.user!, returnTo) })
  }),
)
