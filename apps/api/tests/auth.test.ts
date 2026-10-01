import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { pool } from '../src/core/db.js'
import { app, createPlatformAdmin, signIn, unique } from './helpers.js'

let admin: Awaited<ReturnType<typeof signIn>>
let customerId: string

async function createCustomerUser(overrides: Record<string, unknown> = {}) {
  const username = unique('user')
  const response = await admin
    .post('/api/admin/users')
    .send({
      customerId,
      username,
      name: 'Operadora Teste',
      password: 'user-password',
      profile: 'sdr_bdr',
      moduleIds: ['bdr'],
      ...overrides,
    })
  expect(response.status).toBe(201)
  return { id: response.body.data.id as string, username, password: 'user-password' }
}

beforeAll(async () => {
  const credentials = await createPlatformAdmin()
  admin = await signIn(credentials.username, credentials.password)
  const created = await admin
    .post('/api/admin/customers')
    .send({ name: unique('Cliente Auth '), plan: 'Growth', status: 'active', moduleIds: ['bdr', 'training-ai'] })
  expect(created.status).toBe(201)
  customerId = created.body.data.id
})

afterAll(async () => {
  await pool.end()
})

describe('auth', () => {
  it('rejects wrong passwords and unknown users with the same 401', async () => {
    const user = await createCustomerUser()
    const wrong = await request(app).post('/api/auth/login').send({ username: user.username, password: 'nope-nope' })
    const unknown = await request(app).post('/api/auth/login').send({ username: unique('ghost'), password: 'x' })
    expect(wrong.status).toBe(401)
    expect(unknown.status).toBe(401)
    expect(wrong.body.error.code).toBe(unknown.body.error.code)
  })

  it('returns the session user with customer and effective modules', async () => {
    const user = await createCustomerUser({ moduleIds: ['bdr', 'training-ai'] })
    const agent = await signIn(user.username, user.password)
    const me = await agent.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.data).toMatchObject({
      username: user.username,
      role: 'imp',
      profile: 'sdr_bdr',
      customer: { id: customerId },
      modules: ['bdr', 'training-ai'],
    })
  })

  it('requires a session for /me and module routes', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401)
    expect((await request(app).get('/api/modules/bdr/campaigns')).status).toBe(401)
  })

  it('ignores X-Dev-User when dev auth is off', async () => {
    const user = await createCustomerUser()
    const response = await request(app).get('/api/auth/me').set('X-Dev-User', user.username)
    expect(response.status).toBe(401)
  })

  it('revokes existing sessions when the password is reset', async () => {
    const user = await createCustomerUser()
    const agent = await signIn(user.username, user.password)
    expect((await agent.get('/api/auth/me')).status).toBe(200)

    const reset = await admin.patch(`/api/admin/users/${user.id}`).send({ password: 'another-password' })
    expect(reset.status).toBe(200)

    expect((await agent.get('/api/auth/me')).status).toBe(401)
    await signIn(user.username, 'another-password')
  })

  it('blocks deactivated users and suspended customers', async () => {
    const user = await createCustomerUser()
    await admin.patch(`/api/admin/users/${user.id}`).send({ status: 'inactive' })
    const inactive = await request(app).post('/api/auth/login').send(user)
    expect(inactive.status).toBe(403)
    expect(inactive.body.error.code).toBe('ACCOUNT_DISABLED')

    const other = await admin
      .post('/api/admin/customers')
      .send({ name: unique('Suspensa '), status: 'active', moduleIds: ['bdr'] })
    const member = await admin.post('/api/admin/users').send({
      customerId: other.body.data.id,
      username: unique('member'),
      name: 'Membro',
      password: 'member-password',
      moduleIds: ['bdr'],
    })
    const memberAgent = await signIn(member.body.data.username, 'member-password')
    await admin.patch(`/api/admin/customers/${other.body.data.id}`).send({ status: 'suspended' })

    const me = await memberAgent.get('/api/auth/me')
    expect(me.status).toBe(403)
    expect(me.body.error.code).toBe('CUSTOMER_SUSPENDED')
  })

  it('records sign-ins in the audit log', async () => {
    const user = await createCustomerUser()
    await signIn(user.username, user.password)
    const logs = await admin.get('/api/admin/audit-logs').query({ customerId, q: 'user.login' })
    expect(logs.status).toBe(200)
    expect(logs.body.data.some((row: { action: string }) => row.action === 'user.login')).toBe(true)
  })
})
