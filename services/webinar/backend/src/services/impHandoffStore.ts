/**
 * In-memory one-time IMP → Webinar handoff codes.
 * Codes are minted by the IMP platform API (server-to-server, shared key) and live for 2 minutes.
 * Single process only — move to Redis/DB before running more than one Webinar API instance.
 */

import { randomBytes, timingSafeEqual } from 'crypto'

export type ImpHandoffRecord = {
  code: string
  username: string
  name: string
  role: 'admin' | 'imp'
  profile?: string
  email: string
  returnTo?: string
  workspaceId?: string
  expiresAt: number
  consumed: boolean
}

const store = new Map<string, ImpHandoffRecord>()

const DEFAULT_TTL_MS = 2 * 60 * 1000
const MAX_TTL_MS = 5 * 60 * 1000
const DEV_FALLBACK_KEY = 'imp-dev-handoff-key'

export function createHandoffCode(): string {
  return `imp_ho_${randomBytes(24).toString('base64url')}`
}

export function saveHandoff(
  input: Omit<ImpHandoffRecord, 'code' | 'expiresAt' | 'consumed'> & {
    ttlMs?: number
  },
): ImpHandoffRecord {
  pruneExpired()
  const code = createHandoffCode()
  const ttl = Math.min(input.ttlMs ?? DEFAULT_TTL_MS, MAX_TTL_MS)
  const record: ImpHandoffRecord = {
    code,
    username: input.username,
    name: input.name,
    role: input.role,
    profile: input.profile,
    email: input.email,
    returnTo: input.returnTo,
    workspaceId: input.workspaceId,
    expiresAt: Date.now() + ttl,
    consumed: false,
  }
  store.set(code, record)
  return record
}

export function consumeHandoff(code: string): ImpHandoffRecord | null {
  pruneExpired()
  const record = store.get(code)
  if (!record) return null
  store.delete(code)
  if (record.consumed || record.expiresAt < Date.now()) return null
  return { ...record, consumed: true }
}

function pruneExpired() {
  const now = Date.now()
  for (const [key, value] of store.entries()) {
    if (value.expiresAt < now || value.consumed) {
      store.delete(key)
    }
  }
}

/** Production requires IMP_HANDOFF_SHARED_KEY; the well-known dev key is only accepted outside production. */
export function getHandoffSharedKey(): string | null {
  const configured = process.env.IMP_HANDOFF_SHARED_KEY?.trim()
  if (configured) return configured
  return process.env.NODE_ENV === 'production' ? null : DEV_FALLBACK_KEY
}

export function assertHandoffSharedKey(headerValue: string | undefined): boolean {
  const expected = getHandoffSharedKey()
  if (!headerValue || !expected) return false
  const a = Buffer.from(headerValue)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
