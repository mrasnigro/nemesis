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

export async function signIn(username: string, password: string) {
  const agent = request.agent(app)
  const response = await agent.post('/api/auth/login').send({ username, password })
  if (response.status !== 200) {
    throw new Error(`login failed for ${username}: ${response.status} ${JSON.stringify(response.body)}`)
  }
  return agent
}
