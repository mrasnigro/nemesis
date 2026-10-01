import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { ulid } from 'ulid'
import { pool } from '../../core/db.js'
import { resolveSort, type PageQuery } from '../../core/list.js'

type JsonRow = RowDataPacket & Record<string, unknown>

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

function personaFromRow(row: JsonRow) {
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

function templateFromRow(row: JsonRow) {
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

function scenarioFromRow(row: JsonRow) {
  const body = parseJson(row.scenario_json)
  return {
    ...body,
    id: String(row.id),
    title: String(row.title),
    difficulty: String(row.difficulty),
    funnelStage: row.funnel_stage == null ? body.funnelStage ?? null : String(row.funnel_stage),
    personaId: String(row.persona_id),
    evaluationTemplateId: String(row.evaluation_template_id),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

function sessionFromRow(row: JsonRow) {
  const body = parseJson(row.session_json)
  return {
    id: String(row.id),
    scenarioId: String(row.scenario_id),
    userId: String(row.user_id),
    status: String(row.status),
    score: row.score == null ? null : Number(row.score),
    createdAt: iso(row.created_at),
    completedAt: iso(row.completed_at),
    report: body.report ?? null,
  }
}

export async function listPersonas(
  customerId: string,
  query: PageQuery & { status?: string; difficulty?: string },
): Promise<ListResult<ReturnType<typeof personaFromRow>>> {
  const filters = ['customer_id = :customerId', 'deleted_at IS NULL']
  const params: Record<string, string | number | Date | null> = { customerId }
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

export async function getPersona(customerId: string, id: string) {
  const [rows] = await pool.query<JsonRow[]>(
    `SELECT * FROM training_personas
     WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL
     LIMIT 1`,
    { customerId, id },
  )
  return rows[0] ? personaFromRow(rows[0]) : null
}

export async function insertPersona(customerId: string, input: Record<string, unknown>) {
  const id = ulid()
  const now = new Date()
  const name = String(input.name)
  const status = String(input.status ?? 'active')
  const industry = input.industry == null ? null : String(input.industry)
  const difficulty = input.difficulty == null ? null : String(input.difficulty)
  await pool.query<ResultSetHeader>(
    `INSERT INTO training_personas
      (id, customer_id, name, status, industry, difficulty, profile_json, created_at, updated_at)
     VALUES
      (:id, :customerId, :name, :status, :industry, :difficulty, :profileJson, :now, :now)`,
    {
      id,
      customerId,
      name,
      status,
      industry,
      difficulty,
      profileJson: JSON.stringify(input),
      now,
    },
  )
  return getPersona(customerId, id)
}

export async function updatePersona(customerId: string, id: string, input: Record<string, unknown>) {
  const now = new Date()
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE training_personas
     SET name = :name,
         status = :status,
         industry = :industry,
         difficulty = :difficulty,
         profile_json = :profileJson,
         updated_at = :now
     WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL`,
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
  if (result.affectedRows === 0) return null
  return getPersona(customerId, id)
}

export async function listTemplates(customerId: string, query: PageQuery) {
  const filters = ['customer_id = :customerId', 'deleted_at IS NULL']
  const params: Record<string, string | number | Date | null> = { customerId }
  const term = likeTerm(query.q)
  if (term) {
    filters.push('title LIKE :term')
    params.term = term
  }
  return listRows('training_templates', filters, params, query, templateSort, 'createdAt', templateFromRow)
}

export async function getTemplate(customerId: string, id: string) {
  const [rows] = await pool.query<JsonRow[]>(
    `SELECT * FROM training_templates
     WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL
     LIMIT 1`,
    { customerId, id },
  )
  return rows[0] ? templateFromRow(rows[0]) : null
}

export async function insertTemplate(customerId: string, input: Record<string, unknown>) {
  const id = ulid()
  const now = new Date()
  await pool.query(
    `INSERT INTO training_templates
      (id, customer_id, title, contact_type, template_json, created_at, updated_at)
     VALUES
      (:id, :customerId, :title, :contactType, :templateJson, :now, :now)`,
    {
      id,
      customerId,
      title: String(input.title),
      contactType: input.contactType == null ? null : String(input.contactType),
      templateJson: JSON.stringify(input),
      now,
    },
  )
  return getTemplate(customerId, id)
}

export async function updateTemplate(customerId: string, id: string, input: Record<string, unknown>) {
  const now = new Date()
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE training_templates
     SET title = :title,
         contact_type = :contactType,
         template_json = :templateJson,
         updated_at = :now
     WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL`,
    {
      id,
      customerId,
      title: String(input.title),
      contactType: input.contactType == null ? null : String(input.contactType),
      templateJson: JSON.stringify(input),
      now,
    },
  )
  if (result.affectedRows === 0) return null
  return getTemplate(customerId, id)
}

export async function listScenarios(
  customerId: string,
  query: PageQuery & { difficulty?: string; funnelStage?: string },
) {
  const filters = ['customer_id = :customerId', 'deleted_at IS NULL']
  const params: Record<string, string | number | Date | null> = { customerId }
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

export async function getScenario(customerId: string, id: string) {
  const [rows] = await pool.query<JsonRow[]>(
    `SELECT * FROM training_scenarios
     WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL
     LIMIT 1`,
    { customerId, id },
  )
  return rows[0] ? scenarioFromRow(rows[0]) : null
}

export async function insertScenario(customerId: string, input: Record<string, unknown>) {
  const id = ulid()
  const now = new Date()
  await pool.query(
    `INSERT INTO training_scenarios
      (id, customer_id, title, difficulty, funnel_stage, persona_id, evaluation_template_id, scenario_json, created_at, updated_at)
     VALUES
      (:id, :customerId, :title, :difficulty, :funnelStage, :personaId, :evaluationTemplateId, :scenarioJson, :now, :now)`,
    {
      id,
      customerId,
      title: String(input.title),
      difficulty: String(input.difficulty),
      funnelStage: input.funnelStage == null ? null : String(input.funnelStage),
      personaId: String(input.personaId),
      evaluationTemplateId: String(input.evaluationTemplateId),
      scenarioJson: JSON.stringify(input),
      now,
    },
  )
  return getScenario(customerId, id)
}

export async function updateScenario(customerId: string, id: string, input: Record<string, unknown>) {
  const now = new Date()
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE training_scenarios
     SET title = :title,
         difficulty = :difficulty,
         funnel_stage = :funnelStage,
         persona_id = :personaId,
         evaluation_template_id = :evaluationTemplateId,
         scenario_json = :scenarioJson,
         updated_at = :now
     WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL`,
    {
      id,
      customerId,
      title: String(input.title),
      difficulty: String(input.difficulty),
      funnelStage: input.funnelStage == null ? null : String(input.funnelStage),
      personaId: String(input.personaId),
      evaluationTemplateId: String(input.evaluationTemplateId),
      scenarioJson: JSON.stringify(input),
      now,
    },
  )
  if (result.affectedRows === 0) return null
  return getScenario(customerId, id)
}

export async function listSessions(
  customerId: string,
  query: PageQuery & { scenarioId?: string },
) {
  const filters = ['customer_id = :customerId', 'deleted_at IS NULL']
  const params: Record<string, string | number | Date | null> = { customerId }
  if (query.scenarioId) {
    filters.push('scenario_id = :scenarioId')
    params.scenarioId = query.scenarioId
  }
  if (query.from) {
    filters.push('created_at >= :from')
    params.from = `${query.from} 00:00:00`
  }
  if (query.to) {
    filters.push('created_at < DATE_ADD(:to, INTERVAL 1 DAY)')
    params.to = query.to
  }
  return listRows('training_sessions', filters, params, query, sessionSort, '-createdAt', sessionFromRow)
}

export async function getSession(customerId: string, id: string) {
  const [rows] = await pool.query<JsonRow[]>(
    `SELECT * FROM training_sessions
     WHERE customer_id = :customerId AND id = :id AND deleted_at IS NULL
     LIMIT 1`,
    { customerId, id },
  )
  return rows[0] ? sessionFromRow(rows[0]) : null
}

export async function insertSession(
  customerId: string,
  userId: string,
  input: { scenarioId: string; status: string; score: number | null; report: Record<string, unknown> | null },
) {
  const id = ulid()
  const now = new Date()
  const completedAt = input.status === 'completed' ? now : null
  const report = input.report ? { ...input.report, sessionId: id } : null
  await pool.query(
    `INSERT INTO training_sessions
      (id, customer_id, user_id, scenario_id, status, score, session_json, created_at, completed_at)
     VALUES
      (:id, :customerId, :userId, :scenarioId, :status, :score, :sessionJson, :now, :completedAt)`,
    {
      id,
      customerId,
      userId,
      scenarioId: input.scenarioId,
      status: input.status,
      score: input.score,
      sessionJson: JSON.stringify({ report }),
      now,
      completedAt,
    },
  )
  return getSession(customerId, id)
}

async function listRows<T>(
  table: string,
  filters: string[],
  params: Record<string, string | number | Date | null>,
  query: PageQuery,
  allowedSort: Record<string, string>,
  fallbackSort: string,
  mapRow: (row: JsonRow) => T,
): Promise<ListResult<T>> {
  const where = filters.join(' AND ')
  const sort = resolveSort(query.sort, allowedSort, fallbackSort)
  const offset = (query.page - 1) * query.pageSize
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${table} WHERE ${where}`,
    params,
  )
  const [rows] = await pool.query<JsonRow[]>(
    `SELECT * FROM ${table}
     WHERE ${where}
     ORDER BY ${sort.column} ${sort.direction}
     LIMIT :limit OFFSET :offset`,
    { ...params, limit: query.pageSize, offset },
  )
  return {
    rows: rows.map(mapRow),
    total: Number(countRows[0]?.total ?? 0),
  }
}
