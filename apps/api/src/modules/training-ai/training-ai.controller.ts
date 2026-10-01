import type { Request, Response } from 'express'
import { pageMeta } from '../../core/list.js'
import {
  createPersonaForCustomer,
  createScenarioForCustomer,
  createSessionForCustomer,
  createTemplateForCustomer,
  getPersonaForCustomer,
  getScenarioForCustomer,
  getSessionForCustomer,
  getTemplateForCustomer,
  listPersonaPage,
  listScenarioPage,
  listSessionPage,
  listTemplatePage,
  updatePersonaForCustomer,
  updateScenarioForCustomer,
  updateTemplateForCustomer,
} from './training-ai.service.js'
import {
  personaListQuery,
  personaWrite,
  scenarioListQuery,
  scenarioWrite,
  sessionListQuery,
  sessionWrite,
  templateListQuery,
  templateWrite,
} from './training-ai.schemas.js'

function customerId(req: Request) {
  return req.user?.customerId ?? null
}

export async function listPersonasController(req: Request, res: Response) {
  const query = personaListQuery.parse(req.query)
  const result = await listPersonaPage(customerId(req), query)
  res.json({ data: result.rows, page: pageMeta(query.page, query.pageSize, result.total) })
}

export async function getPersonaController(req: Request, res: Response) {
  const row = await getPersonaForCustomer(customerId(req), req.params.personaId)
  res.json({ data: row })
}

export async function createPersonaController(req: Request, res: Response) {
  const row = await createPersonaForCustomer(customerId(req), personaWrite.parse(req.body))
  res.status(201).json({ data: row })
}

export async function updatePersonaController(req: Request, res: Response) {
  const row = await updatePersonaForCustomer(
    customerId(req),
    req.params.personaId,
    personaWrite.parse(req.body),
  )
  res.json({ data: row })
}

export async function listTemplatesController(req: Request, res: Response) {
  const query = templateListQuery.parse(req.query)
  const result = await listTemplatePage(customerId(req), query)
  res.json({ data: result.rows, page: pageMeta(query.page, query.pageSize, result.total) })
}

export async function getTemplateController(req: Request, res: Response) {
  const row = await getTemplateForCustomer(customerId(req), req.params.templateId)
  res.json({ data: row })
}

export async function createTemplateController(req: Request, res: Response) {
  const row = await createTemplateForCustomer(customerId(req), templateWrite.parse(req.body))
  res.status(201).json({ data: row })
}

export async function updateTemplateController(req: Request, res: Response) {
  const row = await updateTemplateForCustomer(
    customerId(req),
    req.params.templateId,
    templateWrite.parse(req.body),
  )
  res.json({ data: row })
}

export async function listScenariosController(req: Request, res: Response) {
  const query = scenarioListQuery.parse(req.query)
  const result = await listScenarioPage(customerId(req), query)
  res.json({ data: result.rows, page: pageMeta(query.page, query.pageSize, result.total) })
}

export async function getScenarioController(req: Request, res: Response) {
  const row = await getScenarioForCustomer(customerId(req), req.params.scenarioId)
  res.json({ data: row })
}

export async function createScenarioController(req: Request, res: Response) {
  const row = await createScenarioForCustomer(customerId(req), scenarioWrite.parse(req.body))
  res.status(201).json({ data: row })
}

export async function updateScenarioController(req: Request, res: Response) {
  const row = await updateScenarioForCustomer(
    customerId(req),
    req.params.scenarioId,
    scenarioWrite.parse(req.body),
  )
  res.json({ data: row })
}

export async function listSessionsController(req: Request, res: Response) {
  const query = sessionListQuery.parse(req.query)
  const result = await listSessionPage(customerId(req), query)
  res.json({ data: result.rows, page: pageMeta(query.page, query.pageSize, result.total) })
}

export async function getSessionController(req: Request, res: Response) {
  const row = await getSessionForCustomer(customerId(req), req.params.sessionId)
  res.json({ data: row })
}

export async function createSessionController(req: Request, res: Response) {
  const row = await createSessionForCustomer(
    customerId(req),
    req.user!.id,
    sessionWrite.parse(req.body),
  )
  res.status(201).json({ data: row })
}
