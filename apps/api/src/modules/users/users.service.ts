import type { ModuleId } from '@imp/shared'
import bcrypt from 'bcryptjs'
import { ulid } from 'ulid'
import { isDuplicateKeyError, withTransaction } from '../../core/db.js'
import { AppError } from '../../core/errors.js'
import { pageMeta } from '../../core/list.js'
import type { AuthUser } from '../../types/express.js'
import { recordAudit } from '../audit/audit.repository.js'
import { managedCustomerId } from '../auth/auth.middleware.js'
import { getCustomer } from '../customers/customers.repository.js'
import { getUser, insertUser, listUsers, replaceUserModules, updateUser, type ManagedUser } from './users.repository.js'
import type { UserCreate, UserListQuery, UserUpdate } from './users.schemas.js'

type Actor = { user: AuthUser; ip?: string }

const BCRYPT_ROUNDS = 12

export async function listUsersFor(user: AuthUser, query: UserListQuery) {
  const { rows, total } = await listUsers(managedCustomerId(user), query)
  return { data: rows, page: pageMeta(query.page, query.pageSize, total) }
}

export async function getUserFor(user: AuthUser, id: string): Promise<ManagedUser> {
  const target = await getUser(id)
  const scope = managedCustomerId(user)
  if (!target || (scope && target.customerId !== scope)) {
    throw new AppError(404, 'NOT_FOUND', 'User not found')
  }
  return target
}

export async function createUser({ user, ip }: Actor, input: UserCreate): Promise<ManagedUser> {
  const scope = managedCustomerId(user)
  if (scope && (input.role !== 'imp' || (input.customerId && input.customerId !== scope))) {
    throw new AppError(403, 'FORBIDDEN', 'You can only create users for your own customer')
  }

  const isPlatformUser = input.role === 'admin'
  const customerId = isPlatformUser ? null : (scope ?? input.customerId)
  if (!isPlatformUser && !customerId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', [
      { path: 'customerId', message: 'Customer users need a customer' },
    ])
  }
  let moduleIds: ModuleId[] = []
  if (customerId) {
    const customer = await getCustomer(customerId)
    if (!customer) throw new AppError(404, 'NOT_FOUND', 'Customer not found')
    assertWithinContract(input.moduleIds, customer.modulesEnabled)
    moduleIds = input.moduleIds
  }

  const id = ulid()
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)
  try {
    await withTransaction(async (conn) => {
      await insertUser(conn, {
        id,
        customerId,
        username: input.username,
        name: input.name,
        email: input.email,
        role: input.role,
        profile: isPlatformUser ? null : input.profile,
        status: input.status,
        passwordHash,
      })
      await replaceUserModules(conn, id, moduleIds)
    })
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const field = error.message.includes('uq_users_email') ? 'email' : 'username'
      throw new AppError(409, 'CONFLICT', `This ${field} is already in use`, [
        { path: field, message: 'Already in use' },
      ])
    }
    throw error
  }

  await recordAudit({
    actor: user,
    customerId,
    action: 'user.created',
    entityType: 'user',
    entityId: id,
    summary: `Usuário ${input.username} criado`,
    data: { role: input.role, profile: input.profile, moduleIds },
    ip,
  })
  return (await getUser(id))!
}

export async function updateUserFor(actor: Actor, id: string, patch: UserUpdate): Promise<ManagedUser> {
  const target = await getUserFor(actor.user, id)
  if (target.id === actor.user.id && patch.status && patch.status !== 'active') {
    throw new AppError(400, 'VALIDATION_ERROR', 'You cannot deactivate your own account')
  }
  if (target.role === 'admin' && patch.profile) {
    throw new AppError(400, 'VALIDATION_ERROR', 'IMP administrators have no customer profile')
  }

  const { password, ...fields } = patch
  const revokeSessions = Boolean(password) || patch.status === 'inactive'
  try {
    await updateUser(
      id,
      { ...fields, ...(password ? { passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) } : {}) },
      revokeSessions,
    )
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(409, 'CONFLICT', 'This email is already in use', [{ path: 'email', message: 'Already in use' }])
    }
    throw error
  }

  await recordAudit({
    actor: actor.user,
    customerId: target.customerId,
    action: patch.status === 'inactive' ? 'user.deactivated' : password ? 'user.password.reset' : 'user.updated',
    entityType: 'user',
    entityId: id,
    summary: `Usuário ${target.username} atualizado`,
    level: patch.status === 'inactive' ? 'warning' : 'info',
    data: { ...fields, passwordChanged: Boolean(password) },
    ip: actor.ip,
  })
  return (await getUser(id))!
}

export async function assignUserModules(actor: Actor, id: string, moduleIds: ModuleId[]): Promise<ManagedUser> {
  const target = await getUserFor(actor.user, id)
  if (!target.customerId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'IMP administrators do not receive module grants')
  }
  const customer = await getCustomer(target.customerId)
  if (!customer) throw new AppError(404, 'NOT_FOUND', 'Customer not found')
  assertWithinContract(moduleIds, customer.modulesEnabled)

  await withTransaction((conn) => replaceUserModules(conn, id, moduleIds))
  await recordAudit({
    actor: actor.user,
    customerId: target.customerId,
    action: 'user.modules.updated',
    entityType: 'user',
    entityId: id,
    summary: `Módulos do usuário ${target.name} atualizados`,
    data: { before: target.assignedModules, after: moduleIds },
    ip: actor.ip,
  })
  return (await getUser(id))!
}

function assertWithinContract(moduleIds: ModuleId[], contracted: ModuleId[]) {
  const outside = moduleIds.filter((moduleId) => !contracted.includes(moduleId))
  if (outside.length > 0) {
    throw new AppError(
      400,
      'MODULE_NOT_CONTRACTED',
      'The customer has not contracted these modules',
      outside.map((moduleId) => ({ path: 'moduleIds', message: moduleId })),
    )
  }
}
