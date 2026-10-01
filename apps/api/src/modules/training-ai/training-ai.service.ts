import { AppError } from '../../core/errors.js'
import {
  getPersona,
  getScenario,
  getSession,
  getTemplate,
  insertPersona,
  insertScenario,
  insertSession,
  insertTemplate,
  listPersonas,
  listScenarios,
  listSessions,
  listTemplates,
  updatePersona,
  updateScenario,
  updateTemplate,
} from './training-ai.repository.js'
import type {
  personaListQuery,
  personaWrite,
  scenarioListQuery,
  scenarioWrite,
  sessionListQuery,
  sessionWrite,
  templateListQuery,
  templateWrite,
} from './training-ai.schemas.js'
import type { z } from 'zod'

type PersonaList = z.infer<typeof personaListQuery>
type PersonaWrite = z.infer<typeof personaWrite>
type ScenarioList = z.infer<typeof scenarioListQuery>
type ScenarioWrite = z.infer<typeof scenarioWrite>
type TemplateList = z.infer<typeof templateListQuery>
type TemplateWrite = z.infer<typeof templateWrite>
type SessionList = z.infer<typeof sessionListQuery>
type SessionWrite = z.infer<typeof sessionWrite>

function customerIdOf(customerId: string | null): string {
  if (!customerId) throw new AppError(403, 'MODULE_FORBIDDEN', 'User is not bound to a customer')
  return customerId
}

export async function listPersonaPage(customerId: string | null, query: PersonaList) {
  return listPersonas(customerIdOf(customerId), query)
}

export async function getPersonaForCustomer(customerId: string | null, id: string) {
  const row = await getPersona(customerIdOf(customerId), id)
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Persona not found')
  return row
}

export async function createPersonaForCustomer(customerId: string | null, input: PersonaWrite) {
  return insertPersona(customerIdOf(customerId), input)
}

export async function updatePersonaForCustomer(customerId: string | null, id: string, input: PersonaWrite) {
  const row = await updatePersona(customerIdOf(customerId), id, input)
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Persona not found')
  return row
}

export async function listTemplatePage(customerId: string | null, query: TemplateList) {
  return listTemplates(customerIdOf(customerId), query)
}

export async function getTemplateForCustomer(customerId: string | null, id: string) {
  const row = await getTemplate(customerIdOf(customerId), id)
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Template not found')
  return row
}

export async function createTemplateForCustomer(customerId: string | null, input: TemplateWrite) {
  return insertTemplate(customerIdOf(customerId), input)
}

export async function updateTemplateForCustomer(customerId: string | null, id: string, input: TemplateWrite) {
  const row = await updateTemplate(customerIdOf(customerId), id, input)
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Template not found')
  return row
}

export async function listScenarioPage(customerId: string | null, query: ScenarioList) {
  return listScenarios(customerIdOf(customerId), query)
}

export async function getScenarioForCustomer(customerId: string | null, id: string) {
  const row = await getScenario(customerIdOf(customerId), id)
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Scenario not found')
  return row
}

export async function createScenarioForCustomer(customerId: string | null, input: ScenarioWrite) {
  const customerIdValue = customerIdOf(customerId)
  await assertLinks(customerIdValue, String(input.personaId), String(input.evaluationTemplateId))
  return insertScenario(customerIdValue, input)
}

export async function updateScenarioForCustomer(customerId: string | null, id: string, input: ScenarioWrite) {
  const customerIdValue = customerIdOf(customerId)
  await assertLinks(customerIdValue, String(input.personaId), String(input.evaluationTemplateId))
  const row = await updateScenario(customerIdValue, id, input)
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Scenario not found')
  return row
}

export async function listSessionPage(customerId: string | null, query: SessionList) {
  return listSessions(customerIdOf(customerId), query)
}

export async function getSessionForCustomer(customerId: string | null, id: string) {
  const row = await getSession(customerIdOf(customerId), id)
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Session not found')
  return row
}

export async function createSessionForCustomer(
  customerId: string | null,
  userId: string,
  input: SessionWrite,
) {
  const customerIdValue = customerIdOf(customerId)
  const scenario = await getScenario(customerIdValue, input.scenarioId)
  if (!scenario) throw new AppError(404, 'NOT_FOUND', 'Scenario not found')
  return insertSession(customerIdValue, userId, {
    scenarioId: input.scenarioId,
    status: input.status,
    score: input.score ?? null,
    report: (input.report as Record<string, unknown> | undefined) ?? null,
  })
}

async function assertLinks(customerId: string, personaId: string, templateId: string) {
  const persona = await getPersona(customerId, personaId)
  if (!persona) throw new AppError(400, 'VALIDATION_ERROR', 'Linked persona was not found')
  const template = await getTemplate(customerId, templateId)
  if (!template) throw new AppError(400, 'VALIDATION_ERROR', 'Linked template was not found')
}
