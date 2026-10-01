/**
 * Admin data backed by /api/admin (customers, users, audit logs).
 * Exposed through useSyncExternalStore so pages share one copy; mutations call the API
 * and then replace the affected rows with what the server returned.
 */

import { platformListAll, platformRequest } from '../../core/api/platformClient.js'

const EMPTY = {
  status: 'idle',
  error: null,
  customers: [],
  users: [],
  logs: [],
  moduleAssignments: [],
}

const listeners = new Set()
let snapshot = EMPTY

function setSnapshot(patch) {
  const next = { ...snapshot, ...patch }
  if (patch.customers) {
    next.moduleAssignments = patch.customers.map((customer) => ({
      customerId: customer.id,
      customerName: customer.name,
      moduleIds: customer.modulesEnabled,
    }))
  }
  snapshot = next
  listeners.forEach((listener) => listener())
}

function replaceById(rows, row) {
  return rows.some((item) => item.id === row.id)
    ? rows.map((item) => (item.id === row.id ? row : item))
    : [row, ...rows]
}

export function subscribeAdminStore(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getAdminSnapshot() {
  return snapshot
}

export function resetAdminStore() {
  setSnapshot(EMPTY)
}

async function fetchLogs() {
  const payload = await platformRequest('/api/admin/audit-logs', { query: { pageSize: 100 } })
  return payload.data
}

export async function loadAdminData() {
  setSnapshot({ status: 'loading', error: null })
  try {
    const [customers, users, logs] = await Promise.all([
      platformListAll('/api/admin/customers'),
      platformListAll('/api/admin/users'),
      fetchLogs(),
    ])
    setSnapshot({ status: 'ready', customers, users, logs })
  } catch (error) {
    setSnapshot({ status: 'error', error: error.message })
  }
}

function refreshLogs() {
  fetchLogs()
    .then((logs) => setSnapshot({ logs }))
    .catch(() => {})
}

export async function createCustomer(input) {
  const { data } = await platformRequest('/api/admin/customers', { method: 'POST', body: input })
  setSnapshot({ customers: replaceById(snapshot.customers, data) })
  refreshLogs()
  return data
}

export async function updateCustomer(customerId, patch) {
  const { data } = await platformRequest(`/api/admin/customers/${customerId}`, { method: 'PATCH', body: patch })
  setSnapshot({ customers: replaceById(snapshot.customers, data) })
  refreshLogs()
  return data
}

export async function assignCustomerModules(customerId, moduleIds) {
  const { data } = await platformRequest(`/api/admin/customers/${customerId}/modules`, {
    method: 'PUT',
    body: { moduleIds },
  })
  // The server also drops user grants outside the new contract.
  const users = await platformListAll('/api/admin/users')
  setSnapshot({ customers: replaceById(snapshot.customers, data), users })
  refreshLogs()
  return data
}

export async function createUser(input) {
  const { data } = await platformRequest('/api/admin/users', { method: 'POST', body: input })
  const customer = data.customerId
    ? (await platformRequest(`/api/admin/customers/${data.customerId}`)).data
    : null
  setSnapshot({
    users: replaceById(snapshot.users, data),
    ...(customer ? { customers: replaceById(snapshot.customers, customer) } : {}),
  })
  refreshLogs()
  return data
}

export async function updateUser(userId, patch) {
  const { data } = await platformRequest(`/api/admin/users/${userId}`, { method: 'PATCH', body: patch })
  setSnapshot({ users: replaceById(snapshot.users, data) })
  refreshLogs()
  return data
}

export async function assignUserModules(userId, moduleIds) {
  const { data } = await platformRequest(`/api/admin/users/${userId}/modules`, {
    method: 'PUT',
    body: { moduleIds },
  })
  setSnapshot({ users: replaceById(snapshot.users, data) })
  refreshLogs()
  return data
}
