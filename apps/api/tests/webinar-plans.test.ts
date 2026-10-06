import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { pool } from '../src/core/db.js'
import { smallest } from '../src/modules/webinar-plans/plans.service.js'
import { app, createPlatformAdmin, signIn, unique } from './helpers.js'

type Agent = Awaited<ReturnType<typeof signIn>>
type Plan = {
  id: string
  name: string
  priceCents: number
  maxDurationMinutes: number | null
  maxParticipants: number | null
  replayStorageDays: number | null
  features: string[]
  isStarter: boolean
  isActive: boolean
  subscribers?: number
}

const BASE = '/api/modules/webinar'
const ADMIN = '/api/admin/webinar'
const PUBLIC = '/api/public/webinar'

let admin: Agent
const inHours = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString()
const inDays = (days: number) => inHours(days * 24)

async function plans(): Promise<Plan[]> {
  const response = await admin.get(`${ADMIN}/plans`)
  expect(response.status).toBe(200)
  return response.body.data
}

async function planNamed(name: string): Promise<Plan> {
  const plan = (await plans()).find((item) => item.name === name)
  if (!plan) throw new Error(`plan ${name} missing`)
  return plan
}

/** A customer that contracts Webinar and has never used it, plus its administrator and an operator. */
async function newCustomer() {
  const created = await admin
    .post('/api/admin/customers')
    .send({ name: unique('Cliente Planos '), plan: 'Enterprise', status: 'active', moduleIds: ['webinar'] })
  expect(created.status).toBe(201)
  const customerId = created.body.data.id as string
  const users: Record<string, Agent> = {}
  for (const profile of ['customer_admin', 'sdr_bdr'] as const) {
    const username = unique('u')
    const response = await admin.post('/api/admin/users').send({
      customerId,
      username,
      name: 'Usuário Planos',
      password: 'user-password',
      profile,
      moduleIds: ['webinar'],
    })
    expect(response.status).toBe(201)
    users[profile] = await signIn(username, 'user-password')
  }
  return { customerId, manager: users.customer_admin, operator: users.sdr_bdr }
}

async function assign(customerId: string, body: Record<string, unknown>) {
  return admin.put(`${ADMIN}/subscriptions/${customerId}`).send(body)
}

function webinarBody(extra: Record<string, unknown> = {}) {
  return { title: unique('Webinar '), scheduledAt: inHours(24), durationMinutes: 15, presenterName: 'Ana', ...extra }
}

beforeAll(async () => {
  const credentials = await createPlatformAdmin()
  admin = await signIn(credentials.username, credentials.password)
})

afterAll(async () => {
  await pool.end()
})

describe('plan catalog', () => {
  it('ships the starter plans, with Trial as the one new customers start on', async () => {
    const list = await plans()
    const names = list.map((plan) => plan.name)
    expect(names).toEqual(expect.arrayContaining(['Trial', 'Básico', 'Profissional', 'Enterprise']))
    const trial = list.find((plan) => plan.name === 'Trial')!
    expect(trial).toMatchObject({ priceCents: 0, maxDurationMinutes: 20, maxParticipants: 5, isStarter: true })
    expect(list.filter((plan) => plan.isStarter)).toHaveLength(1)
    const enterprise = list.find((plan) => plan.name === 'Enterprise')!
    expect(enterprise).toMatchObject({ maxDurationMinutes: null, maxParticipants: null, replayStorageDays: null })
  })

  it('is managed by IMP administrators only', async () => {
    const { manager, operator } = await newCustomer()
    for (const agent of [manager, operator]) {
      const response = await agent.get(`${ADMIN}/plans`)
      expect(response.status).toBe(403)
    }
    expect((await manager.post(`${ADMIN}/plans`).send({ name: 'X', priceCents: 1 })).status).toBe(403)
    expect((await request(app).get(`${ADMIN}/plans`)).status).toBe(401)
  })

  it('creates, edits and deletes a plan', async () => {
    const name = unique('Plano ')
    const created = await admin.post(`${ADMIN}/plans`).send({
      name,
      description: '  Para testes  ',
      priceCents: 4900,
      maxDurationMinutes: 45,
      maxParticipants: 200,
      features: ['Chat', 'Chat', ' Replays '],
    })
    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({
      name,
      description: 'Para testes',
      priceCents: 4900,
      maxDurationMinutes: 45,
      maxParticipants: 200,
      replayStorageDays: null,
      features: ['Chat', 'Replays'],
      isActive: true,
      isStarter: false,
      subscribers: 0,
    })
    const id = created.body.data.id as string

    const edited = await admin.patch(`${ADMIN}/plans/${id}`).send({ priceCents: 5900, maxParticipants: null })
    expect(edited.status).toBe(200)
    expect(edited.body.data).toMatchObject({ priceCents: 5900, maxParticipants: null, maxDurationMinutes: 45 })

    expect((await admin.delete(`${ADMIN}/plans/${id}`)).status).toBe(204)
    expect((await plans()).some((plan) => plan.id === id)).toBe(false)
    expect((await admin.delete(`${ADMIN}/plans/${id}`)).status).toBe(404)
  })

  it('rejects bad input and a repeated name', async () => {
    expect((await admin.post(`${ADMIN}/plans`).send({ name: '', priceCents: 0 })).status).toBe(400)
    expect((await admin.post(`${ADMIN}/plans`).send({ name: 'Ok', priceCents: -1 })).status).toBe(400)
    expect((await admin.post(`${ADMIN}/plans`).send({ name: 'Ok', priceCents: 0, maxDurationMinutes: 0 })).status).toBe(400)
    const taken = await admin.post(`${ADMIN}/plans`).send({ name: 'trial', priceCents: 0 })
    expect(taken.status).toBe(409)
    expect(taken.body.error.code).toBe('PLAN_NAME_TAKEN')
    expect((await admin.patch(`${ADMIN}/plans/${(await planNamed('Trial')).id}`).send({})).status).toBe(400)
  })

  it('keeps exactly one starter plan, and never an inactive one', async () => {
    const trial = await planNamed('Trial')
    const created = await admin.post(`${ADMIN}/plans`).send({ name: unique('Inicial '), priceCents: 0 })
    const other = created.body.data as Plan

    expect((await admin.patch(`${ADMIN}/plans/${trial.id}`).send({ isStarter: false })).body.error.code).toBe('STARTER_REQUIRED')
    expect((await admin.patch(`${ADMIN}/plans/${trial.id}`).send({ isActive: false })).body.error.code).toBe('STARTER_MUST_BE_ACTIVE')
    expect((await admin.delete(`${ADMIN}/plans/${trial.id}`)).body.error.code).toBe('STARTER_REQUIRED')

    try {
      expect((await admin.patch(`${ADMIN}/plans/${other.id}`).send({ isStarter: true })).status).toBe(200)
      const after = await plans()
      expect(after.filter((plan) => plan.isStarter).map((plan) => plan.name)).toEqual([other.name])
    } finally {
      await admin.patch(`${ADMIN}/plans/${trial.id}`).send({ isStarter: true })
      await admin.delete(`${ADMIN}/plans/${other.id}`)
    }
    expect((await plans()).filter((plan) => plan.isStarter).map((plan) => plan.name)).toEqual(['Trial'])
  })

  it('does not delete a plan customers are on', async () => {
    const { customerId } = await newCustomer()
    const created = await admin.post(`${ADMIN}/plans`).send({ name: unique('Em uso '), priceCents: 100 })
    const plan = created.body.data as Plan
    expect((await assign(customerId, { planId: plan.id })).status).toBe(200)
    const blocked = await admin.delete(`${ADMIN}/plans/${plan.id}`)
    expect(blocked.status).toBe(409)
    expect(blocked.body.error.code).toBe('PLAN_IN_USE')
    expect((await plans()).find((item) => item.id === plan.id)?.subscribers).toBe(1)
  })
})

describe("a customer's own subscription", () => {
  it('starts on Trial the first time the module is used, and shows the limits', async () => {
    const { manager, operator } = await newCustomer()
    const response = await operator.get(`${BASE}/subscription`)
    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      state: 'active',
      status: 'active',
      daysLeft: 30,
      plan: { name: 'Trial', maxDurationMinutes: 20, maxParticipants: 5 },
    })
    // The same subscription on the next read: the trial clock does not restart.
    const again = await manager.get(`${BASE}/subscription`)
    expect(again.body.data.expiresAt).toBe(response.body.data.expiresAt)
  })

  it('shows payments to the customer administrator only', async () => {
    const { customerId, manager, operator } = await newCustomer()
    const basic = await planNamed('Básico')
    await assign(customerId, { planId: basic.id, expiresAt: inDays(5) })
    await admin.post(`${ADMIN}/subscriptions/${customerId}/payments`).send({ method: 'pix' })

    const seenByManager = await manager.get(`${BASE}/subscription`)
    expect(seenByManager.body.data.payments).toHaveLength(1)
    expect(seenByManager.body.data.payments[0]).toMatchObject({ amountCents: basic.priceCents, method: 'pix', planName: 'Básico' })
    const seenByOperator = await operator.get(`${BASE}/subscription`)
    expect(seenByOperator.body.data.payments).toBeUndefined()
    expect(seenByOperator.body.data.plan.name).toBe('Básico')
  })

  it('lists the plans on offer without the inactive ones', async () => {
    const { operator } = await newCustomer()
    const hidden = (await admin.post(`${ADMIN}/plans`).send({ name: unique('Oculto '), priceCents: 1, isActive: false })).body.data as Plan
    const response = await operator.get(`${BASE}/plans`)
    expect(response.status).toBe(200)
    const names = (response.body.data as Plan[]).map((plan) => plan.name)
    expect(names).toEqual(expect.arrayContaining(['Trial', 'Básico', 'Profissional', 'Enterprise']))
    expect(names).not.toContain(hidden.name)
    await admin.delete(`${ADMIN}/plans/${hidden.id}`)
  })

  it('needs the Webinar module', async () => {
    const created = await admin
      .post('/api/admin/customers')
      .send({ name: unique('Sem webinar '), plan: 'Starter', status: 'active', moduleIds: ['bdr'] })
    const username = unique('u')
    await admin.post('/api/admin/users').send({
      customerId: created.body.data.id,
      username,
      name: 'Sem módulo',
      password: 'user-password',
      profile: 'sdr_bdr',
      moduleIds: ['bdr'],
    })
    const agent = await signIn(username, 'user-password')
    expect((await agent.get(`${BASE}/subscription`)).status).toBe(403)
  })
})

describe('plan limits', () => {
  it('stops a webinar from being longer or bigger than the plan allows', async () => {
    const { operator } = await newCustomer() // Trial: 20 minutes, 5 people

    const tooLong = await operator.post(`${BASE}/webinars`).send(webinarBody({ durationMinutes: 21 }))
    expect(tooLong.status).toBe(403)
    expect(tooLong.body.error.code).toBe('PLAN_LIMIT')
    expect(tooLong.body.error.message).toContain('20 minutos')

    const tooMany = await operator.post(`${BASE}/webinars`).send(webinarBody({ maxParticipants: 6 }))
    expect(tooMany.status).toBe(403)
    expect(tooMany.body.error.code).toBe('PLAN_LIMIT')

    const fits = await operator.post(`${BASE}/webinars`).send(webinarBody({ durationMinutes: 20, maxParticipants: 5 }))
    expect(fits.status).toBe(201)

    const id = fits.body.data.id as string
    expect((await operator.patch(`${BASE}/webinars/${id}`).send({ durationMinutes: 45 })).body.error.code).toBe('PLAN_LIMIT')
    expect((await operator.patch(`${BASE}/webinars/${id}`).send({ maxParticipants: 50 })).body.error.code).toBe('PLAN_LIMIT')
    expect((await operator.patch(`${BASE}/webinars/${id}`).send({ title: 'Outro título' })).status).toBe(200)
  })

  it('lets a bigger plan allow more, and no limit mean none', async () => {
    const { customerId, operator } = await newCustomer()
    expect((await operator.post(`${BASE}/webinars`).send(webinarBody({ durationMinutes: 90 }))).status).toBe(403)
    await assign(customerId, { planId: (await planNamed('Profissional')).id, expiresAt: null })
    expect((await operator.post(`${BASE}/webinars`).send(webinarBody({ durationMinutes: 90 }))).status).toBe(201)
    expect((await operator.post(`${BASE}/webinars`).send(webinarBody({ durationMinutes: 121 }))).status).toBe(403)
    await assign(customerId, { planId: (await planNamed('Enterprise')).id })
    expect((await operator.post(`${BASE}/webinars`).send(webinarBody({ durationMinutes: 600, maxParticipants: 50000 }))).status).toBe(201)
  })

  it('checks the length again when a webinar is scheduled after the plan went down', async () => {
    const { customerId, operator } = await newCustomer()
    await assign(customerId, { planId: (await planNamed('Profissional')).id, expiresAt: null })
    const created = await operator.post(`${BASE}/webinars`).send(webinarBody({ durationMinutes: 90 }))
    const id = created.body.data.id as string
    await assign(customerId, { planId: (await planNamed('Trial')).id })

    const scheduled = await operator.post(`${BASE}/webinars/${id}/status`).send({ status: 'scheduled' })
    expect(scheduled.status).toBe(403)
    expect(scheduled.body.error.code).toBe('PLAN_LIMIT')
    expect((await operator.patch(`${BASE}/webinars/${id}`).send({ durationMinutes: 20 })).status).toBe(200)
    expect((await operator.post(`${BASE}/webinars/${id}/status`).send({ status: 'scheduled' })).status).toBe(200)
  })

  it('caps registrations at the plan, even when the webinar sets no limit', async () => {
    const { operator } = await newCustomer() // Trial: 5 people
    const created = await operator.post(`${BASE}/webinars`).send(webinarBody())
    const id = created.body.data.id as string
    const code = await operator
      .post(`${BASE}/webinars/${id}/access-codes`)
      .send({ scheduledAt: inHours(24), expiresAt: inHours(48) })
    const registerAs = (n: number) =>
      request(app)
        .post(`${PUBLIC}/register`)
        .send({ code: code.body.data.code, name: `Lead ${n}`, email: `${unique('l')}@example.com` })

    for (let n = 1; n <= 5; n += 1) expect((await registerAs(n)).status).toBe(201)
    const sixth = await registerAs(6)
    expect(sixth.status).toBe(409)
    expect(sixth.body.error.code).toBe('WEBINAR_FULL')
  })

  it('picks the smallest limit that applies', () => {
    expect(smallest(200, 5)).toBe(5)
    expect(smallest(200, null)).toBe(200)
    expect(smallest(null, undefined)).toBeNull()
  })
})

describe('subscription in force', () => {
  const blocked = [
    ['expired', { expiresAt: new Date(Date.now() - 3600_000).toISOString() }],
    ['suspended', { status: 'suspended' }],
    ['cancelled', { status: 'cancelled' }],
  ] as const

  it.each(blocked)('when the subscription is %s, nothing can be scheduled or go live, but drafts still work', async (state, change) => {
    const { customerId, operator } = await newCustomer()
    const created = await operator.post(`${BASE}/webinars`).send(webinarBody())
    const id = created.body.data.id as string
    await assign(customerId, change)

    const seen = await operator.get(`${BASE}/subscription`)
    expect(seen.body.data.state).toBe(state)

    for (const status of ['scheduled', 'live']) {
      const response = await operator.post(`${BASE}/webinars/${id}/status`).send({ status })
      expect(response.status).toBe(403)
      expect(response.body.error.code).toBe('SUBSCRIPTION_INACTIVE')
    }
    expect((await operator.post(`${BASE}/webinars`).send(webinarBody({ status: 'live' }))).status).toBe(403)
    expect((await operator.patch(`${BASE}/webinars/${id}`).send({ status: 'scheduled' })).status).toBe(403)

    expect((await operator.get(`${BASE}/webinars/${id}`)).status).toBe(200)
    expect((await operator.post(`${BASE}/webinars`).send(webinarBody())).status).toBe(201)
    expect((await operator.patch(`${BASE}/webinars/${id}`).send({ title: 'Ainda posso editar' })).status).toBe(200)
  })

  it('lets a live webinar finish after the subscription lapses', async () => {
    const { customerId, operator } = await newCustomer()
    const created = await operator.post(`${BASE}/webinars`).send(webinarBody())
    const id = created.body.data.id as string
    expect((await operator.post(`${BASE}/webinars/${id}/status`).send({ status: 'live' })).status).toBe(200)

    await assign(customerId, { status: 'suspended' })
    const ended = await operator.post(`${BASE}/webinars/${id}/status`).send({ status: 'completed' })
    expect(ended.status).toBe(200)
    expect(ended.body.data.status).toBe('completed')
  })

  it('works again once the administrator reactivates it', async () => {
    const { customerId, operator } = await newCustomer()
    const created = await operator.post(`${BASE}/webinars`).send(webinarBody())
    const id = created.body.data.id as string
    await assign(customerId, { status: 'suspended' })
    expect((await operator.post(`${BASE}/webinars/${id}/status`).send({ status: 'scheduled' })).status).toBe(403)
    await assign(customerId, { status: 'active', expiresAt: inDays(10) })
    expect((await operator.post(`${BASE}/webinars/${id}/status`).send({ status: 'scheduled' })).status).toBe(200)
  })
})

describe('administering subscriptions and payments', () => {
  it('lists customers that contract Webinar with where their plan stands', async () => {
    const { customerId, operator } = await newCustomer()
    await operator.get(`${BASE}/subscription`)
    const noWebinar = await admin
      .post('/api/admin/customers')
      .send({ name: unique('Sem webinar '), plan: 'Starter', status: 'active', moduleIds: ['bdr'] })

    const response = await admin.get(`${ADMIN}/subscriptions`).query({ pageSize: 100 })
    expect(response.status).toBe(200)
    const rows = response.body.data as { customerId: string; planName: string | null; subscriptionStatus: string | null }[]
    expect(rows.find((row) => row.customerId === customerId)).toMatchObject({ planName: 'Trial', subscriptionStatus: 'active' })
    expect(rows.some((row) => row.customerId === noWebinar.body.data.id)).toBe(false)
    expect(response.body.page.total).toBeGreaterThanOrEqual(1)

    const trial = await planNamed('Trial')
    const byPlan = await admin.get(`${ADMIN}/subscriptions`).query({ planId: trial.id, pageSize: 100 })
    expect((byPlan.body.data as { customerId: string }[]).some((row) => row.customerId === customerId)).toBe(true)
  })

  it('shows a customer that never used the module without a subscription', async () => {
    const { customerId } = await newCustomer()
    const detail = await admin.get(`${ADMIN}/subscriptions/${customerId}`)
    expect(detail.status).toBe(200)
    expect(detail.body.data).toMatchObject({ customerId, subscription: null, payments: [] })
    expect((await admin.get(`${ADMIN}/subscriptions/01ZZZZZZZZZZZZZZZZZZZZZZZZ`)).status).toBe(404)
  })

  it('assigns a plan to a customer that has none, and changes it later', async () => {
    const { customerId } = await newCustomer()
    expect((await assign(customerId, {})).status).toBe(400)
    const missingPlan = await assign(customerId, { status: 'active' })
    expect(missingPlan.status).toBe(400)

    const basic = await planNamed('Básico')
    const first = await assign(customerId, { planId: basic.id, expiresAt: inDays(30) })
    expect(first.status).toBe(200)
    expect(first.body.data.subscription).toMatchObject({ state: 'active', plan: { name: 'Básico' } })

    const second = await assign(customerId, { planId: (await planNamed('Profissional')).id })
    expect(second.body.data.subscription).toMatchObject({ plan: { name: 'Profissional' }, daysLeft: 30 })
    expect((await assign(customerId, { planId: '01ZZZZZZZZZZZZZZZZZZZZZZZZ' })).status).toBe(404)
  })

  it('does not hand out an inactive plan', async () => {
    const { customerId } = await newCustomer()
    const hidden = (await admin.post(`${ADMIN}/plans`).send({ name: unique('Oculto '), priceCents: 1, isActive: false })).body.data as Plan
    const response = await assign(customerId, { planId: hidden.id })
    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('PLAN_INACTIVE')
    await admin.delete(`${ADMIN}/plans/${hidden.id}`)
  })

  it('renews the subscription when a payment is registered', async () => {
    const { customerId, operator } = await newCustomer()
    const basic = await planNamed('Básico')
    await assign(customerId, { planId: basic.id, expiresAt: inDays(2) })
    const before = new Date((await admin.get(`${ADMIN}/subscriptions/${customerId}`)).body.data.subscription.expiresAt).getTime()

    const paid = await admin.post(`${ADMIN}/subscriptions/${customerId}/payments`).send({ method: 'transferência', note: 'Março' })
    expect(paid.status).toBe(201)
    const subscription = paid.body.data.subscription
    const after = new Date(subscription.expiresAt).getTime()
    // One month from the old expiry, not from today: paying early does not waste days.
    expect(after - before).toBeGreaterThan(27 * 86_400_000)
    expect(after - before).toBeLessThan(32 * 86_400_000)
    expect(paid.body.data.payments).toHaveLength(1)
    expect(paid.body.data.payments[0]).toMatchObject({ amountCents: basic.priceCents, method: 'transferência', note: 'Março', voidedAt: null })

    expect((await operator.get(`${BASE}/subscription`)).body.data.state).toBe('active')
  })

  it('reactivates an expired subscription from the day of payment', async () => {
    const { customerId, operator } = await newCustomer()
    await assign(customerId, { planId: (await planNamed('Básico')).id, expiresAt: inDays(-10) })
    expect((await operator.get(`${BASE}/subscription`)).body.data.state).toBe('expired')

    const paid = await admin.post(`${ADMIN}/subscriptions/${customerId}/payments`).send({ amountCents: 5000 })
    const days = (new Date(paid.body.data.subscription.expiresAt).getTime() - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(27)
    expect(days).toBeLessThan(32)
    expect(paid.body.data.payments[0].amountCents).toBe(5000)
    expect((await operator.get(`${BASE}/subscription`)).body.data.state).toBe('active')
  })

  it('accepts an explicit period and refuses an upside-down one', async () => {
    const { customerId } = await newCustomer()
    await assign(customerId, { planId: (await planNamed('Básico')).id, expiresAt: inDays(1) })
    const start = inDays(1)
    const end = inDays(91)
    const paid = await admin.post(`${ADMIN}/subscriptions/${customerId}/payments`).send({ periodStart: start, periodEnd: end })
    expect(paid.status).toBe(201)
    expect(paid.body.data.subscription.expiresAt).toBe(end)

    const backwards = await admin.post(`${ADMIN}/subscriptions/${customerId}/payments`).send({ periodStart: end, periodEnd: start })
    expect(backwards.status).toBe(400)
  })

  it('leaves a subscription that never expires as it is', async () => {
    const { customerId } = await newCustomer()
    await assign(customerId, { planId: (await planNamed('Enterprise')).id, expiresAt: null })
    const paid = await admin.post(`${ADMIN}/subscriptions/${customerId}/payments`).send({})
    expect(paid.status).toBe(201)
    expect(paid.body.data.subscription).toMatchObject({ expiresAt: null, daysLeft: null, state: 'active' })
  })

  it('needs a subscription before a payment can be registered', async () => {
    const { customerId } = await newCustomer()
    const response = await admin.post(`${ADMIN}/subscriptions/${customerId}/payments`).send({})
    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('NO_SUBSCRIPTION')
  })

  it('voids a payment without changing the expiry, and keeps it in the history', async () => {
    const { customerId } = await newCustomer()
    await assign(customerId, { planId: (await planNamed('Básico')).id, expiresAt: inDays(1) })
    const paid = await admin.post(`${ADMIN}/subscriptions/${customerId}/payments`).send({})
    const paymentId = paid.body.data.payments[0].id as string
    const expiresAt = paid.body.data.subscription.expiresAt

    const voided = await admin.delete(`${ADMIN}/subscriptions/${customerId}/payments/${paymentId}`)
    expect(voided.status).toBe(200)
    expect(voided.body.data.payments[0].voidedAt).not.toBeNull()
    expect(voided.body.data.subscription.expiresAt).toBe(expiresAt)
    expect((await admin.delete(`${ADMIN}/subscriptions/${customerId}/payments/${paymentId}`)).status).toBe(404)
  })

  it("does not let one customer's payment be voided through another", async () => {
    const one = await newCustomer()
    const two = await newCustomer()
    await assign(one.customerId, { planId: (await planNamed('Básico')).id, expiresAt: inDays(1) })
    const paid = await admin.post(`${ADMIN}/subscriptions/${one.customerId}/payments`).send({})
    const paymentId = paid.body.data.payments[0].id as string
    expect((await admin.delete(`${ADMIN}/subscriptions/${two.customerId}/payments/${paymentId}`)).status).toBe(404)
  })

  it('records who changed what', async () => {
    const { customerId } = await newCustomer()
    await assign(customerId, { planId: (await planNamed('Básico')).id, expiresAt: inDays(1) })
    await admin.post(`${ADMIN}/subscriptions/${customerId}/payments`).send({})
    const [rows] = await pool.query<import('mysql2').RowDataPacket[]>(
      `SELECT action FROM audit_logs WHERE customer_id = :customerId AND action LIKE 'webinar.%' ORDER BY created_at, id`,
      { customerId },
    )
    expect(rows.map((row) => row.action)).toEqual(['webinar.subscription_updated', 'webinar.payment_recorded'])
  })
})
