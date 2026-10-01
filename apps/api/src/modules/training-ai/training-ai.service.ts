import type { z } from 'zod'
import { config } from '../../core/config.js'
import { withTransaction } from '../../core/db.js'
import { AppError } from '../../core/errors.js'
import { aiStatus, requireAiProvider, type AiProvider } from './ai/index.js'
import type { PersonaProfile, ScenarioProfile } from './ai/types.js'
import { buildReport, judgeByRules, type Judgment, type Template } from './rubric.js'
import { starterPersonas, starterScenarios, starterTemplates } from './starter.js'
import {
  appendTurn,
  completeSession,
  countCatalog,
  countScenariosUsing,
  getMetrics,
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
  softDelete,
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
  sessionStart,
  templateListQuery,
  templateWrite,
} from './training-ai.schemas.js'

/** The signed-in user as the module sees them. */
export type Actor = { customerId: string | null; userId: string; isManager: boolean }

const TRAINEE_SPEAKER = 'Você'

function customerOf(actor: Actor): string {
  if (!actor.customerId) throw new AppError(403, 'MODULE_FORBIDDEN', 'User is not bound to a customer')
  return actor.customerId
}

/** Catalog writes belong to the customer administrator; everyone with the module can read and practice. */
function managerCustomerOf(actor: Actor): string {
  const customerId = customerOf(actor)
  if (!actor.isManager) {
    throw new AppError(403, 'FORBIDDEN', 'Apenas o administrador do cliente pode alterar o catálogo de treinamento.')
  }
  return customerId
}

// -------------------------------------------------------------------- personas

export const listPersonaPage = (actor: Actor, query: z.infer<typeof personaListQuery>) =>
  listPersonas(customerOf(actor), query)

export async function getPersonaFor(actor: Actor, id: string) {
  const row = await getPersona(customerOf(actor), id)
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Persona not found')
  return row
}

export const createPersonaFor = (actor: Actor, input: z.infer<typeof personaWrite>) =>
  insertPersona(managerCustomerOf(actor), input)

export async function updatePersonaFor(actor: Actor, id: string, input: z.infer<typeof personaWrite>) {
  const row = await updatePersona(managerCustomerOf(actor), id, input)
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Persona not found')
  return row
}

export async function deletePersonaFor(actor: Actor, id: string) {
  const customerId = managerCustomerOf(actor)
  const used = await countScenariosUsing(customerId, 'persona_id', id)
  if (used > 0) {
    throw new AppError(409, 'IN_USE', `Este agente está vinculado a ${used} cenário(s). Troque o agente deles antes de excluir.`)
  }
  if (!(await softDelete('training_personas', customerId, id))) throw new AppError(404, 'NOT_FOUND', 'Persona not found')
}

// ------------------------------------------------------------------- templates

export const listTemplatePage = (actor: Actor, query: z.infer<typeof templateListQuery>) =>
  listTemplates(customerOf(actor), query)

export async function getTemplateFor(actor: Actor, id: string) {
  const row = await getTemplate(customerOf(actor), id)
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Template not found')
  return row
}

export const createTemplateFor = (actor: Actor, input: z.infer<typeof templateWrite>) =>
  insertTemplate(managerCustomerOf(actor), input)

export async function updateTemplateFor(actor: Actor, id: string, input: z.infer<typeof templateWrite>) {
  const customerId = managerCustomerOf(actor)
  // A playbook that scenarios depend on cannot go back to draft: nobody could practice with it.
  if (input.status === 'draft' && (await countScenariosUsing(customerId, 'evaluation_template_id', id)) > 0) {
    throw new AppError(409, 'IN_USE', 'Este playbook é usado por cenários e precisa continuar publicado.')
  }
  const row = await updateTemplate(customerId, id, input)
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Template not found')
  return row
}

export async function deleteTemplateFor(actor: Actor, id: string) {
  const customerId = managerCustomerOf(actor)
  const used = await countScenariosUsing(customerId, 'evaluation_template_id', id)
  if (used > 0) {
    throw new AppError(409, 'IN_USE', `Este playbook é usado por ${used} cenário(s). Troque o playbook deles antes de excluir.`)
  }
  if (!(await softDelete('training_templates', customerId, id))) throw new AppError(404, 'NOT_FOUND', 'Template not found')
}

// ------------------------------------------------------------------- scenarios

export const listScenarioPage = (actor: Actor, query: z.infer<typeof scenarioListQuery>) =>
  listScenarios(customerOf(actor), query)

export async function getScenarioFor(actor: Actor, id: string) {
  const row = await getScenario(customerOf(actor), id)
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Scenario not found')
  return row
}

async function assertLinks(customerId: string, personaId: string, templateId: string) {
  if (!(await getPersona(customerId, personaId))) throw new AppError(400, 'VALIDATION_ERROR', 'Linked persona was not found')
  if (!(await getTemplate(customerId, templateId))) throw new AppError(400, 'VALIDATION_ERROR', 'Linked template was not found')
}

export async function createScenarioFor(actor: Actor, input: z.infer<typeof scenarioWrite>) {
  const customerId = managerCustomerOf(actor)
  await assertLinks(customerId, input.personaId, input.evaluationTemplateId)
  return insertScenario(customerId, { ...input, segment: input.segment || input.industry })
}

export async function updateScenarioFor(actor: Actor, id: string, input: z.infer<typeof scenarioWrite>) {
  const customerId = managerCustomerOf(actor)
  await assertLinks(customerId, input.personaId, input.evaluationTemplateId)
  const row = await updateScenario(customerId, id, { ...input, segment: input.segment || input.industry })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Scenario not found')
  return row
}

export async function deleteScenarioFor(actor: Actor, id: string) {
  if (!(await softDelete('training_scenarios', managerCustomerOf(actor), id))) {
    throw new AppError(404, 'NOT_FOUND', 'Scenario not found')
  }
}

// --------------------------------------------------------------- starter catalog

export async function installStarterCatalog(actor: Actor) {
  const customerId = managerCustomerOf(actor)
  if ((await countCatalog(customerId)) > 0) {
    throw new AppError(409, 'CATALOG_NOT_EMPTY', 'O catálogo já tem itens. O catálogo inicial só pode ser instalado em um catálogo vazio.')
  }
  return withTransaction(async (connection) => {
    const templateIds = new Map<string, string>()
    for (const { key, ...template } of starterTemplates) {
      const row = await insertTemplate(customerId, template, connection)
      templateIds.set(key, String(row!.id))
    }
    const personaIds = new Map<string, string>()
    for (const { key, ...persona } of starterPersonas) {
      const row = await insertPersona(customerId, persona, connection)
      personaIds.set(key, String(row!.id))
    }
    for (const { personaKey, templateKey, ...scenario } of starterScenarios) {
      await insertScenario(
        customerId,
        { ...scenario, personaId: personaIds.get(personaKey), evaluationTemplateId: templateIds.get(templateKey) },
        connection,
      )
    }
    return { templates: templateIds.size, personas: personaIds.size, scenarios: starterScenarios.length }
  })
}

// -------------------------------------------------------------------- sessions

export function listSessionPage(actor: Actor, query: z.infer<typeof sessionListQuery>) {
  return listSessions(customerOf(actor), actor.isManager ? null : actor.userId, query)
}

export async function getSessionFor(actor: Actor, id: string) {
  const row = await getSession(customerOf(actor), id, actor.isManager ? null : actor.userId)
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Session not found')
  return row
}

/** Only the trainee can act on their own session, whatever their profile. */
async function ownSession(actor: Actor, id: string) {
  const row = await getSession(customerOf(actor), id, actor.userId)
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Session not found')
  return row
}

async function sessionContext(customerId: string, personaId: string | null, scenarioId: string) {
  const [persona, scenario] = await Promise.all([
    personaId ? getPersona(customerId, personaId) : null,
    getScenario(customerId, scenarioId),
  ])
  if (!persona || !scenario) {
    throw new AppError(409, 'SESSION_UNAVAILABLE', 'O cenário ou o agente desta sessão foi removido.')
  }
  const template = await getTemplate(customerId, String(scenario.evaluationTemplateId))
  return { persona: persona as PersonaProfile, scenario: scenario as ScenarioProfile, template: template as unknown as Template | null }
}

export async function startSessionFor(actor: Actor, input: z.infer<typeof sessionStart>) {
  const customerId = customerOf(actor)
  const scenario = await getScenario(customerId, input.scenarioId)
  if (!scenario) throw new AppError(404, 'NOT_FOUND', 'Scenario not found')

  const provider = requireAiProvider()

  const persona = await getPersona(customerId, input.personaId ?? String(scenario.personaId))
  if (!persona) throw new AppError(404, 'NOT_FOUND', 'Persona not found')
  if (persona.status !== 'active') {
    throw new AppError(409, 'PERSONA_UNAVAILABLE', 'Este agente não está ativo. Escolha outro agente ou ative este.')
  }
  const template = await getTemplate(customerId, String(scenario.evaluationTemplateId))
  if (!template || (template.status ?? 'published') !== 'published') {
    throw new AppError(409, 'TEMPLATE_UNAVAILABLE', 'O playbook deste cenário não está publicado.')
  }

  const openingLine = typeof persona.openingLine === 'string' ? persona.openingLine.trim() : ''
  return insertSession(customerId, actor.userId, {
    scenarioId: String(scenario.id),
    personaId: String(persona.id),
    mediaMode: input.mediaMode,
    aiProvider: provider.id,
    opening: { speaker: persona.name, text: openingLine || `Olá, aqui é ${persona.name}. Em que posso ajudar?` },
  })
}

export async function sendMessageFor(actor: Actor, sessionId: string, text: string) {
  const customerId = customerOf(actor)
  const session = await ownSession(actor, sessionId)
  if (session.status !== 'in_progress') throw new AppError(409, 'SESSION_CLOSED', 'Esta sessão já foi encerrada.')

  const traineeCount = session.messages.filter((message) => message.role === 'user').length
  if (traineeCount >= config.TRAINING_AI_MAX_TURNS) {
    throw new AppError(409, 'SESSION_TURN_LIMIT', `Limite de ${config.TRAINING_AI_MAX_TURNS} mensagens atingido. Encerre o treino para ver a avaliação.`)
  }

  const { persona, scenario } = await sessionContext(customerId, session.personaId, session.scenarioId)
  const provider = requireAiProvider()
  const pending = { id: 'pending', role: 'user' as const, speaker: TRAINEE_SPEAKER, text, timestamp: new Date().toISOString() }
  const reply = await provider.reply({
    persona,
    scenario,
    history: [...session.messages, pending],
    exchangeIndex: traineeCount,
    mediaMode: session.mediaMode === 'voice' ? 'voice' : 'text',
  })
  const aiText = reply.text.trim().slice(0, 2000)
  if (!aiText) throw new AppError(502, 'AI_PROVIDER_ERROR', 'O provedor de IA devolveu uma resposta vazia.')

  const turn = await appendTurn(sessionId, session.messages.length + 1, {
    userText: text,
    traineeName: TRAINEE_SPEAKER,
    aiText,
    personaName: persona.name,
  })
  return { ...turn, traineeMessages: traineeCount + 1, turnsLeft: config.TRAINING_AI_MAX_TURNS - traineeCount - 1 }
}

export async function finishSessionFor(actor: Actor, sessionId: string) {
  const customerId = customerOf(actor)
  const session = await ownSession(actor, sessionId)
  if (session.status === 'completed') return session

  const trainee = session.messages.filter((message) => message.role === 'user')
  if (trainee.length === 0) {
    throw new AppError(409, 'SESSION_EMPTY', 'Envie ao menos uma mensagem antes de encerrar o treino.')
  }

  const { persona, scenario, template } = await sessionContext(customerId, session.personaId, session.scenarioId)
  if (!template) throw new AppError(409, 'TEMPLATE_UNAVAILABLE', 'O playbook deste cenário foi removido.')

  // Finishing never fails because the model is down: without a provider the playbook's own rules score it.
  let provider: AiProvider | null = null
  try {
    provider = requireAiProvider()
  } catch {
    provider = null
  }
  const judgment: Judgment = provider
    ? await provider.judge({ template, persona, scenario, messages: session.messages })
    : judgeByRules(template, trainee.map((message) => message.text))

  const completedAt = new Date()
  const report = buildReport({
    sessionId,
    scenario: { id: String(scenario.id), title: String(scenario.title) },
    persona: { id: String(persona.id), name: persona.name },
    template,
    mediaMode: session.mediaMode === 'voice' ? 'voice' : 'text',
    judgeSource: judgment.provider,
    judgment,
    messages: session.messages,
    completedAt,
  })

  await completeSession(customerId, sessionId, {
    score: report.score,
    judgeSource: judgment.provider,
    report,
    completedAt,
  })
  // If another request finished it first, both callers get the stored result.
  return ownSession(actor, sessionId)
}

export function metricsFor(actor: Actor) {
  return getMetrics(customerOf(actor), actor.userId, config.PABX_TIMEZONE)
}

export function statusFor() {
  return { ai: aiStatus(), maxTurns: config.TRAINING_AI_MAX_TURNS }
}
