import type { Pool, PoolConnection } from 'mysql2/promise'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { ulid } from 'ulid'
import { isDuplicateKeyError, pool } from '../../core/db.js'
import { AppError } from '../../core/errors.js'
import { resolveSort, type PageQuery } from '../../core/list.js'
import type { ChatMessage } from './rubric.js'

type JsonRow = RowDataPacket & Record<string, unknown>
type Db = Pick<Pool | PoolConnection, 'query'>
type Params = Record<string, string | number | Date | null>

function parseJson(value: unknown): Record<string, unknown> {
  if (value == null) return {}
  if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>
  if (Buffer.isBuffer(value)) return JSON.parse(value.toString('utf8')) as Record<string, unknown>
  if (typeof value === 'object') return value as Record<string, unknown>
  return {}
}

function iso(value: unknown): string | null {
  if (value == null) return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function likeTerm(q: string | undefined): string | null {
  if (!q) return null
  return `%${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}

export type ListResult<T> = { rows: T[]; total: number }

const personaSort = { createdAt: 'created_at', name: 'name' }
const templateSort = { createdAt: 'created_at', title: 'title' }
const scenarioSort = { createdAt: 'created_at', title: 'title' }
const sessionSort = { createdAt: 's.created_at' }

// ---------------------------------------------------------------- catalog rows

type Doc = Record<string, unknown>

function personaFromRow(row: JsonRow): Doc & { id: string; name: string; status: string } {
  const profile = parseJson(row.profile_json)
  return {
    ...profile,
    id: String(row.id),
    name: String(row.name),
    status: String(row.status),
    industry: row.industry == null ? profile.industry : String(row.industry),
    difficulty: row.difficulty == null ? profile.difficulty : String(row.difficulty),
    visibility: row.visibility == null ? (profile.visibility ?? 'company') : String(row.visibility),
    ownerUserId: row.owner_user_id == null ? (profile.ownerUserId ?? null) : String(row.owner_user_id),
    groupId: row.group_id == null ? (profile.groupId ?? null) : String(row.group_id),
    scenarioType: row.scenario_type == null ? (profile.scenarioType ?? null) : String(row.scenario_type),
    evaluationTemplateId:
      row.evaluation_template_id == null ? (profile.evaluationTemplateId ?? null) : String(row.evaluation_template_id),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

function templateFromRow(row: JsonRow): Doc & { id: string; title: string } {
  const body = parseJson(row.template_json)
  return {
    ...body,
    id: String(row.id),
    title: String(row.title),
    contactType: row.contact_type == null ? body.contactType : String(row.contact_type),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

function scenarioFromRow(row: JsonRow): Doc & { id: string; title: string; personaId: string; evaluationTemplateId: string } {
  const body = parseJson(row.scenario_json)
  return {
    ...body,
    id: String(row.id),
    title: String(row.title),
    difficulty: String(row.difficulty),
    funnelStage: row.funnel_stage == null ? (body.funnelStage ?? null) : String(row.funnel_stage),
    personaId: String(row.persona_id),
    evaluationTemplateId: String(row.evaluation_template_id),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

async function listRows<T>(
  table: string,
  filters: string[],
  params: Params,
  query: PageQuery,
  allowedSort: Record<string, string>,
  fallbackSort: string,
  mapRow: (row: JsonRow) => T,
): Promise<ListResult<T>> {
  const where = filters.join(' AND ')
  const sort = resolveSort(query.sort, allowedSort, fallbackSort)
  const offset = (query.page - 1) * query.pageSize
  const [countRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM ${table} WHERE ${where}`, params)
  const [rows] = await pool.query<JsonRow[]>(
    `SELECT * FROM ${table}
     WHERE ${where}
     ORDER BY ${sort.column} ${sort.direction}
     LIMIT :limit OFFSET :offset`,
    { ...params, limit: query.pageSize, offset },
  )
  return { rows: rows.map(mapRow), total: Number(countRows[0]?.total ?? 0) }
}

function baseFilters(customerId: string): { filters: string[]; params: Params } {
  return { filters: ['customer_id = :customerId', 'deleted_at IS NULL'], params: { customerId } }
}

// -------------------------------------------------------------------- personas

export async function listPersonas(
  customerId: string,
  viewer: { userId: string; isManager: boolean },
  query: PageQuery & { status?: string; difficulty?: string },
) {
  const { filters, params } = baseFilters(customerId)
  params.viewerId = viewer.userId
  params.isManager = viewer.isManager ? 1 : 0
  filters.push(`(
    :isManager = 1
    OR visibility = 'company'
    OR (visibility = 'individual' AND owner_user_id = :viewerId)
    OR (visibility = 'group' AND group_id IN (
      SELECT m.group_id
      FROM training_group_members m
      JOIN training_groups g ON g.id = m.group_id AND g.customer_id = m.customer_id
      WHERE m.customer_id = :customerId
        AND m.user_id = :viewerId
        AND g.deleted_at IS NULL
        AND g.status = 'active'
    ))
  )`)
  const term = likeTerm(query.q)
  if (term) {
    filters.push('name LIKE :term')
    params.term = term
  }
  if (query.status) {
    filters.push('status = :status')
    params.status = query.status
  }
  if (query.difficulty) {
    filters.push('difficulty = :difficulty')
    params.difficulty = query.difficulty
  }
  return listRows('training_personas', filters, params, query, personaSort, 'createdAt', personaFromRow)
}

export async function getPersona(customerId: string, id: string, db: Db = pool) {
  const [rows] = await db.query<JsonRow[]>(
    `SELECT * FROM training_personas WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL LIMIT 1`,
    { customerId, id },
  )
  return rows[0] ? personaFromRow(rows[0]) : null
}

export async function insertPersona(customerId: string, input: Record<string, unknown>, db: Db = pool) {
  const id = ulid()
  const now = new Date()
  await db.query(
    `INSERT INTO training_personas
      (id, customer_id, name, status, industry, difficulty, visibility, owner_user_id, group_id,
       scenario_type, evaluation_template_id, profile_json, created_at, updated_at)
     VALUES (:id, :customerId, :name, :status, :industry, :difficulty, :visibility, :ownerUserId, :groupId,
       :scenarioType, :evaluationTemplateId, :profileJson, :now, :now)`,
    {
      id,
      customerId,
      name: String(input.name),
      status: String(input.status ?? 'active'),
      industry: input.industry == null ? null : String(input.industry),
      difficulty: input.difficulty == null ? null : String(input.difficulty),
      visibility: String(input.visibility ?? 'company'),
      ownerUserId: input.ownerUserId == null ? null : String(input.ownerUserId),
      groupId: input.groupId == null ? null : String(input.groupId),
      scenarioType: input.scenarioType == null ? null : String(input.scenarioType),
      evaluationTemplateId: input.evaluationTemplateId == null ? null : String(input.evaluationTemplateId),
      profileJson: JSON.stringify(input),
      now,
    },
  )
  return getPersona(customerId, id, db)
}

export async function updatePersona(customerId: string, id: string, input: Record<string, unknown>) {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE training_personas
     SET name = :name, status = :status, industry = :industry, difficulty = :difficulty,
         visibility = :visibility, owner_user_id = COALESCE(owner_user_id, :ownerUserId),
         group_id = :groupId, scenario_type = :scenarioType, evaluation_template_id = :evaluationTemplateId,
         profile_json = :profileJson, updated_at = :now
     WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL`,
    {
      id,
      customerId,
      name: String(input.name),
      status: String(input.status ?? 'active'),
      industry: input.industry == null ? null : String(input.industry),
      difficulty: input.difficulty == null ? null : String(input.difficulty),
      visibility: String(input.visibility ?? 'company'),
      ownerUserId: input.ownerUserId == null ? null : String(input.ownerUserId),
      groupId: input.groupId == null ? null : String(input.groupId),
      scenarioType: input.scenarioType == null ? null : String(input.scenarioType),
      evaluationTemplateId: input.evaluationTemplateId == null ? null : String(input.evaluationTemplateId),
      profileJson: JSON.stringify(input),
      now: new Date(),
    },
  )
  return result.affectedRows === 0 ? null : getPersona(customerId, id)
}

// ------------------------------------------------------------------- templates

export async function listTemplates(customerId: string, query: PageQuery) {
  const { filters, params } = baseFilters(customerId)
  const term = likeTerm(query.q)
  if (term) {
    filters.push('title LIKE :term')
    params.term = term
  }
  return listRows('training_templates', filters, params, query, templateSort, 'createdAt', templateFromRow)
}

export async function getTemplate(customerId: string, id: string, db: Db = pool) {
  const [rows] = await db.query<JsonRow[]>(
    `SELECT * FROM training_templates WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL LIMIT 1`,
    { customerId, id },
  )
  return rows[0] ? templateFromRow(rows[0]) : null
}

export async function insertTemplate(customerId: string, input: Record<string, unknown>, db: Db = pool) {
  const id = ulid()
  const now = new Date()
  await db.query(
    `INSERT INTO training_templates
      (id, customer_id, title, contact_type, template_json, created_at, updated_at)
     VALUES (:id, :customerId, :title, :contactType, :templateJson, :now, :now)`,
    {
      id,
      customerId,
      title: String(input.title),
      contactType: input.contactType ? String(input.contactType) : null,
      templateJson: JSON.stringify(input),
      now,
    },
  )
  return getTemplate(customerId, id, db)
}

export async function updateTemplate(customerId: string, id: string, input: Record<string, unknown>) {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE training_templates
     SET title = :title, contact_type = :contactType, template_json = :templateJson, updated_at = :now
     WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL`,
    {
      id,
      customerId,
      title: String(input.title),
      contactType: input.contactType ? String(input.contactType) : null,
      templateJson: JSON.stringify(input),
      now: new Date(),
    },
  )
  return result.affectedRows === 0 ? null : getTemplate(customerId, id)
}

// ------------------------------------------------------------------- scenarios

export async function listScenarios(
  customerId: string,
  query: PageQuery & { difficulty?: string; funnelStage?: string },
) {
  const { filters, params } = baseFilters(customerId)
  const term = likeTerm(query.q)
  if (term) {
    filters.push('title LIKE :term')
    params.term = term
  }
  if (query.difficulty) {
    filters.push('difficulty = :difficulty')
    params.difficulty = query.difficulty
  }
  if (query.funnelStage) {
    filters.push('funnel_stage = :funnelStage')
    params.funnelStage = query.funnelStage
  }
  return listRows('training_scenarios', filters, params, query, scenarioSort, 'createdAt', scenarioFromRow)
}

export async function getScenario(customerId: string, id: string, db: Db = pool) {
  const [rows] = await db.query<JsonRow[]>(
    `SELECT * FROM training_scenarios WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL LIMIT 1`,
    { customerId, id },
  )
  return rows[0] ? scenarioFromRow(rows[0]) : null
}

export async function insertScenario(customerId: string, input: Record<string, unknown>, db: Db = pool) {
  const id = ulid()
  const now = new Date()
  await db.query(
    `INSERT INTO training_scenarios
      (id, customer_id, title, difficulty, funnel_stage, persona_id, evaluation_template_id, scenario_json, created_at, updated_at)
     VALUES
      (:id, :customerId, :title, :difficulty, :funnelStage, :personaId, :evaluationTemplateId, :scenarioJson, :now, :now)`,
    {
      id,
      customerId,
      title: String(input.title),
      difficulty: String(input.difficulty),
      funnelStage: input.funnelStage ? String(input.funnelStage) : null,
      personaId: String(input.personaId),
      evaluationTemplateId: String(input.evaluationTemplateId),
      scenarioJson: JSON.stringify(input),
      now,
    },
  )
  return getScenario(customerId, id, db)
}

export async function updateScenario(customerId: string, id: string, input: Record<string, unknown>) {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE training_scenarios
     SET title = :title, difficulty = :difficulty, funnel_stage = :funnelStage, persona_id = :personaId,
         evaluation_template_id = :evaluationTemplateId, scenario_json = :scenarioJson, updated_at = :now
     WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL`,
    {
      id,
      customerId,
      title: String(input.title),
      difficulty: String(input.difficulty),
      funnelStage: input.funnelStage ? String(input.funnelStage) : null,
      personaId: String(input.personaId),
      evaluationTemplateId: String(input.evaluationTemplateId),
      scenarioJson: JSON.stringify(input),
      now: new Date(),
    },
  )
  return result.affectedRows === 0 ? null : getScenario(customerId, id)
}

// ---------------------------------------------------------------- soft deletes

export type CatalogTable = 'training_personas' | 'training_templates' | 'training_scenarios' | 'training_groups'

export async function softDelete(table: CatalogTable, customerId: string, id: string): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE ${table} SET deleted_at = :now WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL`,
    { customerId, id, now: new Date() },
  )
  return result.affectedRows > 0
}

export async function countScenariosUsing(
  customerId: string,
  column: 'persona_id' | 'evaluation_template_id',
  id: string,
): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM training_scenarios
     WHERE customer_id = :customerId AND ${column} = :id AND deleted_at IS NULL`,
    { customerId, id },
  )
  return Number(rows[0]?.total ?? 0)
}

export async function countCatalog(customerId: string): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       (SELECT COUNT(*) FROM training_personas WHERE customer_id = :customerId AND deleted_at IS NULL) +
       (SELECT COUNT(*) FROM training_templates WHERE customer_id = :customerId AND deleted_at IS NULL) +
       (SELECT COUNT(*) FROM training_scenarios WHERE customer_id = :customerId AND deleted_at IS NULL) AS total`,
    { customerId },
  )
  return Number(rows[0]?.total ?? 0)
}

// -------------------------------------------------------------------- sessions

function messageFromRow(row: JsonRow): ChatMessage {
  return {
    id: String(row.id),
    role: row.role === 'user' ? 'user' : 'ai',
    speaker: String(row.speaker),
    text: String(row.text),
    timestamp: iso(row.created_at) ?? new Date().toISOString(),
    offsetMs: row.offset_ms == null ? null : Number(row.offset_ms),
    durationMs: row.duration_ms == null ? null : Number(row.duration_ms),
  }
}

/** Row fields shared by the list and the detail view. */
function sessionFromRow(row: JsonRow) {
  const report = parseJson(row.session_json).report as Record<string, unknown> | undefined
  return {
    id: String(row.id),
    scenarioId: row.scenario_id == null ? null : String(row.scenario_id),
    personaId: row.persona_id == null ? null : String(row.persona_id),
    userId: String(row.user_id),
    userName: row.user_name == null ? null : String(row.user_name),
    status: String(row.status),
    mediaMode: String(row.media_mode),
    aiProvider: row.ai_provider == null ? null : String(row.ai_provider),
    judgeSource: row.judge_source == null ? null : String(row.judge_source),
    score: row.score == null ? null : Number(row.score),
    durationMs: row.duration_ms == null ? null : Number(row.duration_ms),
    hasAudio: row.audio_path != null && String(row.audio_path) !== '',
    createdAt: iso(row.created_at),
    completedAt: iso(row.completed_at),
    report,
  }
}

export type SessionRecord = ReturnType<typeof sessionFromRow>

/** What the history screens need, without the criteria arrays. */
function sessionSummary(session: SessionRecord) {
  const { report, ...rest } = session
  return {
    ...rest,
    scenarioTitle: report?.scenarioTitle ?? null,
    personaName: report?.personaName ?? null,
    templateTitle: report?.templateTitle ?? null,
    negotiatorType: report?.negotiatorType ?? null,
    band: report?.band ?? null,
  }
}

export async function listSessions(
  customerId: string,
  userScope: string | null,
  query: PageQuery & { scenarioId?: string; status?: string; groupId?: string },
) {
  const filters = ['s.customer_id = :customerId', 's.deleted_at IS NULL']
  const params: Params = { customerId }
  if (userScope) {
    filters.push('s.user_id = :userScope')
    params.userScope = userScope
  }
  if (query.scenarioId) {
    filters.push('s.scenario_id = :scenarioId')
    params.scenarioId = query.scenarioId
  }
  if (query.groupId) {
    filters.push(
      `s.user_id IN (SELECT user_id FROM training_group_members WHERE group_id = :groupId AND customer_id = :customerId)`,
    )
    params.groupId = query.groupId
  }
  filters.push('s.status = :status')
  params.status = query.status ?? 'completed'
  if (query.from) {
    filters.push('s.created_at >= :from')
    params.from = `${query.from} 00:00:00`
  }
  if (query.to) {
    filters.push('s.created_at < DATE_ADD(:to, INTERVAL 1 DAY)')
    params.to = query.to
  }
  const where = filters.join(' AND ')
  const sort = resolveSort(query.sort, sessionSort, '-createdAt')
  const offset = (query.page - 1) * query.pageSize
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM training_sessions s WHERE ${where}`,
    params,
  )
  const [rows] = await pool.query<JsonRow[]>(
    `SELECT s.*, u.name AS user_name
     FROM training_sessions s
     LEFT JOIN users u ON u.id = s.user_id
     WHERE ${where}
     ORDER BY ${sort.column} ${sort.direction}
     LIMIT :limit OFFSET :offset`,
    { ...params, limit: query.pageSize, offset },
  )
  return {
    rows: rows.map((row) => sessionSummary(sessionFromRow(row))),
    total: Number(countRows[0]?.total ?? 0),
  }
}

export async function listMessages(sessionId: string, db: Db = pool): Promise<ChatMessage[]> {
  const [rows] = await db.query<JsonRow[]>(
    `SELECT * FROM training_session_messages WHERE session_id = :sessionId ORDER BY seq ASC`,
    { sessionId },
  )
  return rows.map(messageFromRow)
}

/** A session with its transcript. userScope null = any user of the customer. */
export async function getSession(customerId: string, id: string, userScope: string | null) {
  const [rows] = await pool.query<JsonRow[]>(
    `SELECT s.*, u.name AS user_name
     FROM training_sessions s
     LEFT JOIN users u ON u.id = s.user_id
     WHERE s.customer_id = :customerId AND s.id = :id AND s.deleted_at IS NULL
       AND (:userScope IS NULL OR s.user_id = :userScope)
     LIMIT 1`,
    { customerId, id, userScope },
  )
  if (!rows[0]) return null
  const session = sessionFromRow(rows[0])
  const messages = await listMessages(id)
  return {
    ...session,
    messages,
    report: session.report ? { ...session.report, messages, hasAudio: session.hasAudio, userName: session.userName } : null,
  }
}

export async function insertSession(
  customerId: string,
  userId: string,
  input: {
    scenarioId: string | null
    personaId: string
    mediaMode: 'text' | 'voice'
    aiProvider: string
    opening: { speaker: string; text: string }
  },
) {
  const id = ulid()
  const now = new Date()
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.query(
      `INSERT INTO training_sessions
        (id, customer_id, user_id, scenario_id, persona_id, status, media_mode, ai_provider, score, session_json, created_at)
       VALUES (:id, :customerId, :userId, :scenarioId, :personaId, 'in_progress', :mediaMode, :aiProvider, NULL, '{}', :now)`,
      { id, customerId, userId, scenarioId: input.scenarioId, personaId: input.personaId, mediaMode: input.mediaMode, aiProvider: input.aiProvider, now },
    )
    await connection.query(
      `INSERT INTO training_session_messages (id, session_id, seq, role, speaker, text, created_at)
       VALUES (:mid, :id, 1, 'ai', :speaker, :text, :now)`,
      { mid: ulid(), id, speaker: input.opening.speaker, text: input.opening.text, now },
    )
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
  return getSession(customerId, id, userId)
}

/**
 * Stores the trainee's message and the persona's reply together, after the reply exists, so a provider
 * failure leaves nothing behind. A concurrent send hits the unique (session, seq) key and gets a 409.
 */
export async function appendTurn(
  sessionId: string,
  nextSeq: number,
  turn: {
    userText: string
    traineeName: string
    aiText: string
    personaName: string
    userOffsetMs?: number | null
    userDurationMs?: number | null
    aiDurationMs?: number | null
  },
): Promise<{ userMessage: ChatMessage; aiMessage: ChatMessage }> {
  const userAt = new Date()
  const aiAt = new Date(userAt.getTime() + 1)
  const userId = ulid()
  const aiId = ulid()
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.query(
      `INSERT INTO training_session_messages
        (id, session_id, seq, role, speaker, text, offset_ms, duration_ms, created_at)
       VALUES (:id, :sessionId, :seq, 'user', :speaker, :text, :offsetMs, :durationMs, :at)`,
      {
        id: userId,
        sessionId,
        seq: nextSeq,
        speaker: turn.traineeName,
        text: turn.userText,
        offsetMs: turn.userOffsetMs ?? null,
        durationMs: turn.userDurationMs ?? null,
        at: userAt,
      },
    )
    await connection.query(
      `INSERT INTO training_session_messages
        (id, session_id, seq, role, speaker, text, offset_ms, duration_ms, created_at)
       VALUES (:id, :sessionId, :seq, 'ai', :speaker, :text, :offsetMs, :durationMs, :at)`,
      {
        id: aiId,
        sessionId,
        seq: nextSeq + 1,
        speaker: turn.personaName,
        text: turn.aiText,
        offsetMs: turn.userOffsetMs == null ? null : turn.userOffsetMs + (turn.userDurationMs ?? 0),
        durationMs: turn.aiDurationMs ?? null,
        at: aiAt,
      },
    )
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, 'TURN_IN_PROGRESS', 'Outra mensagem desta sessão ainda está sendo respondida.')
    }
    throw error
  } finally {
    connection.release()
  }
  return {
    userMessage: {
      id: userId,
      role: 'user',
      speaker: turn.traineeName,
      text: turn.userText,
      timestamp: userAt.toISOString(),
      offsetMs: turn.userOffsetMs ?? null,
      durationMs: turn.userDurationMs ?? null,
    },
    aiMessage: {
      id: aiId,
      role: 'ai',
      speaker: turn.personaName,
      text: turn.aiText,
      timestamp: aiAt.toISOString(),
      offsetMs: turn.userOffsetMs == null ? null : turn.userOffsetMs + (turn.userDurationMs ?? 0),
      durationMs: turn.aiDurationMs ?? null,
    },
  }
}

/** False when someone else finished the session first. */
export async function completeSession(
  customerId: string,
  sessionId: string,
  result: { score: number; judgeSource: string; report: Record<string, unknown>; completedAt: Date; durationMs?: number | null },
): Promise<boolean> {
  const [update] = await pool.query<ResultSetHeader>(
    `UPDATE training_sessions
     SET status = 'completed', score = :score, duration_ms = :durationMs, judge_source = :judgeSource,
         session_json = :json, completed_at = :completedAt
     WHERE customer_id = :customerId AND id = :sessionId AND status = 'in_progress'`,
    {
      customerId,
      sessionId,
      score: result.score,
      durationMs: result.durationMs ?? null,
      judgeSource: result.judgeSource,
      json: JSON.stringify({ report: result.report }),
      completedAt: result.completedAt,
    },
  )
  return update.affectedRows > 0
}

export async function replaceSessionReport(
  customerId: string,
  sessionId: string,
  result: { score: number; judgeSource: string; report: Record<string, unknown>; durationMs?: number | null },
): Promise<boolean> {
  const [update] = await pool.query<ResultSetHeader>(
    `UPDATE training_sessions
     SET score = :score, duration_ms = :durationMs, judge_source = :judgeSource, session_json = :json
     WHERE customer_id = :customerId AND id = :sessionId AND status = 'completed' AND deleted_at IS NULL`,
    {
      customerId,
      sessionId,
      score: result.score,
      durationMs: result.durationMs ?? null,
      judgeSource: result.judgeSource,
      json: JSON.stringify({ report: result.report }),
    },
  )
  return update.affectedRows > 0
}

export async function setSessionAudio(customerId: string, sessionId: string, audioPath: string): Promise<boolean> {
  const [update] = await pool.query<ResultSetHeader>(
    `UPDATE training_sessions
     SET audio_path = :audioPath
     WHERE customer_id = :customerId AND id = :sessionId AND deleted_at IS NULL`,
    { customerId, sessionId, audioPath },
  )
  return update.affectedRows > 0
}

export async function sessionAudioPath(customerId: string, sessionId: string): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT audio_path FROM training_sessions
     WHERE customer_id = :customerId AND id = :sessionId AND deleted_at IS NULL LIMIT 1`,
    { customerId, sessionId },
  )
  const value = rows[0]?.audio_path
  return value == null || value === '' ? null : String(value)
}

// --------------------------------------------------------------------- metrics

export async function getMetrics(customerId: string, userId: string, timeZone: string) {
  const [[totals], [pending], [days]] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS completed, ROUND(AVG(score)) AS avg_score
       FROM training_sessions
       WHERE customer_id = :customerId AND user_id = :userId AND status = 'completed' AND deleted_at IS NULL`,
      { customerId, userId },
    ),
    pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS pending FROM training_scenarios sc
       WHERE sc.customer_id = :customerId AND sc.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM training_sessions s
           WHERE s.scenario_id = sc.id AND s.user_id = :userId AND s.status = 'completed' AND s.deleted_at IS NULL
         )`,
      { customerId, userId },
    ),
    pool.query<RowDataPacket[]>(
      `SELECT completed_at FROM training_sessions
       WHERE customer_id = :customerId AND user_id = :userId AND status = 'completed' AND deleted_at IS NULL
         AND completed_at >= DATE_SUB(NOW(3), INTERVAL 400 DAY)
       ORDER BY completed_at DESC`,
      { customerId, userId },
    ),
  ])

  return {
    completed: Number(totals[0]?.completed ?? 0),
    avgScore: totals[0]?.avg_score == null ? 0 : Number(totals[0].avg_score),
    pending: Number(pending[0]?.pending ?? 0),
    streakDays: streakDays(
      days.map((row) => new Date(row.completed_at as string | Date)),
      timeZone,
    ),
  }
}

/** Consecutive days with a completed session, ending today (or yesterday, so the streak survives until midnight). */
export function streakDays(completedAt: Date[], timeZone: string, now = new Date()): number {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
  const key = (date: Date) => day.format(date)
  const seen = new Set(completedAt.map(key))
  const cursor = new Date(now)
  if (!seen.has(key(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1)
  let streak = 0
  while (seen.has(key(cursor))) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}

// ---------------------------------------------------------------------- groups

export async function listGroups(customerId: string) {
  const [rows] = await pool.query<JsonRow[]>(
    `SELECT g.*,
       (SELECT COUNT(*) FROM training_group_members m WHERE m.group_id = g.id) AS member_count,
       (SELECT COUNT(*) FROM training_personas p
         WHERE p.customer_id = :customerId AND p.group_id = g.id AND p.deleted_at IS NULL) AS persona_count
     FROM training_groups g
     WHERE g.customer_id = :customerId AND g.deleted_at IS NULL
     ORDER BY g.created_at DESC, g.name ASC`,
    { customerId },
  )
  return rows.map((row) => mapGroupRow(row))
}

function mapGroupRow(row: JsonRow, members?: { id: string; name: string; email: string }[]) {
  return {
    id: String(row.id),
    name: String(row.name),
    description: row.description == null ? '' : String(row.description),
    status: row.status == null ? 'active' : String(row.status),
    monthlyMinutes: row.monthly_minutes == null ? null : Number(row.monthly_minutes),
    memberCount: row.member_count == null ? undefined : Number(row.member_count),
    personaCount: row.persona_count == null ? undefined : Number(row.persona_count),
    createdAt: row.created_at == null ? undefined : iso(row.created_at),
    ...(members ? { members } : {}),
  }
}

export async function getGroup(customerId: string, id: string) {
  const [rows] = await pool.query<JsonRow[]>(
    `SELECT * FROM training_groups WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL LIMIT 1`,
    { customerId, id },
  )
  if (!rows[0]) return null
  const [members] = await pool.query<JsonRow[]>(
    `SELECT u.id, u.name, u.email
     FROM training_group_members m
     JOIN users u ON u.id = m.user_id
     WHERE m.group_id = :id AND m.customer_id = :customerId
     ORDER BY u.name`,
    { id, customerId },
  )
  return mapGroupRow(
    rows[0],
    members.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      email: row.email == null ? '' : String(row.email),
    })),
  )
}

export async function insertGroup(
  customerId: string,
  input: {
    name: string
    description?: string
    status?: string
    monthlyMinutes?: number | null
    userIds: string[]
  },
) {
  const id = ulid()
  const now = new Date()
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.query(
      `INSERT INTO training_groups
         (id, customer_id, name, description, status, monthly_minutes, created_at, updated_at)
       VALUES (:id, :customerId, :name, :description, :status, :monthlyMinutes, :now, :now)`,
      {
        id,
        customerId,
        name: input.name,
        description: input.description || null,
        status: input.status || 'active',
        monthlyMinutes: input.monthlyMinutes ?? null,
        now,
      },
    )
    const userIds = input.userIds
    for (const userId of userIds) {
      await connection.query(
        `INSERT INTO training_group_members (group_id, user_id, customer_id, created_at)
         VALUES (:id, :userId, :customerId, :now)`,
        { id, userId, customerId, now },
      )
    }
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
  return getGroup(customerId, id)
}

export async function updateGroup(
  customerId: string,
  id: string,
  input: {
    name: string
    description?: string
    status?: string
    monthlyMinutes?: number | null
    userIds: string[]
  },
) {
  const existing = await getGroup(customerId, id)
  if (!existing) return null
  const now = new Date()
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.query(
      `UPDATE training_groups
       SET name = :name,
           description = :description,
           status = :status,
           monthly_minutes = :monthlyMinutes,
           updated_at = :now
       WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL`,
      {
        id,
        customerId,
        name: input.name,
        description: input.description || null,
        status: input.status || 'active',
        monthlyMinutes: input.monthlyMinutes ?? null,
        now,
      },
    )
    await connection.query(`DELETE FROM training_group_members WHERE group_id = :id AND customer_id = :customerId`, {
      id,
      customerId,
    })
    for (const userId of input.userIds) {
      await connection.query(
        `INSERT INTO training_group_members (group_id, user_id, customer_id, created_at)
         VALUES (:id, :userId, :customerId, :now)`,
        { id, userId, customerId, now },
      )
    }
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
  return getGroup(customerId, id)
}

export async function deleteGroupCascade(customerId: string, id: string) {
  const existing = await getGroup(customerId, id)
  if (!existing) return false
  const now = new Date()
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.query(
      `UPDATE training_personas
       SET group_id = NULL,
           visibility = CASE WHEN visibility = 'group' THEN 'company' ELSE visibility END,
           updated_at = :now
       WHERE customer_id = :customerId AND group_id = :id AND deleted_at IS NULL`,
      { customerId, id, now },
    )
    await connection.query(`DELETE FROM training_group_members WHERE group_id = :id AND customer_id = :customerId`, {
      id,
      customerId,
    })
    await connection.query(
      `UPDATE training_groups
       SET deleted_at = :now, updated_at = :now
       WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL`,
      { customerId, id, now },
    )
    await connection.commit()
    return true
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function getCustomerSettings(customerId: string) {
  const [rows] = await pool.query<JsonRow[]>(
    `SELECT require_2fa, updated_at
     FROM training_customer_settings
     WHERE customer_id = :customerId
     LIMIT 1`,
    { customerId },
  )
  if (!rows[0]) {
    return { require2fa: false, updatedAt: null as string | null }
  }
  return {
    require2fa: Boolean(Number(rows[0].require_2fa)),
    updatedAt: iso(rows[0].updated_at),
  }
}

export async function upsertCustomerSettings(customerId: string, patch: { require2fa: boolean }) {
  const now = new Date()
  await pool.query(
    `INSERT INTO training_customer_settings (customer_id, require_2fa, updated_at)
     VALUES (:customerId, :require2fa, :now)
     ON DUPLICATE KEY UPDATE require_2fa = VALUES(require_2fa), updated_at = VALUES(updated_at)`,
    {
      customerId,
      require2fa: patch.require2fa ? 1 : 0,
      now,
    },
  )
  return getCustomerSettings(customerId)
}

export async function listDirectory(customerId: string) {
  const [rows] = await pool.query<JsonRow[]>(
    `SELECT id, name, email, profile, status, created_at, updated_at
     FROM users
     WHERE customer_id = :customerId AND deleted_at IS NULL
     ORDER BY name ASC`,
    { customerId },
  )
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    email: row.email == null ? '' : String(row.email),
    profile: String(row.profile),
    status: String(row.status ?? 'active'),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }))
}

export async function patchDirectoryUser(
  customerId: string,
  userId: string,
  patch: { profile?: string; status?: string },
) {
  const fields: string[] = []
  const params: Params = { customerId, userId, now: new Date() }
  if (patch.profile) {
    fields.push('profile = :profile')
    params.profile = patch.profile
  }
  if (patch.status) {
    fields.push('status = :status')
    params.status = patch.status
  }
  if (!fields.length) return null
  fields.push('updated_at = :now')
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE users SET ${fields.join(', ')}
     WHERE customer_id = :customerId AND id = :userId AND deleted_at IS NULL`,
    params,
  )
  if (result.affectedRows === 0) return null
  const directory = await listDirectory(customerId)
  return directory.find((row) => row.id === userId) ?? null
}

export async function userIdsInCustomer(customerId: string, userIds: string[]) {
  if (userIds.length === 0) return []
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM users WHERE customer_id = :customerId AND deleted_at IS NULL AND id IN (:ids)`,
    { customerId, ids: userIds },
  )
  return rows.map((row) => String(row.id))
}

export type AnalyticsRow = {
  userId: string
  userName: string
  score: number
  durationMs: number
  completedAt: string
  templateTitle: string
  communication: Record<string, unknown> | null
  sections: { name?: string; earnedWeight?: number; totalWeight?: number }[]
}

export async function listAnalyticsRows(
  customerId: string,
  since: Date,
  scope: { userId: string | null; groupId: string | null; personaId?: string | null },
): Promise<AnalyticsRow[]> {
  const filters = [
    's.customer_id = :customerId',
    's.deleted_at IS NULL',
    "s.status = 'completed'",
    's.completed_at >= :since',
  ]
  const params: Params = { customerId, since }
  if (scope.userId) {
    filters.push('s.user_id = :userId')
    params.userId = scope.userId
  }
  if (scope.groupId) {
    filters.push(
      `s.user_id IN (SELECT user_id FROM training_group_members WHERE group_id = :groupId AND customer_id = :customerId)`,
    )
    params.groupId = scope.groupId
  }
  if (scope.personaId) {
    filters.push('s.persona_id = :personaId')
    params.personaId = scope.personaId
  }
  const [rows] = await pool.query<JsonRow[]>(
    `SELECT s.user_id, u.name AS user_name, s.score, s.duration_ms, s.completed_at, s.session_json
     FROM training_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE ${filters.join(' AND ')}`,
    params,
  )
  return rows.map((row) => {
    const report = parseJson(row.session_json).report as Record<string, unknown> | undefined
    const communication = report?.communication
    const sections = report?.sections
    return {
      userId: String(row.user_id),
      userName: String(row.user_name),
      score: row.score == null ? 0 : Number(row.score),
      durationMs: row.duration_ms == null ? Number((communication as { durationSec?: number } | undefined)?.durationSec ?? 0) * 1000 : Number(row.duration_ms),
      completedAt: iso(row.completed_at) ?? new Date().toISOString(),
      templateTitle: report?.templateTitle == null ? 'Sem template' : String(report.templateTitle),
      communication: communication && typeof communication === 'object' ? (communication as Record<string, unknown>) : null,
      sections: Array.isArray(sections) ? (sections as AnalyticsRow['sections']) : [],
    }
  })
}
