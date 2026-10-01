import { Router } from 'express'
import { asyncHandler } from '../../core/http.js'
import { requireAuth, requireModule } from '../auth/auth.middleware.js'
import {
  createCallController,
  createCampaignController,
  createMeetingController,
  deleteMeetingController,
  getCallController,
  listCallsController,
  listCampaignsController,
  listMeetingsController,
  metricsController,
  updateMeetingController,
} from './bdr.controller.js'

export const bdrRouter = Router()

bdrRouter.use(requireAuth, requireModule('bdr'))

bdrRouter.get('/campaigns', asyncHandler(listCampaignsController))
bdrRouter.post('/campaigns', asyncHandler(createCampaignController))
bdrRouter.get('/calls', asyncHandler(listCallsController))
bdrRouter.post('/calls', asyncHandler(createCallController))
bdrRouter.get('/calls/:callId', asyncHandler(getCallController))
bdrRouter.get('/meetings', asyncHandler(listMeetingsController))
bdrRouter.post('/meetings', asyncHandler(createMeetingController))
bdrRouter.patch('/meetings/:meetingId', asyncHandler(updateMeetingController))
bdrRouter.delete('/meetings/:meetingId', asyncHandler(deleteMeetingController))
bdrRouter.get('/metrics', asyncHandler(metricsController))
