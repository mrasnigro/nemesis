import bcrypt from 'bcryptjs'
import request from 'supertest'
import { ulid } from 'ulid'
import { createApp } from '../src/app.js'
import { pool } from '../src/core/db.js'

export const app = createApp()

export function unique(prefix: string): string {
  return `${prefix}${ulid().slice(-10).toLowerCase()}`
}

/** Inserts a platform administrator directly (there is no API to create the first one). */
export async function createPlatformAdmin(): Promise<{ username: string; password: string }> {
  const username = unique('admin')
  const password = 'admin-password'
  const now = new Date()
  await pool.query(
    `INSERT INTO users (id, customer_id, username, name, role, profile, status, password_hash, created_at, updated_at)
     VALUES (:id, NULL, :username, 'Test Admin', 'admin', NULL, 'active', :hash, :now, :now)`,
    { id: ulid(), username, hash: await bcrypt.hash(password, 4), now },
  )
  return { username, password }
}

/**
 * Puts a customer on a Webinar plan by name. A new customer starts on Trial (20 minutes, 5 people),
 * so tests that are not about plans move it to Enterprise to keep limits out of the way.
 */
export async function grantWebinarPlan(
  admin: ReturnType<typeof request.agent>,
  customerId: string,
  planName = 'Enterprise',
) {
  const plans = await admin.get('/api/admin/webinar/plans')
  const plan = (plans.body.data as { id: string; name: string }[]).find((item) => item.name === planName)
  if (!plan) throw new Error(`Webinar plan ${planName} not found`)
  const response = await admin.put(`/api/admin/webinar/subscriptions/${customerId}`).send({ planId: plan.id, expiresAt: null })
  if (response.status !== 200) throw new Error(`could not grant ${planName}: ${response.status} ${JSON.stringify(response.body)}`)
}

export async function signIn(username: string, password: string) {
  const agent = request.agent(app)
  const response = await agent.post('/api/auth/login').send({ username, password })
  if (response.status !== 200) {
    throw new Error(`login failed for ${username}: ${response.status} ${JSON.stringify(response.body)}`)
  }
  return agent
}
