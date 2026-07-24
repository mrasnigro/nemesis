/**
 * Mock platform users linked to customer accounts.
 * Ready to be replaced by API: GET /users
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
    lastLoginAt: '2026-07-24T14:22:00Z',
  },
  {
    id: 'usr_002',
    name: 'Bruno Lima',
    email: 'bruno@acelere.com',
    role: 'imp',
    customerId: 'cus_001',
    status: 'active',
    permissions: ['modules.access', 'leads.read'],
    lastLoginAt: '2026-07-24T18:05:00Z',
  },
  {
    id: 'usr_003',
    name: 'Carla Mendes',
    email: 'carla@novarota.com',
    role: 'imp',
    customerId: 'cus_002',
    status: 'active',
    permissions: ['modules.access', 'training.use'],
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
    lastLoginAt: '2026-06-02T09:12:00Z',
  },
  {
    id: 'usr_006',
    name: 'Felipe Rocha',
    email: 'felipe@novarota.com',
    role: 'imp',
    customerId: 'cus_002',
    status: 'active',
    permissions: ['modules.access', 'prospecting.use'],
    lastLoginAt: '2026-07-22T16:33:00Z',
  },
]

export function getUsersByCustomer(customerId) {
  return users.filter((user) => user.customerId === customerId)
}
