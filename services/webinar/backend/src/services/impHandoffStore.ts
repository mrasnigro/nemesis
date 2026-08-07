/**
 * In-memory one-time IMP → Webinar handoff codes (dev / Phase C stub).
 * Replace with Redis/DB when IMP has a real auth API.
 */

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

export function createHandoffCode(): string {
  const rand = Math.random().toString(36).slice(2, 10)
  return `imp_ho_${Date.now().toString(36)}_${rand}`
}

export function saveHandoff(
  input: Omit<ImpHandoffRecord, 'code' | 'expiresAt' | 'consumed'> & {
    code?: string
    ttlMs?: number
  },
): ImpHandoffRecord {
  pruneExpired()
  const code = input.code || createHandoffCode()
  const record: ImpHandoffRecord = {
    code,
    username: input.username,
    name: input.name,
    role: input.role,
    profile: input.profile,
    email: input.email,
    returnTo: input.returnTo,
    workspaceId: input.workspaceId,
    expiresAt: Date.now() + (input.ttlMs ?? DEFAULT_TTL_MS),
    consumed: false,
  }
  store.set(code, record)
  return record
}

export function consumeHandoff(code: string): ImpHandoffRecord | null {
  pruneExpired()
  const record = store.get(code)
  if (!record) return null
  if (record.consumed) return null
  if (record.expiresAt < Date.now()) {
    store.delete(code)
    return null
  }
  record.consumed = true
  store.set(code, record)
  // single-use: delete after consume mark
  store.delete(code)
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

export function getHandoffSharedKey(): string {
  return (
    process.env.IMP_HANDOFF_SHARED_KEY ||
    process.env.VITE_IMP_HANDOFF_SHARED_KEY ||
    'imp-dev-handoff-key'
  )
}

export function assertHandoffSharedKey(headerValue: string | undefined): boolean {
  const expected = getHandoffSharedKey()
  if (!headerValue || !expected) return false
  return headerValue === expected
}
