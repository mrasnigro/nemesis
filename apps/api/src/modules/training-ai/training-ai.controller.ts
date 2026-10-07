import type { Request, Response } from 'express'
import { pageMeta } from '../../core/list.js'
import {
  createPersonaFor,
  createScenarioFor,
  createTemplateFor,
  deletePersonaFor,
  deleteScenarioFor,
  deleteTemplateFor,
  createGroupFor,
  dashboardsFor,
  deleteGroupFor,
  directoryFor,
  getGroupFor,
  getSettingsFor,
  patchDirectoryUserFor,
  patchSettingsFor,
  finishSessionFor,
  getPersonaFor,
  getScenarioFor,
  getSessionFor,
  getTemplateFor,
  installStarterCatalog,
  listGroupsFor,
  listPersonaPage,
  listScenarioPage,
  listSessionPage,
  listTemplatePage,
  metricsFor,
  readSessionAudioFor,
  rejudgeSessionFor,
  saveSessionAudioFor,
  sendMessageFor,
  startSessionFor,
  statusFor,
  updateGroupFor,
  updatePersonaFor,
  updateScenarioFor,
  updateTemplateFor,
  type Actor,
} from './training-ai.service.js'
import {
  dashboardQuery,
  directoryUserPatch,
  groupWrite,
  messageWrite,
  settingsPatch,
  personaListQuery,
  personaWrite,
  scenarioListQuery,
  scenarioWrite,
  sessionListQuery,
  sessionStart,
  templateListQuery,
  templateWrite,
} from './training-ai.schemas.js'

function actor(req: Request): Actor {
  const user = req.user!
  return { customerId: user.customerId, userId: user.id, isManager: user.profile === 'customer_admin' }
}

function page<T>(res: Response, query: { page: number; pageSize: number }, result: { rows: T[]; total: number }) {
  res.json({ data: result.rows, page: pageMeta(query.page, query.pageSize, result.total) })
}

// -------------------------------------------------------------------- personas

export async function listPersonasController(req: Request, res: Response) {
  const query = personaListQuery.parse(req.query)
  page(res, query, await listPersonaPage(actor(req), query))
}

export async function getPersonaController(req: Request, res: Response) {
  res.json({ data: await getPersonaFor(actor(req), req.params.personaId) })
}

export async function createPersonaController(req: Request, res: Response) {
  res.status(201).json({ data: await createPersonaFor(actor(req), personaWrite.parse(req.body)) })
}

export async function updatePersonaController(req: Request, res: Response) {
  res.json({ data: await updatePersonaFor(actor(req), req.params.personaId, personaWrite.parse(req.body)) })
}

export async function deletePersonaController(req: Request, res: Response) {
  await deletePersonaFor(actor(req), req.params.personaId)
  res.status(204).end()
}

// ------------------------------------------------------------------- templates

export async function listTemplatesController(req: Request, res: Response) {
  const query = templateListQuery.parse(req.query)
  page(res, query, await listTemplatePage(actor(req), query))
}

export async function getTemplateController(req: Request, res: Response) {
  res.json({ data: await getTemplateFor(actor(req), req.params.templateId) })
}

export async function createTemplateController(req: Request, res: Response) {
  res.status(201).json({ data: await createTemplateFor(actor(req), templateWrite.parse(req.body)) })
}

export async function updateTemplateController(req: Request, res: Response) {
  res.json({ data: await updateTemplateFor(actor(req), req.params.templateId, templateWrite.parse(req.body)) })
}

export async function deleteTemplateController(req: Request, res: Response) {
  await deleteTemplateFor(actor(req), req.params.templateId)
  res.status(204).end()
}

// ------------------------------------------------------------------- scenarios

export async function listScenariosController(req: Request, res: Response) {
  const query = scenarioListQuery.parse(req.query)
  page(res, query, await listScenarioPage(actor(req), query))
}

export async function getScenarioController(req: Request, res: Response) {
  res.json({ data: await getScenarioFor(actor(req), req.params.scenarioId) })
}

export async function createScenarioController(req: Request, res: Response) {
  res.status(201).json({ data: await createScenarioFor(actor(req), scenarioWrite.parse(req.body)) })
}

export async function updateScenarioController(req: Request, res: Response) {
  res.json({ data: await updateScenarioFor(actor(req), req.params.scenarioId, scenarioWrite.parse(req.body)) })
}

export async function deleteScenarioController(req: Request, res: Response) {
  await deleteScenarioFor(actor(req), req.params.scenarioId)
  res.status(204).end()
}

export async function installStarterCatalogController(req: Request, res: Response) {
  res.status(201).json({ data: await installStarterCatalog(actor(req)) })
}

// -------------------------------------------------------------------- sessions

export async function listSessionsController(req: Request, res: Response) {
  const query = sessionListQuery.parse(req.query)
  page(res, query, await listSessionPage(actor(req), query))
}

export async function getSessionController(req: Request, res: Response) {
  res.json({ data: await getSessionFor(actor(req), req.params.sessionId) })
}

export async function startSessionController(req: Request, res: Response) {
  res.status(201).json({ data: await startSessionFor(actor(req), sessionStart.parse(req.body)) })
}

export async function sendMessageController(req: Request, res: Response) {
  const body = messageWrite.parse(req.body)
  res.status(201).json({
    data: await sendMessageFor(actor(req), req.params.sessionId, body.text, {
      offsetMs: body.offsetMs,
      durationMs: body.durationMs,
    }),
  })
}

export async function finishSessionController(req: Request, res: Response) {
  res.json({ data: await finishSessionFor(actor(req), req.params.sessionId) })
}

export async function rejudgeSessionController(req: Request, res: Response) {
  res.json({ data: await rejudgeSessionFor(actor(req), req.params.sessionId) })
}

export async function saveSessionAudioController(req: Request, res: Response) {
  const audio = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
  const contentType = String(req.headers['content-type'] || 'audio/webm')
  res.status(201).json({ data: await saveSessionAudioFor(actor(req), req.params.sessionId, audio, contentType) })
}

export async function readSessionAudioController(req: Request, res: Response) {
  const file = await readSessionAudioFor(actor(req), req.params.sessionId)
  res.type(file.contentType).sendFile(file.absolute)
}

export async function listGroupsController(req: Request, res: Response) {
  res.json({ data: await listGroupsFor(actor(req)) })
}

export async function getGroupController(req: Request, res: Response) {
  res.json({ data: await getGroupFor(actor(req), req.params.groupId) })
}

export async function createGroupController(req: Request, res: Response) {
  res.status(201).json({ data: await createGroupFor(actor(req), groupWrite.parse(req.body)) })
}

export async function updateGroupController(req: Request, res: Response) {
  res.json({ data: await updateGroupFor(actor(req), req.params.groupId, groupWrite.parse(req.body)) })
}

export async function deleteGroupController(req: Request, res: Response) {
  await deleteGroupFor(actor(req), req.params.groupId)
  res.status(204).end()
}

export async function getSettingsController(req: Request, res: Response) {
  res.json({ data: await getSettingsFor(actor(req)) })
}

export async function patchSettingsController(req: Request, res: Response) {
  res.json({ data: await patchSettingsFor(actor(req), settingsPatch.parse(req.body)) })
}

export async function directoryController(req: Request, res: Response) {
  res.json({ data: await directoryFor(actor(req)) })
}

export async function patchDirectoryUserController(req: Request, res: Response) {
  res.json({
    data: await patchDirectoryUserFor(actor(req), req.params.userId, directoryUserPatch.parse(req.body)),
  })
}

export async function dashboardsController(req: Request, res: Response) {
  res.json({ data: await dashboardsFor(actor(req), dashboardQuery.parse(req.query)) })
}

export async function metricsController(req: Request, res: Response) {
  res.json({ data: await metricsFor(actor(req)) })
}

export function statusController(_req: Request, res: Response) {
  res.json({ data: statusFor() })
}
