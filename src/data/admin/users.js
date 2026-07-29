/**
 * Mock platform users linked to customer accounts.
 * Ready to be replaced by API: GET /users
 *
 * assignedModules is the user-level grant (subset of customer modules).
 */
export const users = [
  {
    id: 'usr_001',
    name: 'Ana Souza',
    email: 'ana@acelere.com',
    role: 'admin',
    customerId: 'cus_001',
    status: 'active',
    permissions: ['customers.read', 'users.manage', 'modules.assign'],
    assignedModules: [],
    lastLoginAt: '2026-07-24T14:22:00Z',
  },
  {
    id: 'usr_006',
    name: 'Felipe Rocha',
    email: 'felipe@novarota.com',
    role: 'imp',
    customerId: 'cus_002',
    status: 'active',
    permissions: ['modules.access', 'prospecting.use'],
    assignedModules: ['training-ai', 'prospecting'],
    lastLoginAt: '2026-07-22T16:33:00Z',
    profile: 'sdr',
  },
  {
    id: 'usr_002',
    name: 'Bruno Lima',
    email: 'bruno@acelere.com',
    role: 'imp',
    customerId: 'cus_001',
    status: 'active',
    permissions: ['modules.access'],
    assignedModules: ['bdr', 'prospecting'],
    lastLoginAt: '2026-07-24T18:05:00Z',
    profile: 'bdr',
  },
  {
    id: 'usr_003',
    name: 'Carla Mendes',
    email: 'carla@novarota.com',
    role: 'imp',
    customerId: 'cus_002',
    status: 'active',
    permissions: ['modules.access', 'training.use'],
    assignedModules: ['training-ai'],
    lastLoginAt: '2026-07-23T11:40:00Z',
  },
  {
    id: 'usr_004',
    name: 'Diego Alves',
    email: 'diego@orbit.com',
    role: 'imp',
    customerId: 'cus_003',
    status: 'invited',
    permissions: ['modules.access'],
    assignedModules: ['radar'],
    lastLoginAt: null,
  },
  {
    id: 'usr_005',
    name: 'Elena Costa',
    email: 'elena@pulse.com',
    role: 'admin',
    customerId: 'cus_004',
    status: 'inactive',
    permissions: ['customers.read', 'users.manage'],
    assignedModules: [],
    lastLoginAt: '2026-06-02T09:12:00Z',
  },
]

export function getUsersByCustomer(customerId) {
  return users.filter((user) => user.customerId === customerId)
}

export function getUserById(id) {
  return users.find((user) => user.id === id) ?? null
}
