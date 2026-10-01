import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../../core/config.js'
import { AppError } from '../../core/errors.js'
import type { AuthUser } from '../../types/express.js'
import { findUserById, findUserByUsername } from './auth.repository.js'

const COOKIE = 'imp_session'

export function sessionCookieName() {
  return COOKIE
}

export async function login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const found = await findUserByUsername(username.trim().toLowerCase())
  if (!found || !(await bcrypt.compare(password, found.passwordHash))) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid username or password')
  }
  const { passwordHash: _passwordHash, ...user } = found
  return { token: sign(user), user }
}

export async function userFromToken(token: string): Promise<AuthUser> {
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as { sub?: string }
    if (!payload.sub) throw new Error('missing sub')
    const user = await findUserById(payload.sub)
    if (!user) throw new Error('missing user')
    return user
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid session')
  }
}

export async function userFromDevHeader(username: string | undefined): Promise<AuthUser> {
  if (!config.allowDevAuth || !username) {
    throw new AppError(401, 'UNAUTHORIZED', 'Missing session')
  }
  const found = await findUserByUsername(username.trim().toLowerCase())
  if (!found) throw new AppError(401, 'UNAUTHORIZED', 'Unknown dev user')
  const { passwordHash: _passwordHash, ...user } = found
  return user
}

function sign(user: AuthUser): string {
  return jwt.sign({ sub: user.id, role: user.role }, config.JWT_SECRET, { expiresIn: '8h' })
}
