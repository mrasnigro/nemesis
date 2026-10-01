import { Request, Response } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js'
import { UNUSABLE_PASSWORD_HASH } from '../utils/password.js'
import {
  assertHandoffSharedKey,
  consumeHandoff,
  saveHandoff,
} from '../services/impHandoffStore.js'

function mapWebinarRole(impRole: string): 'admin' | 'client' {
  return impRole === 'admin' ? 'admin' : 'client'
}

function buildImpEmail(username: string): string {
  const safe = String(username || 'user')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
  return `imp.${safe || 'user'}@handoff.local`
}

function syntheticUserId(email: string): number {
  let hash = 0
  for (let i = 0; i < email.length; i += 1) {
    hash = (hash * 31 + email.charCodeAt(i)) >>> 0
  }
  return 900000000 + (hash % 99999999)
}

async function resolveOrCreateUser(input: {
  email: string
  name: string
  role: 'admin' | 'client'
}): Promise<{ id: number; email: string; name: string; role: string }> {
  try {
    const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1)
    if (existing[0]) {
      return {
        id: existing[0].id,
        email: existing[0].email,
        name: existing[0].name || input.name,
        role: existing[0].role,
      }
    }

    const inserted = await db
      .insert(users)
      .values({
        email: input.email,
        name: input.name,
        passwordHash: UNUSABLE_PASSWORD_HASH,
        role: input.role,
        isActive: 1,
      })
      .$returningId()

    const userId = Number(inserted[0]?.id)
    if (!userId) throw new Error('insert users failed')

    return {
      id: userId,
      email: input.email,
      name: input.name,
      role: input.role,
    }
  } catch (error) {
    console.warn('[imp-handoff] DB resolve failed — using synthetic user', error)
    return {
      id: syntheticUserId(input.email),
      email: input.email,
      name: input.name,
      role: input.role,
    }
  }
}

export async function registerImpHandoff(req: Request, res: Response): Promise<void> {
  try {
    const key = req.header('x-imp-handoff-key') || undefined
    if (!assertHandoffSharedKey(key)) {
      res.status(401).json({ error: 'Chave de handoff inválida' })
      return
    }

    const body = req.body || {}
    const username = String(body.username || '').trim().toLowerCase()
    const name = String(body.name || username || 'IMP User').trim()
    // Handoffs only ever sign in customer users; Webinar platform admins log in directly.
    const role = 'imp' as const
    const profile = body.profile ? String(body.profile) : undefined
    const returnTo = body.returnTo ? String(body.returnTo) : undefined
    const workspaceId = body.workspaceId ? String(body.workspaceId) : undefined
    const email = body.email ? String(body.email).trim().toLowerCase() : buildImpEmail(username)

    if (!username) {
      res.status(400).json({ error: 'username é obrigatório' })
      return
    }

    const record = saveHandoff({
      username,
      name,
      role,
      profile,
      email,
      returnTo,
      workspaceId,
      ttlMs: Number(body.ttlMs) > 0 ? Number(body.ttlMs) : undefined,
    })

    res.status(201).json({
      code: record.code,
      expiresAt: new Date(record.expiresAt).toISOString(),
      email: record.email,
    })
  } catch (error: any) {
    console.error('[imp-handoff] register error', error)
    res.status(500).json({ error: error.message || 'Falha ao registrar handoff' })
  }
}

export async function exchangeImpHandoff(req: Request, res: Response): Promise<void> {
  try {
    const code = String(req.body?.code || '').trim()
    if (!code) {
      res.status(400).json({ error: 'code é obrigatório' })
      return
    }

    const record = consumeHandoff(code)
    if (!record) {
      res.status(401).json({ error: 'Handoff inválido, expirado ou já usado' })
      return
    }

    const webinarRole = mapWebinarRole(record.role)
    const user = await resolveOrCreateUser({
      email: record.email,
      name: record.name,
      role: webinarRole,
    })

    const accessToken = generateAccessToken(user as any)
    const refreshToken = generateRefreshToken(user as any)

    res.status(200).json({
      user,
      accessToken,
      refreshToken,
      returnTo: record.returnTo || null,
      source: 'imp-handoff',
      imp: {
        username: record.username,
        profile: record.profile || null,
        workspaceId: record.workspaceId || null,
      },
    })
  } catch (error: any) {
    console.error('[imp-handoff] exchange error', error)
    res.status(500).json({ error: error.message || 'Falha ao trocar handoff' })
  }
}
