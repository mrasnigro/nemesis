import type { Request, Response } from 'express'
import { pageMeta } from '../../core/list.js'
import {
  createPersonaFor,
  createScenarioFor,
  createTemplateFor,
  deletePersonaFor,
  deleteScenarioFor,
  deleteTemplateFor,
  finishSessionFor,
  getPersonaFor,
  getScenarioFor,
  getSessionFor,
  getTemplateFor,
  installStarterCatalog,
  listPersonaPage,
  listScenarioPage,
  listSessionPage,
  listTemplatePage,
  metricsFor,
  sendMessageFor,
  startSessionFor,
  statusFor,
  updatePersonaFor,
  updateScenarioFor,
  updateTemplateFor,
  type Actor,
} from './training-ai.service.js'
import {
  messageWrite,
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
  const { text } = messageWrite.parse(req.body)
  res.status(201).json({ data: await sendMessageFor(actor(req), req.params.sessionId, text) })
}

export async function finishSessionController(req: Request, res: Response) {
  res.json({ data: await finishSessionFor(actor(req), req.params.sessionId) })
}

export async function metricsController(req: Request, res: Response) {
  res.json({ data: await metricsFor(actor(req)) })
}

export function statusController(_req: Request, res: Response) {
  res.json({ data: statusFor() })
}
