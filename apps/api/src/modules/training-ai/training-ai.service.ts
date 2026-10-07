import type { z } from 'zod'
import { config } from '../../core/config.js'
import { withTransaction } from '../../core/db.js'
import { AppError } from '../../core/errors.js'
import { aiStatus, requireAiProvider, type AiProvider } from './ai/index.js'
import type { PersonaProfile, ScenarioProfile } from './ai/types.js'
import { buildReport, communicationMetrics, judgeByRules, type Judgment, type Template } from './rubric.js'
import { starterPersonas, starterScenarios, starterTemplates } from './starter.js'
import { writeTrainingAudio } from './trainingAudio.js'
import {
  appendTurn,
  completeSession,
  countCatalog,
  countScenariosUsing,
  deleteGroupCascade,
  getCustomerSettings,
  getGroup,
  listUserGroupQuotas,
  getMetrics,
  getPersona,
  getScenario,
  getSession,
  getTemplate,
  insertGroup,
  insertPersona,
  insertScenario,
  insertSession,
  insertTemplate,
  listAnalyticsRows,
  listDirectory,
  listGroups,
  patchDirectoryUser,
  listPersonas,
  listScenarios,
  listSessions,
  listTemplates,
  replaceSessionReport,
  sessionAudioPath,
  setSessionAudio,
  softDelete,
  updateGroup,
  updatePersona,
  updateScenario,
  updateTemplate,
  upsertCustomerSettings,
  userIdsInCustomer,
} from './training-ai.repository.js'
import {
  SCENARIO_TYPE_LABELS,
  type dashboardQuery,
  type groupWrite,
  type personaListQuery,
  type personaWrite,
  type scenarioListQuery,
  type scenarioWrite,
  type sessionListQuery,
  type sessionStart,
  type templateListQuery,
  type templateWrite,
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
  listPersonas(customerOf(actor), { userId: actor.userId, isManager: actor.isManager }, query)

async function personaVisible(actor: Actor, persona: Record<string, unknown>) {
  if (actor.isManager) return true
  const visibility = String(persona.visibility ?? 'company')
  if (visibility === 'company') return true
  if (visibility === 'individual') return persona.ownerUserId === actor.userId
  if (visibility === 'group' && persona.groupId) {
    const group = await getGroup(customerOf(actor), String(persona.groupId))
    if (!group || group.status !== 'active') return false
    return Boolean(group.members?.some((member) => member.id === actor.userId))
  }
  return false
}

export async function getPersonaFor(actor: Actor, id: string) {
  const row = await getPersona(customerOf(actor), id)
  if (!row || !(await personaVisible(actor, row))) throw new AppError(404, 'NOT_FOUND', 'Persona not found')
  return row
}

async function assertPersonaLinks(customerId: string, input: z.infer<typeof personaWrite>) {
  if (input.evaluationTemplateId) {
    const template = await getTemplate(customerId, input.evaluationTemplateId)
    if (!template) throw new AppError(400, 'VALIDATION_ERROR', 'O template de avaliação não existe.')
  }
  if (input.groupId) {
    const group = await getGroup(customerId, input.groupId)
    if (!group) throw new AppError(400, 'VALIDATION_ERROR', 'O grupo não existe.')
  }
}

export async function createPersonaFor(actor: Actor, input: z.infer<typeof personaWrite>) {
  const customerId = managerCustomerOf(actor)
  await assertPersonaLinks(customerId, input)
  return insertPersona(customerId, { ...input, ownerUserId: actor.userId })
}

export async function updatePersonaFor(actor: Actor, id: string, input: z.infer<typeof personaWrite>) {
  const customerId = managerCustomerOf(actor)
  await assertPersonaLinks(customerId, input)
  const row = await updatePersona(customerId, id, { ...input, ownerUserId: actor.userId })
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
    for (const { key, templateKey, ...persona } of starterPersonas) {
      const row = await insertPersona(
        customerId,
        {
          ...persona,
          evaluationTemplateId: templateKey ? templateIds.get(String(templateKey)) : undefined,
        },
        connection,
      )
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
  const userScope = !actor.isManager || query.scope === 'mine' ? actor.userId : query.userId ?? null
  return listSessions(customerOf(actor), userScope, query)
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

function scenarioFromPersona(persona: Record<string, unknown>): ScenarioProfile {
  const type = typeof persona.scenarioType === 'string' ? persona.scenarioType : ''
  const label = SCENARIO_TYPE_LABELS[type as keyof typeof SCENARIO_TYPE_LABELS] || 'Simulação'
  return {
    id: String(persona.id),
    title: label,
    description: String(persona.sellerInstructions || persona.scenarioContext || persona.trainingObjective || ''),
    sellerInstructions: String(persona.sellerInstructions || persona.trainingObjective || ''),
    funnelStage: label,
    difficulty: persona.difficulty,
    evaluationTemplateId: persona.evaluationTemplateId,
  }
}

async function sessionContext(customerId: string, personaId: string | null, scenarioId: string | null) {
  const persona = personaId ? await getPersona(customerId, personaId) : null
  if (!persona) {
    throw new AppError(409, 'SESSION_UNAVAILABLE', 'O agente desta sessão foi removido.')
  }
  if (scenarioId) {
    const scenario = await getScenario(customerId, scenarioId)
    if (!scenario) throw new AppError(409, 'SESSION_UNAVAILABLE', 'O cenário desta sessão foi removido.')
    const template = await getTemplate(customerId, String(scenario.evaluationTemplateId))
    return { persona: persona as PersonaProfile, scenario: scenario as ScenarioProfile, template: template as unknown as Template | null }
  }
  const templateId = persona.evaluationTemplateId == null ? '' : String(persona.evaluationTemplateId)
  if (!templateId) throw new AppError(409, 'TEMPLATE_UNAVAILABLE', 'Esta persona não tem um template de avaliação.')
  const template = await getTemplate(customerId, templateId)
  return {
    persona: persona as PersonaProfile,
    scenario: scenarioFromPersona(persona),
    template: template as unknown as Template | null,
  }
}

function templateAllows(template: Template, scenarioType: unknown) {
  const allowed = (template as Template & { scenarioTypes?: string[] }).scenarioTypes
  if (!Array.isArray(allowed) || allowed.length === 0 || typeof scenarioType !== 'string' || !scenarioType) return
  if (!allowed.includes(scenarioType)) {
    throw new AppError(409, 'TEMPLATE_INCOMPATIBLE', 'Este template não é compatível com o cenário da persona.')
  }
}

export async function startSessionFor(actor: Actor, input: z.infer<typeof sessionStart>) {
  const customerId = customerOf(actor)
  const provider = requireAiProvider()
  await assertGroupMinuteQuota(customerId, actor.userId)

  if (!input.scenarioId) {
    const persona = await getPersona(customerId, String(input.personaId))
    if (!persona || !(await personaVisible(actor, persona))) throw new AppError(404, 'NOT_FOUND', 'Persona not found')
    if (persona.status !== 'active') {
      throw new AppError(409, 'PERSONA_UNAVAILABLE', 'Este agente não está ativo.')
    }
    const templateId = persona.evaluationTemplateId == null ? '' : String(persona.evaluationTemplateId)
    const template = templateId ? await getTemplate(customerId, templateId) : null
    if (!template || (template.status ?? 'published') !== 'published') {
      throw new AppError(409, 'TEMPLATE_UNAVAILABLE', 'Esta persona precisa de um template de avaliação publicado.')
    }
    templateAllows(template as unknown as Template, persona.scenarioType)
    const openingLine = typeof persona.openingLine === 'string' ? persona.openingLine.trim() : ''
    return insertSession(customerId, actor.userId, {
      scenarioId: null,
      personaId: String(persona.id),
      mediaMode: input.mediaMode,
      aiProvider: provider.id,
      opening: { speaker: persona.name, text: openingLine || `Olá, aqui é ${persona.name}.` },
    })
  }

  const scenario = await getScenario(customerId, input.scenarioId)
  if (!scenario) throw new AppError(404, 'NOT_FOUND', 'Scenario not found')

  const persona = await getPersona(customerId, input.personaId ?? String(scenario.personaId))
  if (!persona || !(await personaVisible(actor, persona))) throw new AppError(404, 'NOT_FOUND', 'Persona not found')
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

export async function sendMessageFor(
  actor: Actor,
  sessionId: string,
  text: string,
  timing: { offsetMs?: number; durationMs?: number } = {},
) {
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
  const aiWords = aiText.split(/\s+/).filter(Boolean).length

  const turn = await appendTurn(sessionId, session.messages.length + 1, {
    userText: text,
    traineeName: TRAINEE_SPEAKER,
    aiText,
    personaName: persona.name,
    userOffsetMs: timing.offsetMs ?? null,
    userDurationMs: timing.durationMs ?? null,
    aiDurationMs: Math.max(1000, Math.round((aiWords / 2.3) * 1000)),
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
    scenario: {
      id: session.scenarioId ? String(scenario.id) : '',
      title: String(scenario.title),
      sellerInstructions: String(scenario.sellerInstructions || ''),
    },
    persona: {
      id: String(persona.id),
      name: persona.name,
      negotiatorType: typeof persona.negotiatorType === 'string' ? persona.negotiatorType : '',
    },
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
    durationMs: communicationMetrics(session.messages).durationSec * 1000,
  })
  // If another request finished it first, both callers get the stored result.
  return ownSession(actor, sessionId)
}

export async function rejudgeSessionFor(actor: Actor, sessionId: string) {
  const customerId = customerOf(actor)
  const session = await getSession(customerId, sessionId, actor.isManager ? null : actor.userId)
  if (!session) throw new AppError(404, 'NOT_FOUND', 'Session not found')
  if (session.status !== 'completed') throw new AppError(409, 'SESSION_OPEN', 'Encerre a simulação antes de pedir um novo feedback.')
  const { persona, scenario, template } = await sessionContext(customerId, session.personaId, session.scenarioId)
  if (!template) throw new AppError(409, 'TEMPLATE_UNAVAILABLE', 'O template desta sessão foi removido.')
  let provider: AiProvider | null = null
  try {
    provider = requireAiProvider()
  } catch {
    provider = null
  }
  const trainee = session.messages.filter((message) => message.role === 'user')
  const judgment: Judgment = provider
    ? await provider.judge({ template, persona, scenario, messages: session.messages })
    : judgeByRules(template, trainee.map((message) => message.text))
  const report = buildReport({
    sessionId,
    scenario: {
      id: session.scenarioId ? String(scenario.id) : '',
      title: String(scenario.title),
      sellerInstructions: String(scenario.sellerInstructions || ''),
    },
    persona: {
      id: String(persona.id),
      name: persona.name,
      negotiatorType: typeof persona.negotiatorType === 'string' ? persona.negotiatorType : '',
    },
    template,
    mediaMode: session.mediaMode === 'voice' ? 'voice' : 'text',
    judgeSource: judgment.provider,
    judgment,
    messages: session.messages,
    completedAt: session.completedAt ? new Date(session.completedAt) : new Date(),
  })
  await replaceSessionReport(customerId, sessionId, {
    score: report.score,
    judgeSource: judgment.provider,
    report,
    durationMs: report.communication.durationSec * 1000,
  })
  return getSessionFor(actor, sessionId)
}

export async function saveSessionAudioFor(actor: Actor, sessionId: string, audio: Buffer, contentType: string) {
  const session = await ownSession(actor, sessionId)
  if (!audio.length) throw new AppError(400, 'VALIDATION_ERROR', 'O áudio está vazio.')
  const extension = contentType.includes('mpeg') ? 'mp3' : contentType.includes('wav') ? 'wav' : contentType.includes('ogg') ? 'ogg' : 'webm'
  const relative = await writeTrainingAudio(customerOf(actor), session.id, audio, extension)
  await setSessionAudio(customerOf(actor), session.id, relative)
  return { hasAudio: true }
}

export async function readSessionAudioFor(actor: Actor, sessionId: string) {
  const session = await getSessionFor(actor, sessionId)
  const relative = await sessionAudioPath(customerOf(actor), session.id)
  if (!relative) throw new AppError(404, 'NOT_FOUND', 'Esta simulação não tem gravação.')
  const { trainingAudioAbsolute } = await import('./trainingAudio.js')
  return { absolute: trainingAudioAbsolute(relative), contentType: relative.endsWith('.mp3') ? 'audio/mpeg' : relative.endsWith('.wav') ? 'audio/wav' : 'audio/webm' }
}

async function ownedUserIds(customerId: string, userIds: string[]) {
  const found = await userIdsInCustomer(customerId, userIds)
  if (found.length !== new Set(userIds).size) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Um dos usuários não pertence a esta empresa.')
  }
  return found
}

export async function listGroupsFor(actor: Actor) {
  return listGroups(managerCustomerOf(actor))
}

export async function getGroupFor(actor: Actor, id: string) {
  const row = await getGroup(managerCustomerOf(actor), id)
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Grupo não encontrado')
  return row
}

export async function createGroupFor(actor: Actor, input: z.infer<typeof groupWrite>) {
  const customerId = managerCustomerOf(actor)
  const userIds = await ownedUserIds(customerId, input.userIds)
  return insertGroup(customerId, {
    name: input.name,
    description: input.description,
    status: input.status,
    monthlyMinutes: input.monthlyMinutes ?? null,
    userIds,
  })
}

export async function updateGroupFor(actor: Actor, id: string, input: z.infer<typeof groupWrite>) {
  const customerId = managerCustomerOf(actor)
  const userIds = await ownedUserIds(customerId, input.userIds)
  const row = await updateGroup(customerId, id, {
    name: input.name,
    description: input.description,
    status: input.status,
    monthlyMinutes: input.monthlyMinutes ?? null,
    userIds,
  })
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Grupo não encontrado')
  return row
}

export async function patchDirectoryUserFor(
  actor: Actor,
  userId: string,
  patch: { profile?: 'customer_admin' | 'sdr_bdr'; status?: 'active' | 'inactive' | 'invited' },
) {
  const customerId = managerCustomerOf(actor)
  const row = await patchDirectoryUser(customerId, userId, patch)
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Usuário não encontrado')
  return row
}

export async function deleteGroupFor(actor: Actor, id: string) {
  const customerId = managerCustomerOf(actor)
  const ok = await deleteGroupCascade(customerId, id)
  if (!ok) throw new AppError(404, 'NOT_FOUND', 'Grupo não encontrado')
}

export function directoryFor(actor: Actor) {
  return listDirectory(managerCustomerOf(actor))
}

export async function getSettingsFor(actor: Actor) {
  // Any module user may read org policy flags; only managers may change them.
  return getCustomerSettings(customerOf(actor))
}

export async function patchSettingsFor(actor: Actor, patch: { require2fa: boolean }) {
  return upsertCustomerSettings(managerCustomerOf(actor), patch)
}

async function assertGroupMinuteQuota(customerId: string, userId: string) {
  const quotas = await listUserGroupQuotas(customerId, userId)
  const exhausted = quotas.find((group) => group.usedMinutes >= group.monthlyMinutes)
  if (!exhausted) return
  throw new AppError(
    409,
    'GROUP_QUOTA_EXCEEDED',
    `O grupo "${exhausted.name}" atingiu o limite de ${exhausted.monthlyMinutes} minutos neste mês.`,
  )
}

export async function dashboardsFor(actor: Actor, query: z.infer<typeof dashboardQuery>) {
  const customerId = customerOf(actor)
  const since = new Date(Date.now() - query.days * 24 * 60 * 60 * 1000)
  const rows = await listAnalyticsRows(customerId, since, {
    userId: actor.isManager ? query.userId ?? null : actor.userId,
    groupId: actor.isManager ? query.groupId ?? null : null,
    personaId: query.personaId ?? null,
  })
  const dayKey = (iso: string) => iso.slice(0, 10)
  const distinct = (list: typeof rows) => new Set(list.map((row) => row.userId)).size
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000
  const mau = distinct(rows)
  const wau = distinct(rows.filter((row) => new Date(row.completedAt).getTime() >= weekAgo))
  const dau = distinct(rows.filter((row) => new Date(row.completedAt).getTime() >= dayAgo))
  const ratio = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10)
  const minutes = Math.round(rows.reduce((sum, row) => sum + row.durationMs, 0) / 60000)

  const byUser = new Map<string, { userId: string; userName: string; scores: number[]; durationMs: number; count: number }>()
  for (const row of rows) {
    const current = byUser.get(row.userId) ?? { userId: row.userId, userName: row.userName, scores: [], durationMs: 0, count: 0 }
    current.scores.push(row.score)
    current.durationMs += row.durationMs
    current.count += 1
    byUser.set(row.userId, current)
  }
  const ranking = [...byUser.values()]
    .map((item) => ({
      userId: item.userId,
      userName: item.userName,
      averageScore: Math.round(item.scores.reduce((sum, score) => sum + score, 0) / item.scores.length),
      simulations: item.count,
      minutes: Math.round(item.durationMs / 60000),
    }))
    .sort((a, b) => b.averageScore - a.averageScore || b.simulations - a.simulations)

  const byDay = new Map<string, { scores: number[]; minutes: number; talk: number[]; pace: number[]; monologue: number[]; fillers: number[] }>()
  const byTemplate = new Map<string, number[]>()
  for (const row of rows) {
    const key = dayKey(row.completedAt)
    const bucket = byDay.get(key) ?? { scores: [], minutes: 0, talk: [], pace: [], monologue: [], fillers: [] }
    bucket.scores.push(row.score)
    bucket.minutes += row.durationMs / 60000
    const communication = row.communication
    if (communication) {
      if (typeof communication.talkListenPct === 'number') bucket.talk.push(communication.talkListenPct)
      if (typeof communication.wordsPerMinute === 'number') bucket.pace.push(communication.wordsPerMinute)
      if (typeof communication.longestMonologueSec === 'number') bucket.monologue.push(communication.longestMonologueSec)
      if (typeof communication.fillersPerMinute === 'number') bucket.fillers.push(communication.fillersPerMinute)
    }
    byDay.set(key, bucket)
    const scores = byTemplate.get(row.templateTitle) ?? []
    scores.push(row.score)
    byTemplate.set(row.templateTitle, scores)
  }
  const avg = (values: number[]) => (values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0)
  const series = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      date,
      averageScore: avg(bucket.scores),
      minutes: Math.round(bucket.minutes),
      talkListenPct: avg(bucket.talk),
      wordsPerMinute: avg(bucket.pace),
      longestMonologueSec: avg(bucket.monologue),
      fillersPerMinute: bucket.fillers.length
        ? Math.round((bucket.fillers.reduce((sum, value) => sum + value, 0) / bucket.fillers.length) * 10) / 10
        : 0,
    }))

  return {
    consumption: {
      days: query.days,
      simulations: rows.length,
      minutes,
      averageMinutes: rows.length ? Math.round((minutes / rows.length) * 10) / 10 : 0,
      activeUsers: mau,
    },
    engagement: {
      days: query.days,
      dau,
      wau,
      mau,
      dauMau: ratio(dau, mau),
      dauWau: ratio(dau, wau),
      wauMau: ratio(wau, mau),
      simulations: rows.length,
      minutes,
      series: series.map((item) => ({
        date: item.date,
        dauMau: ratio(dau, mau),
        dauWau: ratio(dau, wau),
        wauMau: ratio(wau, mau),
        simulations: item.minutes,
      })),
    },
    ranking,
    performance: {
      series: series.map((item) => ({ date: item.date, averageScore: item.averageScore, minutes: item.minutes })),
      templates: [...byTemplate.entries()].map(([title, scores]) => ({ title, averageScore: avg(scores), simulations: scores.length })),
    },
    communication: {
      series: series.map((item) => ({
        date: item.date,
        talkListenPct: item.talkListenPct,
        wordsPerMinute: item.wordsPerMinute,
        longestMonologueSec: item.longestMonologueSec,
        fillersPerMinute: item.fillersPerMinute,
      })),
    },
  }
}

export function metricsFor(actor: Actor) {
  return getMetrics(customerOf(actor), actor.userId, config.PABX_TIMEZONE)
}

export function statusFor() {
  return { ai: aiStatus(), maxTurns: config.TRAINING_AI_MAX_TURNS }
}
