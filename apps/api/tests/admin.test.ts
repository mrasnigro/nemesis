import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { pool } from '../src/core/db.js'
import { createPlatformAdmin, signIn, unique } from './helpers.js'

let admin: Awaited<ReturnType<typeof signIn>>

async function createCustomer(moduleIds: string[]) {
  const response = await admin
    .post('/api/admin/customers')
    .send({ name: unique('Cliente '), plan: 'Enterprise', status: 'active', moduleIds })
  expect(response.status).toBe(201)
  return response.body.data as { id: string; slug: string; modulesEnabled: string[] }
}

async function createUser(customerId: string, body: Record<string, unknown> = {}) {
  const username = unique('u')
  const response = await admin.post('/api/admin/users').send({
    customerId,
    username,
    name: 'Usuário Teste',
    password: 'user-password',
    profile: 'sdr_bdr',
    ...body,
  })
  return { response, username, password: 'user-password' }
}

beforeAll(async () => {
  const credentials = await createPlatformAdmin()
  admin = await signIn(credentials.username, credentials.password)
})

afterAll(async () => {
  await pool.end()
})

describe('customers and module contracts', () => {
  it('creates a customer with a unique slug and its contracted modules', async () => {
    const customer = await createCustomer(['bdr', 'vsl', 'bdr'])
    expect(customer.modulesEnabled).toEqual(['bdr', 'vsl'])
    expect(customer.slug).toMatch(/^cliente-/)
  })

  it('rejects unknown module ids', async () => {
    const response = await admin.post('/api/admin/customers').send({ name: 'X Cliente', moduleIds: ['crm'] })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('refuses user grants outside the customer contract', async () => {
    const customer = await createCustomer(['training-ai'])
    const { response } = await createUser(customer.id, { moduleIds: ['training-ai', 'bdr'] })
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('MODULE_NOT_CONTRACTED')
  })

  it('removing a module from the contract removes it from users and from their session', async () => {
    const customer = await createCustomer(['training-ai', 'bdr'])
    const { response, username, password } = await createUser(customer.id, { moduleIds: ['training-ai', 'bdr'] })
    expect(response.status).toBe(201)
    const user = await signIn(username, password)
    expect((await user.get('/api/modules/bdr/campaigns')).status).toBe(200)

    const updated = await admin.put(`/api/admin/customers/${customer.id}/modules`).send({ moduleIds: ['training-ai'] })
    expect(updated.body.data.modulesEnabled).toEqual(['training-ai'])

    const me = await user.get('/api/auth/me')
    expect(me.body.data.modules).toEqual(['training-ai'])
    const blocked = await user.get('/api/modules/bdr/campaigns')
    expect(blocked.status).toBe(403)
    expect(blocked.body.error.code).toBe('MODULE_FORBIDDEN')

    const stored = await admin.get(`/api/admin/users/${response.body.data.id}`)
    expect(stored.body.data.assignedModules).toEqual(['training-ai'])
  })

  it('returns 409 for a duplicate username', async () => {
    const customer = await createCustomer(['bdr'])
    const first = await createUser(customer.id)
    const second = await admin.post('/api/admin/users').send({
      customerId: customer.id,
      username: first.username,
      name: 'Duplicado',
      password: 'user-password',
    })
    expect(second.status).toBe(409)
  })
})

describe('customer admin scope', () => {
  it('sees and manages only its own customer', async () => {
    const own = await createCustomer(['bdr', 'training-ai'])
    const other = await createCustomer(['bdr'])
    const manager = await createUser(own.id, { profile: 'customer_admin', moduleIds: ['bdr'] })
    const outsider = await createUser(other.id, { moduleIds: ['bdr'] })
    const agent = await signIn(manager.username, manager.password)

    const customers = await agent.get('/api/admin/customers')
    expect(customers.status).toBe(200)
    expect(customers.body.data.map((row: { id: string }) => row.id)).toEqual([own.id])

    const users = await agent.get('/api/admin/users')
    expect(users.body.data.every((row: { customerId: string }) => row.customerId === own.id)).toBe(true)

    expect((await agent.get(`/api/admin/users/${outsider.response.body.data.id}`)).status).toBe(404)
    expect((await agent.get(`/api/admin/customers/${other.id}`)).status).toBe(404)
  })

  it('cannot change contracts, create customers or create IMP administrators', async () => {
    const own = await createCustomer(['bdr'])
    const manager = await createUser(own.id, { profile: 'customer_admin', moduleIds: ['bdr'] })
    const agent = await signIn(manager.username, manager.password)

    expect((await agent.post('/api/admin/customers').send({ name: 'Nova' })).status).toBe(403)
    expect((await agent.put(`/api/admin/customers/${own.id}/modules`).send({ moduleIds: ['vsl'] })).status).toBe(403)
    const adminAttempt = await agent
      .post('/api/admin/users')
      .send({ username: unique('evil'), name: 'Evil', password: 'evil-password', role: 'admin' })
    expect(adminAttempt.status).toBe(403)
  })

  it('creates users inside its own customer even without passing customerId', async () => {
    const own = await createCustomer(['bdr'])
    const manager = await createUser(own.id, { profile: 'customer_admin', moduleIds: ['bdr'] })
    const agent = await signIn(manager.username, manager.password)
    const created = await agent
      .post('/api/admin/users')
      .send({ username: unique('team'), name: 'Equipe', password: 'team-password', profile: 'closer', moduleIds: ['bdr'] })
    expect(created.status).toBe(201)
    expect(created.body.data.customerId).toBe(own.id)
  })

  it('regular operators cannot reach the admin API', async () => {
    const own = await createCustomer(['bdr'])
    const operator = await createUser(own.id, { moduleIds: ['bdr'] })
    const agent = await signIn(operator.username, operator.password)
    expect((await agent.get('/api/admin/users')).status).toBe(403)
  })
})

describe('webinar handoff', () => {
  it('requires the webinar module', async () => {
    const own = await createCustomer(['bdr'])
    const operator = await createUser(own.id, { moduleIds: ['bdr'] })
    const agent = await signIn(operator.username, operator.password)
    expect((await agent.post('/api/modules/webinar/handoff').send({})).status).toBe(403)
  })

  it('reports a missing integration instead of failing silently', async () => {
    const own = await createCustomer(['webinar'])
    const operator = await createUser(own.id, { moduleIds: ['webinar'] })
    const agent = await signIn(operator.username, operator.password)
    const response = await agent.post('/api/modules/webinar/handoff').send({})
    expect(response.status).toBe(503)
    expect(response.body.error.code).toBe('INTEGRATION_NOT_CONFIGURED')
  })
})
