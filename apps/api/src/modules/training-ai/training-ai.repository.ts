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
const sessionSort = { createdAt: 'created_at' }

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
  query: PageQuery & { status?: string; difficulty?: string },
) {
  const { filters, params } = baseFilters(customerId)
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
      (id, customer_id, name, status, industry, difficulty, profile_json, created_at, updated_at)
     VALUES (:id, :customerId, :name, :status, :industry, :difficulty, :profileJson, :now, :now)`,
    {
      id,
      customerId,
      name: String(input.name),
      status: String(input.status ?? 'active'),
      industry: input.industry == null ? null : String(input.industry),
      difficulty: input.difficulty == null ? null : String(input.difficulty),
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
         profile_json = :profileJson, updated_at = :now
     WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL`,
    {
      id,
      customerId,
      name: String(input.name),
      status: String(input.status ?? 'active'),
      industry: input.industry == null ? null : String(input.industry),
      difficulty: input.difficulty == null ? null : String(input.difficulty),
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

export type CatalogTable = 'training_personas' | 'training_templates' | 'training_scenarios'

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
  }
}

/** Row fields shared by the list and the detail view. */
function sessionFromRow(row: JsonRow) {
  const report = parseJson(row.session_json).report as Record<string, unknown> | undefined
  return {
    id: String(row.id),
    scenarioId: String(row.scenario_id),
    personaId: row.persona_id == null ? null : String(row.persona_id),
    userId: String(row.user_id),
    status: String(row.status),
    mediaMode: String(row.media_mode),
    aiProvider: row.ai_provider == null ? null : String(row.ai_provider),
    judgeSource: row.judge_source == null ? null : String(row.judge_source),
    score: row.score == null ? null : Number(row.score),
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
    band: report?.band ?? null,
  }
}

export async function listSessions(
  customerId: string,
  userScope: string | null,
  query: PageQuery & { scenarioId?: string; status?: string },
) {
  const { filters, params } = baseFilters(customerId)
  if (userScope) {
    filters.push('user_id = :userScope')
    params.userScope = userScope
  }
  if (query.scenarioId) {
    filters.push('scenario_id = :scenarioId')
    params.scenarioId = query.scenarioId
  }
  filters.push('status = :status')
  params.status = query.status ?? 'completed'
  if (query.from) {
    filters.push('created_at >= :from')
    params.from = `${query.from} 00:00:00`
  }
  if (query.to) {
    filters.push('created_at < DATE_ADD(:to, INTERVAL 1 DAY)')
    params.to = query.to
  }
  return listRows('training_sessions', filters, params, query, sessionSort, '-createdAt', (row) =>
    sessionSummary(sessionFromRow(row)),
  )
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
    `SELECT * FROM training_sessions
     WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL
       AND (:userScope IS NULL OR user_id = :userScope)
     LIMIT 1`,
    { customerId, id, userScope },
  )
  if (!rows[0]) return null
  const session = sessionFromRow(rows[0])
  const messages = await listMessages(id)
  return {
    ...session,
    messages,
    report: session.report ? { ...session.report, messages } : null,
  }
}

export async function insertSession(
  customerId: string,
  userId: string,
  input: {
    scenarioId: string
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
  turn: { userText: string; traineeName: string; aiText: string; personaName: string },
): Promise<{ userMessage: ChatMessage; aiMessage: ChatMessage }> {
  const userAt = new Date()
  const aiAt = new Date(userAt.getTime() + 1)
  const userId = ulid()
  const aiId = ulid()
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.query(
      `INSERT INTO training_session_messages (id, session_id, seq, role, speaker, text, created_at)
       VALUES (:id, :sessionId, :seq, 'user', :speaker, :text, :at)`,
      { id: userId, sessionId, seq: nextSeq, speaker: turn.traineeName, text: turn.userText, at: userAt },
    )
    await connection.query(
      `INSERT INTO training_session_messages (id, session_id, seq, role, speaker, text, created_at)
       VALUES (:id, :sessionId, :seq, 'ai', :speaker, :text, :at)`,
      { id: aiId, sessionId, seq: nextSeq + 1, speaker: turn.personaName, text: turn.aiText, at: aiAt },
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
    userMessage: { id: userId, role: 'user', speaker: turn.traineeName, text: turn.userText, timestamp: userAt.toISOString() },
    aiMessage: { id: aiId, role: 'ai', speaker: turn.personaName, text: turn.aiText, timestamp: aiAt.toISOString() },
  }
}

/** False when someone else finished the session first. */
export async function completeSession(
  customerId: string,
  sessionId: string,
  result: { score: number; judgeSource: string; report: Record<string, unknown>; completedAt: Date },
): Promise<boolean> {
  const [update] = await pool.query<ResultSetHeader>(
    `UPDATE training_sessions
     SET status = 'completed', score = :score, judge_source = :judgeSource, session_json = :json, completed_at = :completedAt
     WHERE customer_id = :customerId AND id = :sessionId AND status = 'in_progress'`,
    {
      customerId,
      sessionId,
      score: result.score,
      judgeSource: result.judgeSource,
      json: JSON.stringify({ report: result.report }),
      completedAt: result.completedAt,
    },
  )
  return update.affectedRows > 0
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
