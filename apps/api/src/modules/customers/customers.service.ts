import type { ModuleId } from '@imp/shared'
import { ulid } from 'ulid'
import { withTransaction } from '../../core/db.js'
import { AppError } from '../../core/errors.js'
import { pageMeta } from '../../core/list.js'
import type { AuthUser } from '../../types/express.js'
import { recordAudit } from '../audit/audit.repository.js'
import { managedCustomerId } from '../auth/auth.middleware.js'
import {
  getCustomer,
  insertCustomer,
  listCustomers,
  replaceCustomerModules,
  slugExists,
  updateCustomer,
  type Customer,
} from './customers.repository.js'
import type { CustomerCreate, CustomerListQuery, CustomerUpdate } from './customers.schemas.js'

type Actor = { user: AuthUser; ip?: string }

const STATUS_LABEL = { active: 'ativa', trial: 'em teste', suspended: 'suspensa' } as const

export async function listCustomersFor(user: AuthUser, query: CustomerListQuery) {
  const { rows, total } = await listCustomers(managedCustomerId(user), query)
  return { data: rows, page: pageMeta(query.page, query.pageSize, total) }
}

export async function getCustomerFor(user: AuthUser, id: string): Promise<Customer> {
  const scope = managedCustomerId(user)
  const customer = scope && scope !== id ? null : await getCustomer(id)
  if (!customer) throw new AppError(404, 'NOT_FOUND', 'Customer not found')
  return customer
}

export async function createCustomer({ user, ip }: Actor, input: CustomerCreate): Promise<Customer> {
  const id = ulid()
  const slug = await uniqueSlug(input.name)
  await withTransaction(async (conn) => {
    await insertCustomer(conn, { id, name: input.name, slug, plan: input.plan, status: input.status })
    await replaceCustomerModules(conn, id, input.moduleIds)
  })
  await recordAudit({
    actor: user,
    customerId: id,
    action: 'customer.created',
    entityType: 'customer',
    entityId: id,
    summary: `Cliente ${input.name} criado`,
    data: { plan: input.plan, status: input.status, moduleIds: input.moduleIds },
    ip,
  })
  return (await getCustomer(id))!
}

export async function updateCustomerFor(actor: Actor, id: string, patch: CustomerUpdate): Promise<Customer> {
  const before = await getCustomerFor(actor.user, id)
  await updateCustomer(id, patch)
  const statusChanged = patch.status && patch.status !== before.status
  await recordAudit({
    actor: actor.user,
    customerId: id,
    action: statusChanged ? `customer.${patch.status}` : 'customer.updated',
    entityType: 'customer',
    entityId: id,
    summary: statusChanged
      ? `Conta ${before.name} marcada como ${STATUS_LABEL[patch.status!]}`
      : `Cliente ${patch.name ?? before.name} atualizado`,
    level: patch.status === 'suspended' ? 'warning' : 'info',
    data: patch,
    ip: actor.ip,
  })
  return (await getCustomer(id))!
}

export async function assignCustomerModules(actor: Actor, id: string, moduleIds: ModuleId[]): Promise<Customer> {
  const before = await getCustomerFor(actor.user, id)
  await withTransaction((conn) => replaceCustomerModules(conn, id, moduleIds))
  await recordAudit({
    actor: actor.user,
    customerId: id,
    action: 'customer.modules.updated',
    entityType: 'customer',
    entityId: id,
    summary: `Módulos atualizados para ${before.name}`,
    data: { before: before.modulesEnabled, after: moduleIds },
    ip: actor.ip,
  })
  return (await getCustomer(id))!
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || 'cliente'
  )
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name)
  for (let suffix = 1; suffix < 100; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`
    if (!(await slugExists(candidate))) return candidate
  }
  return `${base}-${ulid().slice(-6).toLowerCase()}`
}
