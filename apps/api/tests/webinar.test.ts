import request from 'supertest'
import type { RowDataPacket } from 'mysql2'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { pool } from '../src/core/db.js'
import { app, createPlatformAdmin, grantWebinarPlan, signIn, unique } from './helpers.js'

type Agent = Awaited<ReturnType<typeof signIn>>

const BASE = '/api/modules/webinar'
const PUBLIC = '/api/public/webinar'

let admin: Agent
let customerId: string
let manager: Agent // customer_admin
let owner: Agent // sdr_bdr that creates the webinars
let colleague: Agent // sdr_bdr of the same customer
let outsider: Agent // customer_admin of another customer
let noModule: Agent

async function createCustomer(moduleIds = ['webinar']) {
  const response = await admin
    .post('/api/admin/customers')
    .send({ name: unique('Cliente Webinar '), plan: 'Enterprise', status: 'active', moduleIds })
  expect(response.status).toBe(201)
  if (moduleIds.includes('webinar')) await grantWebinarPlan(admin, response.body.data.id)
  return response.body.data.id as string
}

async function createUser(customer: string, profile: 'customer_admin' | 'sdr_bdr', moduleIds = ['webinar']) {
  const username = unique('u')
  const response = await admin.post('/api/admin/users').send({
    customerId: customer,
    username,
    name: 'Usuário Webinar',
    password: 'user-password',
    profile,
    moduleIds,
  })
  expect(response.status).toBe(201)
  return signIn(username, 'user-password')
}

const inHours = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString()

function webinarBody(extra: Record<string, unknown> = {}) {
  return {
    title: unique('Webinar '),
    description: 'Como vender mais',
    scheduledAt: inHours(24),
    durationMinutes: 60,
    presenterName: 'Ana',
    ...extra,
  }
}

async function createWebinar(agent: Agent = owner, extra: Record<string, unknown> = {}) {
  const response = await agent.post(`${BASE}/webinars`).send(webinarBody(extra))
  expect(response.status).toBe(201)
  return response.body.data as { id: string; title: string; ownerUserId: string }
}

async function createCode(webinarId: string, extra: Record<string, unknown> = {}) {
  const response = await owner
    .post(`${BASE}/webinars/${webinarId}/access-codes`)
    .send({ scheduledAt: inHours(24), expiresAt: inHours(48), ...extra })
  expect(response.status).toBe(201)
  return response.body.data as { id: string; code: string; leadCount: number }
}

async function register(code: string, extra: Record<string, unknown> = {}) {
  return request(app)
    .post(`${PUBLIC}/register`)
    .send({ code, name: 'Maria Lead', email: `${unique('l')}@example.com`, phone: '11999990000', ...extra })
}

beforeAll(async () => {
  const credentials = await createPlatformAdmin()
  admin = await signIn(credentials.username, credentials.password)
  customerId = await createCustomer()
  manager = await createUser(customerId, 'customer_admin')
  owner = await createUser(customerId, 'sdr_bdr')
  colleague = await createUser(customerId, 'sdr_bdr')
  outsider = await createUser(await createCustomer(), 'customer_admin')
  noModule = await createUser(await createCustomer(['bdr']), 'sdr_bdr', ['bdr'])
})

afterAll(async () => {
  await pool.end()
})

describe('access', () => {
  it('requires a session and the module', async () => {
    expect((await request(app).get(`${BASE}/webinars`)).status).toBe(401)
    const denied = await noModule.get(`${BASE}/webinars`)
    expect(denied.status).toBe(403)
    expect(denied.body.error.code).toBe('MODULE_FORBIDDEN')
  })

  it('does not expose leads without a session (the old Webinar backend did)', async () => {
    const webinar = await createWebinar()
    expect((await request(app).get(`${BASE}/webinars/${webinar.id}/leads`)).status).toBe(401)
    expect((await request(app).get(`${BASE}/webinars/${webinar.id}/leads/export.csv`)).status).toBe(401)
  })
})

describe('webinars', () => {
  it('creates, reads, lists and updates', async () => {
    const created = await createWebinar(owner, { title: 'Lançamento Q4', registrationColor: '#112233', maxParticipants: 50 })
    expect(created.ownerUserId).toBeTruthy()

    const read = await owner.get(`${BASE}/webinars/${created.id}`)
    expect(read.status).toBe(200)
    expect(read.body.data).toMatchObject({ title: 'Lançamento Q4', status: 'draft', registrationColor: '#112233', maxParticipants: 50 })

    const list = await owner.get(`${BASE}/webinars`).query({ q: 'Lançamento' })
    expect(list.status).toBe(200)
    expect(list.body.data.map((row: { id: string }) => row.id)).toContain(created.id)
    expect(list.body.page.total).toBeGreaterThanOrEqual(1)

    const patched = await owner.patch(`${BASE}/webinars/${created.id}`).send({ title: 'Lançamento Q4 v2', description: null })
    expect(patched.status).toBe(200)
    expect(patched.body.data).toMatchObject({ title: 'Lançamento Q4 v2', description: null, durationMinutes: 60 })
  })

  it('validates input', async () => {
    const missing = await owner.post(`${BASE}/webinars`).send({ title: 'Sem data' })
    expect(missing.status).toBe(400)
    expect(missing.body.error.code).toBe('VALIDATION_ERROR')

    const color = await owner.post(`${BASE}/webinars`).send(webinarBody({ registrationColor: 'azul' }))
    expect(color.status).toBe(400)

    const webinar = await createWebinar()
    expect((await owner.patch(`${BASE}/webinars/${webinar.id}`).send({})).status).toBe(400)
    expect((await owner.post(`${BASE}/webinars/${webinar.id}/status`).send({ status: 'nope' })).status).toBe(400)
  })

  it('keeps customers apart', async () => {
    const webinar = await createWebinar()
    expect((await outsider.get(`${BASE}/webinars/${webinar.id}`)).status).toBe(404)
    expect((await outsider.patch(`${BASE}/webinars/${webinar.id}`).send({ title: 'x' })).status).toBe(404)
    expect((await outsider.delete(`${BASE}/webinars/${webinar.id}`)).status).toBe(404)
    expect((await outsider.get(`${BASE}/webinars/${webinar.id}/leads`)).status).toBe(404)
    const list = await outsider.get(`${BASE}/webinars`)
    expect(list.body.data.map((row: { id: string }) => row.id)).not.toContain(webinar.id)
  })

  it('lets colleagues read but only the owner or a customer administrator change', async () => {
    const webinar = await createWebinar(owner)
    expect((await colleague.get(`${BASE}/webinars/${webinar.id}`)).status).toBe(200)

    const denied = await colleague.patch(`${BASE}/webinars/${webinar.id}`).send({ title: 'Meu agora' })
    expect(denied.status).toBe(403)
    expect((await colleague.post(`${BASE}/webinars/${webinar.id}/status`).send({ status: 'live' })).status).toBe(403)
    expect((await colleague.delete(`${BASE}/webinars/${webinar.id}`)).status).toBe(403)

    expect((await manager.patch(`${BASE}/webinars/${webinar.id}`).send({ title: 'Ajustado' })).status).toBe(200)

    const mine = await colleague.get(`${BASE}/webinars`).query({ mine: 'true' })
    expect(mine.body.data.map((row: { id: string }) => row.id)).not.toContain(webinar.id)
  })

  it('changes status, refuses to delete a live one, and soft deletes', async () => {
    const webinar = await createWebinar()
    const live = await owner.post(`${BASE}/webinars/${webinar.id}/status`).send({ status: 'live' })
    expect(live.status).toBe(200)
    expect(live.body.data.status).toBe('live')

    const blocked = await owner.delete(`${BASE}/webinars/${webinar.id}`)
    expect(blocked.status).toBe(409)
    expect(blocked.body.error.code).toBe('WEBINAR_LIVE')

    await owner.post(`${BASE}/webinars/${webinar.id}/status`).send({ status: 'completed' })
    expect((await owner.delete(`${BASE}/webinars/${webinar.id}`)).status).toBe(204)
    expect((await owner.get(`${BASE}/webinars/${webinar.id}`)).status).toBe(404)

    const [rows] = await pool.query<RowDataPacket[]>('SELECT deleted_at FROM webinar_webinars WHERE id = ?', [webinar.id])
    expect(rows[0].deleted_at).not.toBeNull()
  })

  it('only allows sensible status changes', async () => {
    const setStatus = (id: string, status: string) => owner.post(`${BASE}/webinars/${id}/status`).send({ status })
    const webinar = await createWebinar()

    const skipped = await setStatus(webinar.id, 'completed') // never went live
    expect(skipped.status).toBe(409)
    expect(skipped.body.error.code).toBe('INVALID_TRANSITION')

    expect((await setStatus(webinar.id, 'scheduled')).status).toBe(200)
    expect((await setStatus(webinar.id, 'live')).status).toBe(200)
    expect((await setStatus(webinar.id, 'live')).status).toBe(200) // a reloaded studio asking again is fine
    expect((await setStatus(webinar.id, 'scheduled')).status).toBe(409) // a live webinar can only be ended
    expect((await setStatus(webinar.id, 'completed')).status).toBe(200)

    for (const to of ['live', 'draft', 'scheduled', 'cancelled']) {
      expect((await setStatus(webinar.id, to)).status).toBe(409) // finished stays finished
    }

    const cancelled = await createWebinar()
    await setStatus(cancelled.id, 'cancelled')
    expect((await setStatus(cancelled.id, 'live')).status).toBe(409)
    expect((await setStatus(cancelled.id, 'draft')).status).toBe(200)
  })

  it('summarizes the dashboard', async () => {
    const response = await owner.get(`${BASE}/stats`)
    expect(response.status).toBe(200)
    expect(response.body.data.webinars.total).toBeGreaterThanOrEqual(1)
    expect(response.body.data.leads).toHaveProperty('attendanceRate')
  })

  it('records who changed what in the audit log', async () => {
    const webinar = await createWebinar(owner, { title: unique('Auditado ') })
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT customer_id, actor_name FROM audit_logs WHERE entity_id = ? AND action = 'webinar.created'",
      [webinar.id],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].customer_id).toBe(customerId)
  })
})

describe('access codes', () => {
  it('generates a code, accepts a chosen one and refuses a duplicate', async () => {
    const webinar = await createWebinar()
    const generated = await createCode(webinar.id)
    expect(generated.code).toMatch(/^[A-Z2-9]{8}$/)

    const chosen = unique('PROMO').toUpperCase()
    await createCode(webinar.id, { code: chosen })
    const duplicate = await owner
      .post(`${BASE}/webinars/${webinar.id}/access-codes`)
      .send({ code: chosen, scheduledAt: inHours(1), expiresAt: inHours(2) })
    expect(duplicate.status).toBe(409)
    expect(duplicate.body.error.code).toBe('CODE_TAKEN')

    const list = await owner.get(`${BASE}/webinars/${webinar.id}/access-codes`)
    expect(list.body.data).toHaveLength(2)
  })

  it('rejects an expiry before the start and codes from a colleague who is not the owner', async () => {
    const webinar = await createWebinar()
    const backwards = await owner
      .post(`${BASE}/webinars/${webinar.id}/access-codes`)
      .send({ scheduledAt: inHours(10), expiresAt: inHours(5) })
    expect(backwards.status).toBe(400)

    const denied = await colleague
      .post(`${BASE}/webinars/${webinar.id}/access-codes`)
      .send({ scheduledAt: inHours(1), expiresAt: inHours(2) })
    expect(denied.status).toBe(403)
  })
})

describe('public registration', () => {
  it('opens a code and shows only what a visitor may see', async () => {
    const webinar = await createWebinar()
    const code = await createCode(webinar.id)

    const response = await request(app).post(`${PUBLIC}/access`).send({ code: code.code })
    expect(response.status).toBe(200)
    expect(response.body.data.webinar).toMatchObject({ id: webinar.id, title: webinar.title })
    const raw = JSON.stringify(response.body)
    expect(raw).not.toContain('ownerUserId')
    expect(raw).not.toContain('customerId')
  })

  it('answers unknown, expired, deactivated and cancelled codes differently from a good one', async () => {
    expect((await request(app).post(`${PUBLIC}/access`).send({ code: 'NOPE-NOPE' })).status).toBe(404)

    const webinar = await createWebinar()
    const expired = await createCode(webinar.id, { scheduledAt: inHours(-3), expiresAt: inHours(-1) })
    const gone = await request(app).post(`${PUBLIC}/access`).send({ code: expired.code })
    expect(gone.status).toBe(410)
    expect(gone.body.error.code).toBe('CODE_UNAVAILABLE')

    const live = await createCode(webinar.id)
    expect((await owner.delete(`${BASE}/webinars/${webinar.id}/access-codes/${live.id}`)).status).toBe(204)
    expect((await request(app).post(`${PUBLIC}/access`).send({ code: live.code })).status).toBe(410)

    const cancelled = await createWebinar()
    const cancelledCode = await createCode(cancelled.id)
    await owner.post(`${BASE}/webinars/${cancelled.id}/status`).send({ status: 'cancelled' })
    expect((await request(app).post(`${PUBLIC}/register`).send({ code: cancelledCode.code, name: 'X', email: 'x@example.com' })).status).toBe(410)
  })

  it('registers once per e-mail and counts the seat once', async () => {
    const webinar = await createWebinar()
    const code = await createCode(webinar.id)
    const email = `${unique('dup')}@example.com`

    const first = await register(code.code, { email })
    expect(first.status).toBe(201)
    expect(first.body.data.alreadyRegistered).toBe(false)

    const again = await register(code.code, { email: email.toUpperCase() })
    expect(again.status).toBe(200)
    expect(again.body.data.alreadyRegistered).toBe(true)
    expect(again.body.data.leadId).toBe(first.body.data.leadId)

    const codes = await owner.get(`${BASE}/webinars/${webinar.id}/access-codes`)
    expect(codes.body.data[0].leadCount).toBe(1)
  })

  it('stops at the seat limit of the code and of the webinar', async () => {
    const webinar = await createWebinar()
    const small = await createCode(webinar.id, { maxLeads: 1 })
    expect((await register(small.code)).status).toBe(201)
    const full = await register(small.code)
    expect(full.status).toBe(410)

    const tight = await createWebinar(owner, { maxParticipants: 1 })
    const code = await createCode(tight.id)
    expect((await register(code.code)).status).toBe(201)
    const sold = await register(code.code)
    expect(sold.status).toBe(409)
    expect(sold.body.error.code).toBe('WEBINAR_FULL')
  })

  it('does not oversell when many people register at once', async () => {
    const webinar = await createWebinar()
    const code = await createCode(webinar.id, { maxLeads: 3 })
    const results = await Promise.all(Array.from({ length: 8 }, () => register(code.code)))
    expect(results.filter((response) => response.status === 201)).toHaveLength(3)
    const [rows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM webinar_leads WHERE webinar_id = ?', [webinar.id])
    expect(Number(rows[0].total)).toBe(3)
  })

  it('validates the form', async () => {
    const webinar = await createWebinar()
    const code = await createCode(webinar.id)
    expect((await register(code.code, { email: 'not-an-email' })).status).toBe(400)
    expect((await register(code.code, { name: '' })).status).toBe(400)
  })

  it('takes the customer from the code, never from the request', async () => {
    const webinar = await createWebinar()
    const code = await createCode(webinar.id)
    const response = await register(code.code, { customerId: 'someone-else', clientId: 1 })
    expect(response.status).toBe(201)
    const [rows] = await pool.query<RowDataPacket[]>('SELECT customer_id FROM webinar_leads WHERE id = ?', [response.body.data.leadId])
    expect(rows[0].customer_id).toBe(customerId)
  })
})

describe('leads (signed in)', () => {
  it('lists, filters, counts, updates, exports and removes', async () => {
    const webinar = await createWebinar()
    const code = await createCode(webinar.id)
    const attending = await register(code.code, { name: 'Presente' })
    const absent = await register(code.code, { name: '=HYPERLINK("http://evil")' })
    await request(app).post(`${PUBLIC}/leads/${attending.body.data.leadId}/attend`).expect(204)

    const all = await owner.get(`${BASE}/webinars/${webinar.id}/leads`)
    expect(all.status).toBe(200)
    expect(all.body.page.total).toBe(2)

    const onlyAttended = await owner.get(`${BASE}/webinars/${webinar.id}/leads`).query({ status: 'attended' })
    expect(onlyAttended.body.data.map((lead: { name: string }) => lead.name)).toEqual(['Presente'])
    expect(onlyAttended.body.data[0].attendedAt).not.toBeNull()

    const stats = await owner.get(`${BASE}/webinars/${webinar.id}/leads/stats`)
    expect(stats.body.data).toMatchObject({ total: 2, registered: 1, attended: 1, attendanceRate: 50 })

    const csv = await owner.get(`${BASE}/webinars/${webinar.id}/leads/export.csv`)
    expect(csv.status).toBe(200)
    expect(csv.headers['content-type']).toContain('text/csv')
    expect(csv.text).toContain('"Presente"')
    expect(csv.text).toContain(`"'=HYPERLINK(""http://evil"")"`) // formula neutralized

    const noShow = await owner
      .patch(`${BASE}/webinars/${webinar.id}/leads/${absent.body.data.leadId}`)
      .send({ status: 'no_show' })
    expect(noShow.status).toBe(200)
    expect(noShow.body.data.status).toBe('no_show')

    expect((await colleague.delete(`${BASE}/webinars/${webinar.id}/leads/${absent.body.data.leadId}`)).status).toBe(403)
    expect((await owner.delete(`${BASE}/webinars/${webinar.id}/leads/${absent.body.data.leadId}`)).status).toBe(204)
    expect((await owner.get(`${BASE}/webinars/${webinar.id}/leads/${absent.body.data.leadId}`)).status).toBe(404)
  })
})

describe('chat', () => {
  it('carries presenter and participant messages in order', async () => {
    const webinar = await createWebinar()
    const code = await createCode(webinar.id)
    const lead = await register(code.code, { name: 'Joana' })
    const leadId = lead.body.data.leadId as string

    expect((await owner.post(`${BASE}/webinars/${webinar.id}/chat`).send({ message: 'Bem-vindos!' })).status).toBe(201)
    expect((await request(app).post(`${PUBLIC}/leads/${leadId}/chat`).send({ message: 'Olá!' })).status).toBe(201)

    const staff = await colleague.get(`${BASE}/webinars/${webinar.id}/chat`)
    expect(staff.body.data.map((m: { message: string; role: string }) => [m.message, m.role])).toEqual([
      ['Bem-vindos!', 'presenter'],
      ['Olá!', 'participant'],
    ])
    expect(staff.body.data[1].senderName).toBe('Joana')

    const visitor = await request(app).get(`${PUBLIC}/leads/${leadId}/chat`)
    expect(visitor.status).toBe(200)
    expect(visitor.body.data).toHaveLength(2)

    const lastSeen = visitor.body.data[1].createdAt as string
    const since = await request(app).get(`${PUBLIC}/leads/${leadId}/chat`).query({ after: lastSeen })
    expect(since.body.data).toHaveLength(0)

    const leads = await owner.get(`${BASE}/webinars/${webinar.id}/leads`)
    expect(leads.body.data[0].messageCount).toBe(1)
  })

  it('cannot be read or written by someone without a valid lead, or from another customer', async () => {
    const webinar = await createWebinar()
    expect((await request(app).get(`${PUBLIC}/leads/01HZZZZZZZZZZZZZZZZZZZZZZZ/chat`)).status).toBe(404)
    expect((await request(app).post(`${PUBLIC}/leads/01HZZZZZZZZZZZZZZZZZZZZZZZ/chat`).send({ message: 'oi' })).status).toBe(404)
    expect((await outsider.get(`${BASE}/webinars/${webinar.id}/chat`)).status).toBe(404)
    expect((await outsider.post(`${BASE}/webinars/${webinar.id}/chat`).send({ message: 'oi' })).status).toBe(404)
  })

  it('closes when the webinar ends', async () => {
    const webinar = await createWebinar()
    const code = await createCode(webinar.id)
    const lead = await register(code.code)
    await owner.post(`${BASE}/webinars/${webinar.id}/status`).send({ status: 'live' })
    expect((await owner.post(`${BASE}/webinars/${webinar.id}/status`).send({ status: 'completed' })).status).toBe(200)
    const closed = await request(app).post(`${PUBLIC}/leads/${lead.body.data.leadId}/chat`).send({ message: 'tarde' })
    expect(closed.status).toBe(409)
    expect(closed.body.error.code).toBe('CHAT_CLOSED')
  })

  it('rejects empty and oversized messages', async () => {
    const webinar = await createWebinar()
    expect((await owner.post(`${BASE}/webinars/${webinar.id}/chat`).send({ message: '   ' })).status).toBe(400)
    expect((await owner.post(`${BASE}/webinars/${webinar.id}/chat`).send({ message: 'x'.repeat(1001) })).status).toBe(400)
  })
})

describe('public session', () => {
  it('returns the webinar for a lead and 404 for a stranger', async () => {
    const webinar = await createWebinar()
    const code = await createCode(webinar.id)
    const lead = await register(code.code, { name: 'Carla' })

    const session = await request(app).get(`${PUBLIC}/leads/${lead.body.data.leadId}`)
    expect(session.status).toBe(200)
    expect(session.body.data).toMatchObject({ lead: { name: 'Carla' }, webinar: { id: webinar.id } })
    expect(JSON.stringify(session.body)).not.toContain('@example.com')

    expect((await request(app).get(`${PUBLIC}/leads/01HZZZZZZZZZZZZZZZZZZZZZZZ`)).status).toBe(404)
  })
})
