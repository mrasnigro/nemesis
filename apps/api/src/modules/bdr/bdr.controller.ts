import type { Request, Response } from 'express'
import { AppError } from '../../core/errors.js'
import { pageMeta } from '../../core/list.js'
import {
  deleteMeeting,
  getCall,
  getMetrics,
  insertCall,
  insertCampaign,
  insertMeeting,
  listCalls,
  listCampaigns,
  listMeetings,
  updateMeeting,
} from './bdr.repository.js'
import {
  callListQuery,
  callWrite,
  campaignListQuery,
  campaignWrite,
  meetingListQuery,
  meetingPatch,
  meetingWrite,
} from './bdr.schemas.js'

function customerId(req: Request) {
  const id = req.user?.customerId
  if (!id) throw new AppError(403, 'MODULE_FORBIDDEN', 'User is not bound to a customer')
  return id
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

export async function listCallsController(req: Request, res: Response) {
  const query = callListQuery.parse(req.query)
  const result = await listCalls(customerId(req), query)
  res.json({ data: result.rows, page: pageMeta(query.page, query.pageSize, result.total) })
}

export async function getCallController(req: Request, res: Response) {
  const row = await getCall(customerId(req), req.params.callId)
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Call not found')
  res.json({ data: row })
}

export async function createCallController(req: Request, res: Response) {
  const row = await insertCall(customerId(req), req.user!.id, callWrite.parse(req.body))
  res.status(201).json({ data: row })
}

export async function listMeetingsController(req: Request, res: Response) {
  const query = meetingListQuery.parse(req.query)
  const result = await listMeetings(customerId(req), query)
  res.json({ data: result.rows, page: pageMeta(query.page, query.pageSize, result.total) })
}

export async function createMeetingController(req: Request, res: Response) {
  const row = await insertMeeting(customerId(req), meetingWrite.parse(req.body))
  res.status(201).json({ data: row })
}

export async function updateMeetingController(req: Request, res: Response) {
  const row = await updateMeeting(customerId(req), req.params.meetingId, meetingPatch.parse(req.body))
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Meeting not found')
  res.json({ data: row })
}

export async function deleteMeetingController(req: Request, res: Response) {
  const removed = await deleteMeeting(customerId(req), req.params.meetingId)
  if (!removed) throw new AppError(404, 'NOT_FOUND', 'Meeting not found')
  res.status(204).send()
}

export async function metricsController(req: Request, res: Response) {
  res.json({ data: await getMetrics(customerId(req)) })
}
