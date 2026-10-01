import type { Request, Response } from 'express'
import { AppError } from '../../core/errors.js'
import { pageMeta } from '../../core/list.js'
import {
  deleteMeeting,
  getCall,
  getCampaign,
  getMetrics,
  insertCall,
  insertCampaign,
  insertMeeting,
  listCalls,
  listCampaigns,
  linkMeetingsToCall,
  listMeetings,
  meetingsByCall,
  updateMeeting,
} from './bdr.repository.js'
import {
  attemptListQuery,
  attemptOutcome,
  attemptStart,
  callListQuery,
  callWrite,
  campaignListQuery,
  campaignWrite,
  extensionWrite,
  leadImport,
  manualAttemptStart,
  meetingListQuery,
  meetingPatch,
  meetingWrite,
  telephonySettingsWrite,
} from './bdr.schemas.js'
import {
  attemptReadyForCall,
  finalizeAttemptForCall,
  getDialerConfig,
  hangupAttempt,
  listAttempts,
  markAttemptOutcome,
  pollAttempt,
  startAutomaticAttempt,
  startManualAttempt,
} from './dialer.service.js'
import { importLeads, leadSummary } from './leads.repository.js'
import { recordingAbsolutePath, recordingForCall, recordingStatusByCall } from './recordings.js'
import {
  getTelephonySettings,
  saveTelephonySettings,
  setOperatorExtension,
} from './telephony/settings.js'

function customerId(req: Request) {
  const id = req.user?.customerId
  if (!id) throw new AppError(403, 'MODULE_FORBIDDEN', 'User is not bound to a customer')
  return id
}

/** Telephony credentials belong to the customer; only its administrators may read or change them. */
function requireCustomerAdmin(req: Request) {
  if (req.user?.profile !== 'customer_admin') {
    throw new AppError(403, 'FORBIDDEN', 'Only the customer administrator can manage telephony')
  }
}

type CallRow = Record<string, unknown> & { id: string }

async function withRecordings<T extends CallRow>(customer: string, rows: T[]) {
  const statuses = await recordingStatusByCall(
    customer,
    rows.map((row) => row.id),
  )
  return rows.map((row) => {
    const recordingStatus = statuses.get(row.id) ?? 'none'
    return {
      ...row,
      recordingStatus,
      recordingUrl: recordingStatus === 'stored' ? `/api/modules/bdr/calls/${row.id}/recording` : null,
    }
  })
}

async function withMeetings<T extends CallRow>(customer: string, rows: T[]) {
  const grouped = await meetingsByCall(
    customer,
    rows.map((row) => row.id),
  )
  return rows.map((row) => {
    const meetings = grouped.get(row.id) ?? []
    return { ...row, meetings, meetingIds: meetings.map((meeting) => meeting.id) }
  })
}

export async function listCampaignsController(req: Request, res: Response) {
  const query = campaignListQuery.parse(req.query)
  const result = await listCampaigns(customerId(req), query)
  res.json({ data: result.rows, page: pageMeta(query.page, query.pageSize, result.total) })
}

export async function createCampaignController(req: Request, res: Response) {
  const row = await insertCampaign(customerId(req), campaignWrite.parse(req.body))
  res.status(201).json({ data: row })
}

export async function importLeadsController(req: Request, res: Response) {
  const customer = customerId(req)
  const campaign = await getCampaign(customer, req.params.campaignId)
  if (!campaign) throw new AppError(404, 'NOT_FOUND', 'Campaign not found')
  const body = leadImport.parse(req.body)
  const result = await importLeads(customer, campaign.id, body.leads, body.source)
  res.status(201).json({ data: { ...result, summary: await leadSummary(customer, campaign.id) } })
}

export async function leadSummaryController(req: Request, res: Response) {
  const customer = customerId(req)
  const campaign = await getCampaign(customer, req.params.campaignId)
  if (!campaign) throw new AppError(404, 'NOT_FOUND', 'Campaign not found')
  res.json({ data: await leadSummary(customer, campaign.id) })
}

export async function listCallsController(req: Request, res: Response) {
  const customer = customerId(req)
  const query = callListQuery.parse(req.query)
  const result = await listCalls(customer, query)
  res.json({
    data: await withRecordings(customer, await withMeetings(customer, result.rows)),
    page: pageMeta(query.page, query.pageSize, result.total),
  })
}

export async function getCallController(req: Request, res: Response) {
  const customer = customerId(req)
  const row = await getCall(customer, req.params.callId)
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Call not found')
  const [enriched] = await withRecordings(customer, await withMeetings(customer, [row]))
  res.json({ data: enriched })
}

export async function createCallController(req: Request, res: Response) {
  const customer = customerId(req)
  const body = callWrite.parse(req.body)
  const attempt = body.attemptId ? await attemptReadyForCall(req.user!, body.attemptId) : null
  const row = await insertCall(customer, req.user!.id, body, {
    attemptId: attempt?.id ?? null,
    leadId: attempt?.leadId ?? null,
  })
  if (!row) throw new AppError(500, 'INTERNAL', 'Call was not saved')
  await linkMeetingsToCall(customer, row.id, body.meetingIds ?? [])
  if (attempt) {
    await finalizeAttemptForCall(
      req.user!,
      attempt,
      row.id,
      body.qualificationId ?? null,
      body.callbackAt ? new Date(body.callbackAt) : null,
    )
  }
  const [enriched] = await withRecordings(customer, await withMeetings(customer, [row]))
  res.status(201).json({ data: enriched })
}

export async function callRecordingController(req: Request, res: Response) {
  const recording = await recordingForCall(customerId(req), req.params.callId)
  if (!recording || recording.status !== 'stored' || !recording.path) {
    throw new AppError(404, 'NOT_FOUND', 'Recording not available')
  }
  res.type('audio/mpeg')
  if (req.query.download === '1') {
    res.setHeader('Content-Disposition', `attachment; filename="ligacao-${req.params.callId}.mp3"`)
  }
  res.sendFile(recordingAbsolutePath(recording.path))
}

type MeetingRow = Record<string, unknown> & { callId: string | null }

/** A meeting plays the recording of the call it was booked in. */
async function withMeetingRecordings<T extends MeetingRow>(customer: string, rows: T[]) {
  const statuses = await recordingStatusByCall(
    customer,
    rows.flatMap((row) => (row.callId ? [row.callId] : [])),
  )
  return rows.map((row) => ({
    ...row,
    recordingUrl:
      row.callId && statuses.get(row.callId) === 'stored'
        ? `/api/modules/bdr/calls/${row.callId}/recording`
        : null,
  }))
}

export async function listMeetingsController(req: Request, res: Response) {
  const customer = customerId(req)
  const query = meetingListQuery.parse(req.query)
  const result = await listMeetings(customer, query)
  res.json({
    data: await withMeetingRecordings(customer, result.rows),
    page: pageMeta(query.page, query.pageSize, result.total),
  })
}

export async function createMeetingController(req: Request, res: Response) {
  const customer = customerId(req)
  const row = await insertMeeting(customer, meetingWrite.parse(req.body))
  if (!row) throw new AppError(500, 'INTERNAL', 'Meeting was not saved')
  const [enriched] = await withMeetingRecordings(customer, [row])
  res.status(201).json({ data: enriched })
}

export async function updateMeetingController(req: Request, res: Response) {
  const customer = customerId(req)
  const row = await updateMeeting(customer, req.params.meetingId, meetingPatch.parse(req.body))
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Meeting not found')
  const [enriched] = await withMeetingRecordings(customer, [row])
  res.json({ data: enriched })
}

export async function deleteMeetingController(req: Request, res: Response) {
  const removed = await deleteMeeting(customerId(req), req.params.meetingId)
  if (!removed) throw new AppError(404, 'NOT_FOUND', 'Meeting not found')
  res.status(204).send()
}

export async function metricsController(req: Request, res: Response) {
  res.json({ data: await getMetrics(customerId(req)) })
}

export async function dialerConfigController(req: Request, res: Response) {
  customerId(req)
  res.json({ data: await getDialerConfig(req.user!) })
}

export async function setExtensionController(req: Request, res: Response) {
  const { extension } = extensionWrite.parse(req.body)
  await setOperatorExtension(customerId(req), req.user!.id, extension)
  res.json({ data: await getDialerConfig(req.user!) })
}

export async function startAttemptController(req: Request, res: Response) {
  customerId(req)
  const { campaignId } = attemptStart.parse(req.body)
  res.status(201).json({ data: await startAutomaticAttempt(req.user!, campaignId) })
}

export async function startManualAttemptController(req: Request, res: Response) {
  customerId(req)
  const body = manualAttemptStart.parse(req.body)
  res.status(201).json({ data: await startManualAttempt(req.user!, body.phone, body.campaignId ?? null) })
}

export async function pollAttemptController(req: Request, res: Response) {
  customerId(req)
  res.json({ data: await pollAttempt(req.user!, req.params.attemptId) })
}

export async function hangupAttemptController(req: Request, res: Response) {
  customerId(req)
  res.json({ data: await hangupAttempt(req.user!, req.params.attemptId) })
}

export async function attemptOutcomeController(req: Request, res: Response) {
  customerId(req)
  const { outcome } = attemptOutcome.parse(req.body)
  res.json({ data: await markAttemptOutcome(req.user!, req.params.attemptId, outcome) })
}

export async function listAttemptsController(req: Request, res: Response) {
  const query = attemptListQuery.parse(req.query)
  const result = await listAttempts(customerId(req), query)
  res.json({ data: result.rows, page: pageMeta(query.page, query.pageSize, result.total) })
}

export async function getTelephonySettingsController(req: Request, res: Response) {
  requireCustomerAdmin(req)
  res.json({ data: await getTelephonySettings(customerId(req)) })
}

export async function saveTelephonySettingsController(req: Request, res: Response) {
  requireCustomerAdmin(req)
  res.json({ data: await saveTelephonySettings(customerId(req), telephonySettingsWrite.parse(req.body)) })
}
