import express, { Router, type Request } from 'express'
import { config } from '../../core/config.js'
import { chunkController, streamStateController, watchController } from './stream.controller.js'
import { MAX_CHUNK_BYTES } from './stream.service.js'
import { asyncHandler } from '../../core/http.js'
import { rateLimit } from '../../core/rateLimit.js'
import { requireAuth, requireModule } from '../auth/auth.middleware.js'
import { mySubscriptionRouter } from '../webinar-plans/plans.routes.js'
import {
  createAccessCodeController,
  createWebinarController,
  deactivateAccessCodeController,
  deleteLeadController,
  deleteWebinarController,
  exportLeadsController,
  getLeadController,
  getWebinarController,
  leadStatsController,
  listAccessCodesController,
  listChatController,
  listLeadsController,
  listWebinarsController,
  postChatController,
  publicAccessController,
  publicAttendController,
  publicChatListController,
  publicChatPostController,
  publicRegisterController,
  publicSessionController,
  setStatusController,
  statsController,
  updateLeadController,
  updateWebinarController,
} from './webinar.controller.js'

/** Signed-in users of the Webinar module: `/api/modules/webinar`. */
export const webinarRouter = Router()

webinarRouter.use(requireAuth, requireModule('webinar'))
webinarRouter.use(mySubscriptionRouter)

webinarRouter.get('/stats', asyncHandler(statsController))

webinarRouter.get('/webinars', asyncHandler(listWebinarsController))
webinarRouter.post('/webinars', asyncHandler(createWebinarController))
webinarRouter.get('/webinars/:webinarId', asyncHandler(getWebinarController))
webinarRouter.patch('/webinars/:webinarId', asyncHandler(updateWebinarController))
webinarRouter.delete('/webinars/:webinarId', asyncHandler(deleteWebinarController))
webinarRouter.post('/webinars/:webinarId/status', asyncHandler(setStatusController))

webinarRouter.get('/webinars/:webinarId/access-codes', asyncHandler(listAccessCodesController))
webinarRouter.post('/webinars/:webinarId/access-codes', asyncHandler(createAccessCodeController))
webinarRouter.delete('/webinars/:webinarId/access-codes/:codeId', asyncHandler(deactivateAccessCodeController))

webinarRouter.get('/webinars/:webinarId/leads', asyncHandler(listLeadsController))
webinarRouter.get('/webinars/:webinarId/leads/stats', asyncHandler(leadStatsController))
webinarRouter.get('/webinars/:webinarId/leads/export.csv', asyncHandler(exportLeadsController))
webinarRouter.get('/webinars/:webinarId/leads/:leadId', asyncHandler(getLeadController))
webinarRouter.patch('/webinars/:webinarId/leads/:leadId', asyncHandler(updateLeadController))
webinarRouter.delete('/webinars/:webinarId/leads/:leadId', asyncHandler(deleteLeadController))

// The presenter's recording, roughly one chunk a second. Only the raw body parser sees this route's body.
const chunkLimiter = rateLimit({
  windowMs: 60_000,
  max: 240,
  key: (req: Request) => `${req.user?.id ?? 'anon'}:${req.params.webinarId}`,
})
webinarRouter.post(
  '/webinars/:webinarId/stream/chunk',
  chunkLimiter,
  express.raw({ type: 'application/octet-stream', limit: MAX_CHUNK_BYTES }),
  asyncHandler(chunkController),
)
webinarRouter.get('/webinars/:webinarId/stream', asyncHandler(streamStateController))

webinarRouter.get('/webinars/:webinarId/chat', asyncHandler(listChatController))
webinarRouter.post('/webinars/:webinarId/chat', asyncHandler(postChatController))

/**
 * Pages a visitor opens without an account: `/api/public/webinar`.
 * A visitor is identified by the access code (to register) and then by their lead id, which is an
 * unguessable ULID handed out once. Nothing here returns another person's data.
 */
export const webinarPublicRouter = Router()

const byIp = (req: Request) => req.ip ?? 'unknown'
const byIpAndLead = (req: Request) => `${req.ip ?? 'unknown'}:${req.params.leadId}`

// Guessing codes and lead ids is what these slow down; the chat poll is a page asking every few seconds.
const lookupLimiter = rateLimit({ windowMs: 60_000, max: 30, key: byIp })
const registerLimiter = rateLimit({ windowMs: 15 * 60_000, max: config.WEBINAR_REGISTER_RATE_LIMIT_MAX, key: byIp })
const chatReadLimiter = rateLimit({ windowMs: 60_000, max: 120, key: byIpAndLead })
const chatPostLimiter = rateLimit({ windowMs: 60_000, max: 20, key: byIpAndLead })

webinarPublicRouter.post('/access', lookupLimiter, asyncHandler(publicAccessController))
webinarPublicRouter.post('/register', registerLimiter, asyncHandler(publicRegisterController))
webinarPublicRouter.get('/leads/:leadId', lookupLimiter, asyncHandler(publicSessionController))
webinarPublicRouter.post('/leads/:leadId/attend', lookupLimiter, asyncHandler(publicAttendController))
// A player reconnecting after a drop is normal; this only stops a loop of reconnects.
const watchLimiter = rateLimit({ windowMs: 60_000, max: 30, key: byIpAndLead })
webinarPublicRouter.get('/leads/:leadId/stream', watchLimiter, asyncHandler(watchController))
webinarPublicRouter.get('/leads/:leadId/chat', chatReadLimiter, asyncHandler(publicChatListController))
webinarPublicRouter.post('/leads/:leadId/chat', chatPostLimiter, asyncHandler(publicChatPostController))
