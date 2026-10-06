import type { Request, Response } from 'express'
import { pageMeta } from '../../core/list.js'
import {
  createAccessCodeFor,
  createWebinarFor,
  deactivateAccessCodeFor,
  deleteLeadFor,
  deleteWebinarFor,
  exportLeadsCsv,
  getLeadFor,
  getWebinarFor,
  leadStatsFor,
  listAccessCodesFor,
  listChatFor,
  listLeadPage,
  listWebinarPage,
  postChatFor,
  publicAccess,
  publicAttend,
  publicChatList,
  publicChatPost,
  publicRegister,
  publicSession,
  setStatusFor,
  statsFor,
  updateLeadFor,
  updateWebinarFor,
  type Actor,
} from './webinar.service.js'
import {
  accessCodeCreate,
  chatQuery,
  chatWrite,
  leadListQuery,
  leadPatch,
  publicAccessBody,
  publicRegisterBody,
  webinarCreate,
  webinarListQuery,
  webinarPatch,
  webinarStatusWrite,
} from './webinar.schemas.js'

function actor(req: Request): Actor {
  const user = req.user!
  return {
    customerId: user.customerId,
    userId: user.id,
    name: user.name,
    isManager: user.profile === 'customer_admin',
    ip: req.ip,
  }
}

function page<T>(res: Response, query: { page: number; pageSize: number }, result: { rows: T[]; total: number }) {
  res.json({ data: result.rows, page: pageMeta(query.page, query.pageSize, result.total) })
}

// ------------------------------------------------------------------ webinars

export async function statsController(req: Request, res: Response) {
  const mine = req.query.mine === 'true'
  res.json({ data: await statsFor(actor(req), mine) })
}

export async function listWebinarsController(req: Request, res: Response) {
  const query = webinarListQuery.parse(req.query)
  page(res, query, await listWebinarPage(actor(req), query))
}

export async function getWebinarController(req: Request, res: Response) {
  res.json({ data: await getWebinarFor(actor(req), req.params.webinarId) })
}

export async function createWebinarController(req: Request, res: Response) {
  res.status(201).json({ data: await createWebinarFor(actor(req), webinarCreate.parse(req.body)) })
}

export async function updateWebinarController(req: Request, res: Response) {
  res.json({ data: await updateWebinarFor(actor(req), req.params.webinarId, webinarPatch.parse(req.body)) })
}

export async function setStatusController(req: Request, res: Response) {
  const { status } = webinarStatusWrite.parse(req.body)
  res.json({ data: await setStatusFor(actor(req), req.params.webinarId, status) })
}

export async function deleteWebinarController(req: Request, res: Response) {
  await deleteWebinarFor(actor(req), req.params.webinarId)
  res.status(204).end()
}

// -------------------------------------------------------------- access codes

export async function listAccessCodesController(req: Request, res: Response) {
  res.json({ data: await listAccessCodesFor(actor(req), req.params.webinarId) })
}

export async function createAccessCodeController(req: Request, res: Response) {
  res.status(201).json({ data: await createAccessCodeFor(actor(req), req.params.webinarId, accessCodeCreate.parse(req.body)) })
}

export async function deactivateAccessCodeController(req: Request, res: Response) {
  await deactivateAccessCodeFor(actor(req), req.params.webinarId, req.params.codeId)
  res.status(204).end()
}

// --------------------------------------------------------------------- leads

export async function listLeadsController(req: Request, res: Response) {
  const query = leadListQuery.parse(req.query)
  page(res, query, await listLeadPage(actor(req), req.params.webinarId, query))
}

export async function leadStatsController(req: Request, res: Response) {
  res.json({ data: await leadStatsFor(actor(req), req.params.webinarId) })
}

export async function exportLeadsController(req: Request, res: Response) {
  const file = await exportLeadsCsv(actor(req), req.params.webinarId)
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`)
  res.send(file.body)
}

export async function getLeadController(req: Request, res: Response) {
  await getWebinarFor(actor(req), req.params.webinarId)
  res.json({ data: await getLeadFor(actor(req), req.params.webinarId, req.params.leadId) })
}

export async function updateLeadController(req: Request, res: Response) {
  const { status } = leadPatch.parse(req.body)
  res.json({ data: await updateLeadFor(actor(req), req.params.webinarId, req.params.leadId, status) })
}

export async function deleteLeadController(req: Request, res: Response) {
  await deleteLeadFor(actor(req), req.params.webinarId, req.params.leadId)
  res.status(204).end()
}

// ---------------------------------------------------------------------- chat

export async function listChatController(req: Request, res: Response) {
  res.json({ data: await listChatFor(actor(req), req.params.webinarId, chatQuery.parse(req.query)) })
}

export async function postChatController(req: Request, res: Response) {
  const { message } = chatWrite.parse(req.body)
  res.status(201).json({ data: await postChatFor(actor(req), req.params.webinarId, message) })
}

// -------------------------------------------------------------------- public

export async function publicAccessController(req: Request, res: Response) {
  const { code } = publicAccessBody.parse(req.body)
  res.json({ data: await publicAccess(code) })
}

export async function publicRegisterController(req: Request, res: Response) {
  const result = await publicRegister(publicRegisterBody.parse(req.body))
  res.status(result.alreadyRegistered ? 200 : 201).json({ data: result })
}

export async function publicSessionController(req: Request, res: Response) {
  res.json({ data: await publicSession(req.params.leadId) })
}

export async function publicAttendController(req: Request, res: Response) {
  await publicAttend(req.params.leadId)
  res.status(204).end()
}

export async function publicChatListController(req: Request, res: Response) {
  res.json({ data: await publicChatList(req.params.leadId, chatQuery.parse(req.query)) })
}

export async function publicChatPostController(req: Request, res: Response) {
  const { message } = chatWrite.parse(req.body)
  res.status(201).json({ data: await publicChatPost(req.params.leadId, message) })
}
