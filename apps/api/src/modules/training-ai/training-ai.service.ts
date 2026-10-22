import { randomUUID } from 'node:crypto'
import type { z } from 'zod'
import { config } from '../../core/config.js'
import { withTransaction } from '../../core/db.js'
import { AppError } from '../../core/errors.js'
import { log } from '../../core/logger.js'
import { aiStatus, requireAiProvider, type AiProvider } from './ai/index.js'
import { takeSentences } from './ai/sentences.js'
import type { PersonaProfile, ScenarioProfile } from './ai/types.js'
import { MAX_VOICE_AUDIO_BYTES, voiceClient, voiceStatus, type Gender } from './ai/voice.js'
import { buildReport, communicationMetrics, judgeByRules, normalizeText, type Judgment, type Template } from './rubric.js'
import { starterPersonas, starterScenarios, starterTemplates } from './starter.js'
import {
  clipContentType,
  clipExtension,
  listMessageClips,
  messageClipPath,
  removeTrainingAudioFiles,
  writeMessageClip,
  writeTrainingAudio,
} from './trainingAudio.js'
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
  getSessionHead,
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
  const session = await withClipFlags(customerOf(actor), row)
  return session.report
    ? { ...session, report: { ...session.report, canDeleteAudio: row.userId === actor.userId } }
    : session
}

// ------------------------------------------------------------- recordings of the call
// Each spoken message keeps its own recording: the trainee's words as the microphone heard them, the persona's
// words as the speech service made them. The report plays them one after the other, in the order of the call.

type PendingClip = { token: string; audio: Buffer; contentType: string; text: string; at: number }

/** The last thing each trainee said, waiting for the turn that will give it a message to belong to. */
const pendingClips = new Map<string, PendingClip>()
const PENDING_CLIP_TTL_MS = 5 * 60_000

function sameWords(a: string, b: string) {
  const clean = (value: string) => normalizeText(value).replace(/[^a-z0-9]+/g, ' ').trim()
  return clean(a) === clean(b)
}

function rememberClip(sessionId: string, clip: Omit<PendingClip, 'token'>) {
  const token = randomUUID()
  if (pendingClips.size > 200) {
    for (const [key, value] of pendingClips) if (Date.now() - value.at > PENDING_CLIP_TTL_MS) pendingClips.delete(key)
    if (pendingClips.size > 1000) pendingClips.clear()
  }
  pendingClips.set(sessionId, { ...clip, token })
  return token
}

/** Associates the captured speech with its exact transcription request, tolerating browser text normalization. */
function takePendingClip(sessionId: string, text: string, token?: string): PendingClip | null {
  const clip = pendingClips.get(sessionId)
  if (!clip) return null
  if (Date.now() - clip.at > PENDING_CLIP_TTL_MS) {
    pendingClips.delete(sessionId)
    return null
  }
  if (token ? clip.token !== token : !sameWords(clip.text, text)) return null
  pendingClips.delete(sessionId)
  return clip
}

async function storeClips(customerId: string, sessionId: string, clips: { messageId: string; audio: Buffer; extension: string }[]) {
  try {
    await Promise.all(clips.map((clip) => writeMessageClip(customerId, sessionId, clip.messageId, clip.audio, clip.extension)))
  } catch (error) {
    // The call and its score do not depend on the recording.
    log('warn', 'training-ai could not store the call audio', { reason: error instanceof Error ? error.message : String(error) })
  }
}

/** Marks the messages that have a recording (`hasAudio`), in the transcript and in the report copy of it. */
async function withClipFlags<T extends { id: string; messages: { id: string }[]; report: Record<string, unknown> | null }>(
  customerId: string,
  session: T,
): Promise<T> {
  const clips = await listMessageClips(customerId, session.id)
  if (clips.size === 0) return session
  const flag = <M extends { id: string }>(messages: M[]) => messages.map((message) => (clips.has(message.id) ? { ...message, hasAudio: true } : message))
  const report = session.report
  return {
    ...session,
    messages: flag(session.messages),
    report: report ? { ...report, messages: Array.isArray(report.messages) ? flag(report.messages as { id: string }[]) : report.messages } : null,
  }
}

/** The recording of one message, for the report's player. */
export async function readMessageAudioFor(actor: Actor, sessionId: string, messageId: string) {
  const session = await getSessionFor(actor, sessionId)
  const extension = (await listMessageClips(customerOf(actor), session.id)).get(messageId)
  if (!extension || !session.messages.some((message) => message.id === messageId)) {
    throw new AppError(404, 'NOT_FOUND', 'Esta fala não tem gravação.')
  }
  return {
    absolute: messageClipPath(customerOf(actor), session.id, messageId, extension),
    contentType: clipContentType(extension),
  }
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

/**
 * The persona and scenario of a session. `withTemplate: false` skips the evaluation template, which only the final
 * judgement needs: a conversation turn does not wait for that query.
 */
async function sessionContext(
  customerId: string,
  personaId: string | null,
  scenarioId: string | null,
  { withTemplate = true }: { withTemplate?: boolean } = {},
) {
  // Persona and scenario do not depend on each other: both are read at once.
  const [persona, scenario] = await Promise.all([
    personaId ? getPersona(customerId, personaId) : Promise.resolve(null),
    scenarioId ? getScenario(customerId, scenarioId) : Promise.resolve(null),
  ])
  if (!persona) {
    throw new AppError(409, 'SESSION_UNAVAILABLE', 'O agente desta sessão foi removido.')
  }
  if (scenarioId) {
    if (!scenario) throw new AppError(409, 'SESSION_UNAVAILABLE', 'O cenário desta sessão foi removido.')
    const template = withTemplate ? await getTemplate(customerId, String(scenario.evaluationTemplateId)) : null
    return { persona: persona as PersonaProfile, scenario: scenario as ScenarioProfile, template: template as unknown as Template | null }
  }
  const templateId = persona.evaluationTemplateId == null ? '' : String(persona.evaluationTemplateId)
  if (!templateId) throw new AppError(409, 'TEMPLATE_UNAVAILABLE', 'Esta persona não tem um template de avaliação.')
  const template = withTemplate ? await getTemplate(customerId, templateId) : null
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
  const turn = await prepareTurn(actor, sessionId, text)
  const reply = await turn.provider.reply(turn.request)
  return saveTurn(turn, reply.text, timing)
}

type PreparedTurn = Awaited<ReturnType<typeof prepareTurn>>

/** Everything a trainee turn needs before the model is asked: the open session, its limits, the persona and the history. */
async function prepareTurn(actor: Actor, sessionId: string, text: string, options: { withTemplate?: boolean } = {}) {
  const customerId = customerOf(actor)
  const session = await ownSession(actor, sessionId)
  if (session.status !== 'in_progress') throw new AppError(409, 'SESSION_CLOSED', 'Esta sessão já foi encerrada.')

  const traineeCount = session.messages.filter((message) => message.role === 'user').length
  if (traineeCount >= config.TRAINING_AI_MAX_TURNS) {
    throw new AppError(409, 'SESSION_TURN_LIMIT', `Limite de ${config.TRAINING_AI_MAX_TURNS} mensagens atingido. Encerre o treino para ver a avaliação.`)
  }

  const { persona, scenario } = await sessionContext(customerId, session.personaId, session.scenarioId, options)
  const provider = requireAiProvider()
  const pending = { id: 'pending', role: 'user' as const, speaker: TRAINEE_SPEAKER, text, timestamp: new Date().toISOString() }
  return {
    sessionId,
    session,
    persona,
    provider,
    traineeCount,
    text,
    request: {
      persona,
      scenario,
      history: [...session.messages, pending],
      exchangeIndex: traineeCount,
      mediaMode: (session.mediaMode === 'voice' ? 'voice' : 'text') as 'voice' | 'text',
    },
  }
}

/** Stores the trainee message with the persona's reply, once the reply exists. */
async function saveTurn(turn: PreparedTurn, replyText: string, timing: { offsetMs?: number; durationMs?: number }) {
  const aiText = replyText.trim().slice(0, 2000)
  if (!aiText) throw new AppError(502, 'AI_PROVIDER_ERROR', 'O provedor de IA devolveu uma resposta vazia.')
  const aiWords = aiText.split(/\s+/).filter(Boolean).length

  const stored = await appendTurn(turn.sessionId, turn.session.messages.length + 1, {
    userText: turn.text,
    traineeName: TRAINEE_SPEAKER,
    aiText,
    personaName: turn.persona.name,
    userOffsetMs: timing.offsetMs ?? null,
    userDurationMs: timing.durationMs ?? null,
    aiDurationMs: Math.max(1000, Math.round((aiWords / 2.3) * 1000)),
  })
  return {
    ...stored,
    traineeMessages: turn.traineeCount + 1,
    turnsLeft: config.TRAINING_AI_MAX_TURNS - turn.traineeCount - 1,
  }
}

/** Where the time of one spoken turn went, in ms since the request arrived (the *At values) or per stage. */
export type SpokenTurnTiming = {
  prepareMs: number
  firstTokenAt: number | null
  firstSentenceAt: number | null
  firstAudioAt: number | null
  totalMs: number
}

export type SpokenTurnEvent =
  | { type: 'sentence'; index: number; text: string; audio: string | null }
  | { type: 'done'; data: Awaited<ReturnType<typeof saveTurn>>; timing: SpokenTurnTiming }

/**
 * One voice turn, streamed: the model writes the reply, each finished sentence goes to text-to-speech at once
 * and is sent on as text plus base64 MP3, so the persona starts talking while the rest is still being written.
 * The turn is stored when the reply ends, even if the listener left (a barge-in), so the transcript stays whole.
 */
export async function streamSpokenTurnFor(
  actor: Actor,
  sessionId: string,
  input: { text: string; gender: Gender; offsetMs?: number; durationMs?: number; recordingToken?: string },
  emit: (event: SpokenTurnEvent) => void,
  signal: AbortSignal,
) {
  const startedAt = performance.now()
  const turn = await prepareTurn(actor, sessionId, input.text, { withTemplate: false })
  const preparedAt = performance.now()
  if (turn.session.mediaMode !== 'voice') throw new AppError(409, 'SESSION_NOT_VOICE', 'Esta sessão não é uma conversa por voz.')
  const speech = voiceClient()

  // Sentences go out in order, whichever speech request finishes first.
  let sent = Promise.resolve()
  const spoken: Buffer[] = [] // the persona's recording of this reply, sentence after sentence
  let index = 0
  let full = ''
  let buffer = ''
  let skipSpeech = false
  let firstTokenAt: number | null = null
  let firstSentenceAt: number | null = null
  let firstAudioAt: number | null = null
  const since = () => Math.round(performance.now() - startedAt)

  function dispatch(sentence: string) {
    if (firstSentenceAt === null) firstSentenceAt = since()
    const position = index
    index += 1
    const audio: Promise<Buffer | null> =
      speech && !skipSpeech
        ? speech
            .synthesize(sentence, input.gender)
            .catch((error) => {
              log('warn', 'training-ai speech failed for a sentence', {
                message: error instanceof Error ? error.message : String(error),
              })
              return null // the browser voice covers this sentence
            })
        : Promise.resolve(null)
    sent = sent.then(async () => {
      const mp3 = await audio
      if (firstAudioAt === null) firstAudioAt = since()
      if (mp3) spoken.push(mp3)
      if (!signal.aborted) emit({ type: 'sentence', index: position, text: sentence, audio: mp3 ? mp3.toString('base64') : null })
    })
  }

  const pieces = turn.provider.replyStream
    ? turn.provider.replyStream(turn.request, signal)
    : (async function* () {
        yield (await turn.provider.reply(turn.request)).text
      })()

  for await (const piece of pieces) {
    if (firstTokenAt === null) firstTokenAt = since()
    full += piece
    buffer += piece
    // The first sentence leaves at its first comma: speech starts sooner, the rest follows as usual.
    const { sentences, rest } = takeSentences(buffer, false, { eager: index === 0 })
    buffer = rest
    sentences.forEach(dispatch)
    if (signal.aborted) skipSpeech = true
    if (full.length >= MAX_SPOKEN_REPLY_CHARS) break
  }
  const tail = takeSentences(buffer, true).sentences
  tail.forEach(dispatch)
  await sent

  // A listener that left before any text arrived leaves nothing to store.
  if (!full.trim()) {
    if (signal.aborted) return
    throw new AppError(502, 'AI_PROVIDER_ERROR', 'O provedor de IA devolveu uma resposta vazia.')
  }
  const userClip = takePendingClip(sessionId, input.text, input.recordingToken)
  const stored = await saveTurn(turn, full, { offsetMs: input.offsetMs, durationMs: input.durationMs })
  // Stored in the background: the persona's reply does not wait for the files.
  const clips: { messageId: string; audio: Buffer; extension: string }[] = []
  if (userClip) clips.push({ messageId: stored.userMessage.id, audio: userClip.audio, extension: clipExtension(userClip.contentType) })
  if (spoken.length) clips.push({ messageId: stored.aiMessage.id, audio: Buffer.concat(spoken), extension: 'mp3' })
  if (clips.length) await storeClips(customerOf(actor), sessionId, clips)
  const timing: SpokenTurnTiming = {
    prepareMs: Math.round(preparedAt - startedAt),
    firstTokenAt,
    firstSentenceAt,
    firstAudioAt,
    totalMs: since(),
  }
  log('info', 'training-ai voice turn', { ...timing, sentences: index, chars: full.length })
  if (!signal.aborted) emit({ type: 'done', data: stored, timing })
  return stored
}

const MAX_SPOKEN_REPLY_CHARS = 2000

export async function finishSessionFor(actor: Actor, sessionId: string) {
  const customerId = customerOf(actor)
  const session = await ownSession(actor, sessionId)
  if (session.status === 'completed') return withClipFlags(customerId, session)

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
  return withClipFlags(customerId, await ownSession(actor, sessionId))
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

export async function deleteSessionAudioFor(actor: Actor, sessionId: string) {
  const session = await ownSession(actor, sessionId)
  if (session.status !== 'completed') {
    throw new AppError(409, 'SESSION_OPEN', 'Encerre a simulação antes de apagar a gravação.')
  }
  await removeTrainingAudioFiles(customerOf(actor), session.id)
  await setSessionAudio(customerOf(actor), session.id, null)
  pendingClips.delete(session.id)
  return { hasAudio: false }
}

/** A running voice session: the only time speech is transcribed or synthesized. Keeps the endpoints from being open TTS/STT proxies. */
async function openVoiceSession(actor: Actor, sessionId: string) {
  // One query: these checks do not need the transcript, and every spoken turn passes through here.
  const session = await getSessionHead(customerOf(actor), sessionId, actor.userId)
  if (!session) throw new AppError(404, 'NOT_FOUND', 'Session not found')
  if (session.status !== 'in_progress') throw new AppError(409, 'SESSION_CLOSED', 'Esta sessão já foi encerrada.')
  if (session.mediaMode !== 'voice') throw new AppError(409, 'SESSION_NOT_VOICE', 'Esta sessão não é uma conversa por voz.')
  const client = voiceClient()
  if (!client) throw new AppError(503, 'VOICE_NOT_CONFIGURED', 'A voz do servidor não está configurada.')
  return { session, client }
}

/** The trainee's spoken turn as text. Empty when nothing intelligible was said. */
export async function transcribeSessionAudioFor(actor: Actor, sessionId: string, audio: Buffer, contentType: string) {
  if (!audio.length) throw new AppError(400, 'VALIDATION_ERROR', 'O áudio está vazio.')
  if (audio.length > MAX_VOICE_AUDIO_BYTES) throw new AppError(413, 'AUDIO_TOO_LARGE', 'O áudio é grande demais.')
  const started = performance.now()
  const { session, client } = await openVoiceSession(actor, sessionId)
  const language = await personaLanguage(customerOf(actor), session.personaId)
  const lookedUp = performance.now()
  const text = await client.transcribe(audio, contentType, language)
  const done = performance.now()
  const timing = { lookupMs: Math.round(lookedUp - started), sttMs: Math.round(done - lookedUp), bytes: audio.length }
  log('info', 'training-ai stt', timing)
  const recordingToken = text.trim()
    ? rememberClip(session.id, { audio, contentType, text, at: Date.now() })
    : null
  return { text, timing, recordingToken }
}

const LANGUAGE_TTL_MS = 60_000
const languages = new Map<string, { language: string; at: number }>()

/** The persona's language for speech recognition. Cached briefly: it is read once per spoken turn and rarely changes. */
async function personaLanguage(customerId: string, personaId: string | null) {
  const key = `${customerId}:${personaId}`
  const cached = languages.get(key)
  if (cached && Date.now() - cached.at < LANGUAGE_TTL_MS) return cached.language
  const persona = personaId ? await getPersona(customerId, personaId) : null
  if (!persona) throw new AppError(409, 'SESSION_UNAVAILABLE', 'O agente desta sessão foi removido.')
  const language = typeof persona.language === 'string' && persona.language ? persona.language : 'pt-BR'
  if (languages.size > 500) languages.clear()
  languages.set(key, { language, at: Date.now() })
  return language
}

/** The persona's line as MP3, in the voice that suits her. */
export async function speakSessionFor(actor: Actor, sessionId: string, text: string, gender: Gender) {
  const { client } = await openVoiceSession(actor, sessionId)
  const audio = await client.synthesize(text, gender)
  void keepSpokenLine(actor, sessionId, text, audio)
  return audio
}

/** A line spoken outside a streamed turn (the opening line): its recording goes to the matching persona message. */
async function keepSpokenLine(actor: Actor, sessionId: string, text: string, audio: Buffer) {
  try {
    const customerId = customerOf(actor)
    const session = await getSession(customerId, sessionId, actor.userId)
    if (!session) return
    const clips = await listMessageClips(customerId, sessionId)
    const line = session.messages.find((message) => message.role === 'ai' && !clips.has(message.id) && sameWords(message.text, text))
    if (line) await storeClips(customerId, sessionId, [{ messageId: line.id, audio, extension: 'mp3' }])
  } catch (error) {
    log('warn', 'training-ai could not keep a spoken line', { reason: error instanceof Error ? error.message : String(error) })
  }
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

/** Calendar days (YYYY-MM-DD) ending today in `timeZone`, oldest first. */
function calendarDays(count: number, timeZone: string, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const [year, month, day] = today.split('-').map(Number)
  const keys: string[] = []
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    keys.push(new Date(Date.UTC(year, month - 1, day - offset)).toISOString().slice(0, 10))
  }
  return keys
}

const ENGAGEMENT_WEEK = 7
const ENGAGEMENT_MONTH = 30

export async function dashboardsFor(actor: Actor, query: z.infer<typeof dashboardQuery>) {
  const customerId = customerOf(actor)
  const timeZone = query.tz || config.PABX_TIMEZONE
  const days = calendarDays(query.days, timeZone)
  const firstDay = days[0]
  const dayOf = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
  const dayKey = (iso: string) => dayOf.format(new Date(iso))

  // Rolling WAU/MAU on the first day of the period look back up to 30 days before it.
  const since = new Date(Date.now() - (query.days + ENGAGEMENT_MONTH + 1) * 24 * 60 * 60 * 1000)
  const allRows = await listAnalyticsRows(customerId, since, {
    userId: actor.isManager ? query.userId ?? null : actor.userId,
    groupId: actor.isManager ? query.groupId ?? null : null,
    personaId: query.personaId ?? null,
  })
  const keyed = allRows.map((row) => ({ ...row, day: dayKey(row.completedAt) }))
  const rows = keyed.filter((row) => row.day >= firstDay)

  const ratio = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10)
  const minutes = Math.round(rows.reduce((sum, row) => sum + row.durationMs, 0) / 60000)

  const usersByDay = new Map<string, Set<string>>()
  for (const row of keyed) {
    const set = usersByDay.get(row.day) ?? new Set<string>()
    set.add(row.userId)
    usersByDay.set(row.day, set)
  }
  const activeUsers = (endDay: string, windowDays: number) => {
    const [y, m, d] = endDay.split('-').map(Number)
    const users = new Set<string>()
    for (let back = 0; back < windowDays; back += 1) {
      const key = new Date(Date.UTC(y, m - 1, d - back)).toISOString().slice(0, 10)
      usersByDay.get(key)?.forEach((id) => users.add(id))
    }
    return users.size
  }
  const engagementSeries = days.map((date) => {
    const dau = activeUsers(date, 1)
    const wau = activeUsers(date, ENGAGEMENT_WEEK)
    const mau = activeUsers(date, ENGAGEMENT_MONTH)
    return {
      date,
      dau,
      wau,
      mau,
      dauMau: ratio(dau, mau),
      dauWau: ratio(dau, wau),
      wauMau: ratio(wau, mau),
      simulations: rows.filter((row) => row.day === date).length,
    }
  })
  // Headline stickiness: the average daily ratio over the days that had any monthly activity.
  const averageRatio = (key: 'dauMau' | 'dauWau' | 'wauMau', base: 'mau' | 'wau') => {
    const counted = engagementSeries.filter((item) => item[base] > 0)
    if (!counted.length) return 0
    return Math.round((counted.reduce((sum, item) => sum + item[key], 0) / counted.length) * 10) / 10
  }
  const lastDay = engagementSeries[engagementSeries.length - 1]

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

  type DayBucket = { scores: number[]; durationMs: number[]; talk: number[]; pace: number[]; monologue: number[]; fillers: number[] }
  const emptyBucket = (): DayBucket => ({ scores: [], durationMs: [], talk: [], pace: [], monologue: [], fillers: [] })
  const byDay = new Map<string, DayBucket>()
  const byTemplate = new Map<string, { scores: number[]; byDay: Map<string, number[]> }>()
  for (const row of rows) {
    const bucket = byDay.get(row.day) ?? emptyBucket()
    bucket.scores.push(row.score)
    bucket.durationMs.push(row.durationMs)
    const communication = row.communication
    if (communication) {
      if (typeof communication.talkListenPct === 'number') bucket.talk.push(communication.talkListenPct)
      if (typeof communication.wordsPerMinute === 'number') bucket.pace.push(communication.wordsPerMinute)
      if (typeof communication.longestMonologueSec === 'number') bucket.monologue.push(communication.longestMonologueSec)
      if (typeof communication.fillersPerMinute === 'number') bucket.fillers.push(communication.fillersPerMinute)
    }
    byDay.set(row.day, bucket)
    const template = byTemplate.get(row.templateTitle) ?? { scores: [], byDay: new Map<string, number[]>() }
    template.scores.push(row.score)
    template.byDay.set(row.day, [...(template.byDay.get(row.day) ?? []), row.score])
    byTemplate.set(row.templateTitle, template)
  }
  /** Average rounded to `digits`; `null` when the day had nothing to measure, so charts can leave a gap. */
  const mean = (values: number[], digits = 0) => {
    if (!values.length) return null
    const factor = 10 ** digits
    return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * factor) / factor
  }
  const series = days.map((date) => {
    const bucket = byDay.get(date) ?? emptyBucket()
    const totalMs = bucket.durationMs.reduce((sum, value) => sum + value, 0)
    return {
      date,
      simulations: bucket.scores.length,
      averageScore: mean(bucket.scores),
      minutes: Math.round((totalMs / 60000) * 10) / 10,
      averageMinutes: bucket.durationMs.length ? Math.round((totalMs / bucket.durationMs.length / 60000) * 10) / 10 : null,
      talkListenPct: mean(bucket.talk),
      wordsPerMinute: mean(bucket.pace),
      longestMonologueSec: mean(bucket.monologue),
      fillersPerMinute: mean(bucket.fillers, 1),
    }
  })
  const activeInPeriod = new Set(rows.map((row) => row.userId)).size

  return {
    timeZone,
    consumption: {
      days: query.days,
      simulations: rows.length,
      minutes,
      averageMinutes: rows.length ? Math.round((minutes / rows.length) * 10) / 10 : 0,
      activeUsers: activeInPeriod,
    },
    engagement: {
      days: query.days,
      dau: lastDay?.dau ?? 0,
      wau: lastDay?.wau ?? 0,
      mau: lastDay?.mau ?? 0,
      activeUsers: activeInPeriod,
      dauMau: averageRatio('dauMau', 'mau'),
      dauWau: averageRatio('dauWau', 'wau'),
      wauMau: averageRatio('wauMau', 'mau'),
      simulations: rows.length,
      minutes,
      series: engagementSeries,
    },
    ranking,
    performance: {
      series: series.map((item) => ({
        date: item.date,
        simulations: item.simulations,
        averageScore: item.averageScore,
        minutes: item.minutes,
        averageMinutes: item.averageMinutes,
      })),
      templates: [...byTemplate.entries()]
        .map(([title, template]) => ({
          title,
          averageScore: mean(template.scores) ?? 0,
          simulations: template.scores.length,
          series: days.map((date) => ({ date, averageScore: mean(template.byDay.get(date) ?? []) })),
        }))
        .sort((a, b) => b.simulations - a.simulations || a.title.localeCompare(b.title)),
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
  return { ai: aiStatus(), voice: voiceStatus(), maxTurns: config.TRAINING_AI_MAX_TURNS }
}
