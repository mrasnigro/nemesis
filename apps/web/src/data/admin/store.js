/**
 * In-memory admin store for the client demo flow.
 * Mutates shared mock arrays and notifies subscribers (useSyncExternalStore).
 * Replace with real API calls later without changing page UI contracts.
 */

import { customers } from './customers'
import { users } from './users'
import { moduleAssignments } from './modules'
import { activityLogs } from './logs'

const listeners = new Set()
let snapshot = null
let version = 0

function buildSnapshot() {
  return {
    customers: customers.map((customer) => ({
      ...customer,
      modulesEnabled: [...customer.modulesEnabled],
      metrics: customer.metrics ? { ...customer.metrics } : null,
    })),
    users: users.map((user) => ({
      ...user,
      permissions: [...user.permissions],
      assignedModules: [...(user.assignedModules ?? [])],
    })),
    moduleAssignments: moduleAssignments.map((item) => ({
      ...item,
      moduleIds: [...item.moduleIds],
    })),
    version,
  }
}

function emit() {
  version += 1
  snapshot = buildSnapshot()
  listeners.forEach((listener) => listener())
}

export function subscribeAdminStore(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAdminSnapshot() {
  if (!snapshot) {
    snapshot = buildSnapshot()
  }
  return snapshot
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function pushLog({ action, summary, customerId, level = 'info', actor = 'Administrador' }) {
  activityLogs.unshift({
    id: `log_${Date.now()}`,
    action,
    summary,
    actor,
    customerId,
    level,
    createdAt: new Date().toISOString(),
  })
}

export function createCustomer({ name, plan = 'Starter', status = 'trial', moduleIds = [] }) {
  const id = `cus_${String(customers.length + 1).padStart(3, '0')}_${Date.now().toString().slice(-4)}`
  const customer = {
    id,
    name: name.trim(),
    slug: slugify(name),
    plan,
    status,
    usersCount: 0,
    modulesEnabled: [...moduleIds],
    createdAt: today(),
    metrics: {
      leads: 0,
      campaigns: 0,
      conversionRate: 0,
      activeUsers: 0,
      contactsToday: 0,
    },
  }

  customers.unshift(customer)
  moduleAssignments.unshift({
    customerId: id,
    customerName: customer.name,
    moduleIds: [...moduleIds],
  })

  pushLog({
    action: 'customer.created',
    summary: `Cliente ${customer.name} criado`,
    customerId: id,
  })

  emit()
  return customer
}

export function assignCustomerModules(customerId, moduleIds) {
  const customer = customers.find((item) => item.id === customerId)
  const assignment = moduleAssignments.find((item) => item.customerId === customerId)

  if (customer) {
    customer.modulesEnabled = [...moduleIds]
  }

  if (assignment) {
    assignment.moduleIds = [...moduleIds]
  } else if (customer) {
    moduleAssignments.push({
      customerId,
      customerName: customer.name,
      moduleIds: [...moduleIds],
    })
  }

  // Keep user grants within customer envelope
  users.forEach((user) => {
    if (user.customerId !== customerId) return
    user.assignedModules = (user.assignedModules || []).filter((id) => moduleIds.includes(id))
  })

  pushLog({
    action: 'module.assigned',
    summary: `Módulos atualizados para ${customer?.name ?? customerId}`,
    customerId,
  })

  emit()
  return customer
}

export function createUser({
  name,
  email,
  role = 'imp',
  customerId,
  assignedModules = [],
  status = 'invited',
}) {
  const customer = customers.find((item) => item.id === customerId)
  if (!customer) {
    throw new Error('Cliente não encontrado')
  }

  const allowed = new Set(customer.modulesEnabled)
  const modules = assignedModules.filter((id) => allowed.has(id))

  const user = {
    id: `usr_${String(users.length + 1).padStart(3, '0')}_${Date.now().toString().slice(-4)}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role,
    customerId,
    status,
    permissions:
      role === 'admin'
        ? ['customers.read', 'users.manage', 'modules.assign']
        : ['modules.access'],
    assignedModules: modules,
    lastLoginAt: null,
  }

  users.unshift(user)
  customer.usersCount = users.filter((item) => item.customerId === customerId).length

  if (customer.metrics) {
    customer.metrics.activeUsers = users.filter(
      (item) => item.customerId === customerId && item.status === 'active'
    ).length
  }

  pushLog({
    action: 'user.created',
    summary: `Usuário ${user.email} criado em ${customer.name}`,
    customerId,
  })

  emit()
  return user
}

export function assignUserModules(userId, moduleIds) {
  const user = users.find((item) => item.id === userId)
  if (!user) return null

  const customer = customers.find((item) => item.id === user.customerId)
  const allowed = new Set(customer?.modulesEnabled ?? [])
  user.assignedModules = moduleIds.filter((id) => allowed.has(id))

  pushLog({
    action: 'user.modules.updated',
    summary: `Módulos do usuário ${user.name} atualizados`,
    customerId: user.customerId,
  })

  emit()
  return user
}
