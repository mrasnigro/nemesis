import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../../core/config.js'
import { AppError } from '../../core/errors.js'
import type { AuthUser } from '../../types/express.js'
import { recordAudit } from '../audit/audit.repository.js'
import { findSessionUserById, findSessionUserByUsername, markLoggedIn, type SessionUser } from './auth.repository.js'

const COOKIE = 'imp_session'
export const SESSION_TTL_SECONDS = 8 * 60 * 60

/** Compared against when the username does not exist, so both paths cost one bcrypt check. */
const DUMMY_HASH = bcrypt.hashSync('imp-timing-guard', 10)

export function sessionCookieName() {
  return COOKIE
}

export async function login(
  username: string,
  password: string,
  ip: string | undefined,
): Promise<{ token: string; user: AuthUser }> {
  const found = await findSessionUserByUsername(username.trim().toLowerCase())
  const passwordOk = await bcrypt.compare(password, found?.passwordHash ?? DUMMY_HASH)
  if (!found || !passwordOk) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid username or password')
  }
  assertCanSignIn(found)
  await markLoggedIn(found.id)
  await recordAudit({
    actor: found,
    customerId: found.customerId,
    action: 'user.login',
    entityType: 'user',
    entityId: found.id,
    summary: `${found.name} entrou na plataforma`,
    ip,
  })
  return { token: sign(found), user: toAuthUser(found) }
}

export async function userFromToken(token: string): Promise<AuthUser> {
  let payload: { sub?: string; sv?: number }
  try {
    payload = jwt.verify(token, config.JWT_SECRET) as { sub?: string; sv?: number }
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid session')
  }
  const user = payload.sub ? await findSessionUserById(payload.sub) : null
  if (!user || user.sessionVersion !== payload.sv) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid session')
  }
  assertCanSignIn(user)
  return toAuthUser(user)
}

export async function userFromDevHeader(username: string | undefined): Promise<AuthUser> {
  if (!config.allowDevAuth || !username) {
    throw new AppError(401, 'UNAUTHORIZED', 'Missing session')
  }
  const found = await findSessionUserByUsername(username.trim().toLowerCase())
  if (!found) throw new AppError(401, 'UNAUTHORIZED', 'Unknown dev user')
  assertCanSignIn(found)
  return toAuthUser(found)
}

function assertCanSignIn(user: SessionUser) {
  if (user.status === 'inactive') {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'This account is disabled')
  }
  if (user.role === 'imp') {
    if (!user.customerId || !user.customerStatus) {
      throw new AppError(403, 'ACCOUNT_DISABLED', 'This account is not linked to an active customer')
    }
    if (user.customerStatus === 'suspended') {
      throw new AppError(403, 'CUSTOMER_SUSPENDED', 'This customer account is suspended')
    }
  }
}

function toAuthUser(user: SessionUser): AuthUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    profile: user.profile,
    customerId: user.customerId,
    customerName: user.customerName,
    modules: user.modules,
  }
}

function sign(user: SessionUser): string {
  return jwt.sign({ sub: user.id, sv: user.sessionVersion }, config.JWT_SECRET, {
    expiresIn: SESSION_TTL_SECONDS,
  })
}
