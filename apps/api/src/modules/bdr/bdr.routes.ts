import { Router } from 'express'
import { asyncHandler } from '../../core/http.js'
import { requireAuth, requireModule } from '../auth/auth.middleware.js'
import {
  attemptOutcomeController,
  callRecordingController,
  createCallController,
  createCampaignController,
  createMeetingController,
  deleteMeetingController,
  dialerConfigController,
  getCallController,
  getTelephonySettingsController,
  hangupAttemptController,
  importLeadsController,
  leadSummaryController,
  listAttemptsController,
  listCallsController,
  listCampaignsController,
  listMeetingsController,
  metricsController,
  pollAttemptController,
  saveTelephonySettingsController,
  setExtensionController,
  startAttemptController,
  startManualAttemptController,
  updateMeetingController,
} from './bdr.controller.js'

export const bdrRouter = Router()

bdrRouter.use(requireAuth, requireModule('bdr'))

bdrRouter.get('/campaigns', asyncHandler(listCampaignsController))
bdrRouter.post('/campaigns', asyncHandler(createCampaignController))
bdrRouter.post('/campaigns/:campaignId/leads', asyncHandler(importLeadsController))
bdrRouter.get('/campaigns/:campaignId/leads/summary', asyncHandler(leadSummaryController))
bdrRouter.get('/calls', asyncHandler(listCallsController))
bdrRouter.post('/calls', asyncHandler(createCallController))
bdrRouter.get('/calls/:callId', asyncHandler(getCallController))
bdrRouter.get('/calls/:callId/recording', asyncHandler(callRecordingController))
bdrRouter.get('/meetings', asyncHandler(listMeetingsController))
bdrRouter.post('/meetings', asyncHandler(createMeetingController))
bdrRouter.patch('/meetings/:meetingId', asyncHandler(updateMeetingController))
bdrRouter.delete('/meetings/:meetingId', asyncHandler(deleteMeetingController))
bdrRouter.get('/metrics', asyncHandler(metricsController))

bdrRouter.get('/dialer/config', asyncHandler(dialerConfigController))
bdrRouter.put('/dialer/extension', asyncHandler(setExtensionController))
bdrRouter.get('/dialer/attempts', asyncHandler(listAttemptsController))
bdrRouter.post('/dialer/attempts', asyncHandler(startAttemptController))
bdrRouter.post('/dialer/attempts/manual', asyncHandler(startManualAttemptController))
bdrRouter.get('/dialer/attempts/:attemptId', asyncHandler(pollAttemptController))
bdrRouter.post('/dialer/attempts/:attemptId/hangup', asyncHandler(hangupAttemptController))
bdrRouter.post('/dialer/attempts/:attemptId/outcome', asyncHandler(attemptOutcomeController))

bdrRouter.get('/telephony/settings', asyncHandler(getTelephonySettingsController))
bdrRouter.put('/telephony/settings', asyncHandler(saveTelephonySettingsController))
