/**
 * Mock multi-client accounts.
 * Ready to be replaced by API: GET /customers
 */
export const customers = [
  {
    id: 'cus_001',
    name: 'Acelere Seu Crescimento',
    slug: 'acelere',
    plan: 'Enterprise',
    status: 'active',
    usersCount: 18,
    modulesEnabled: ['bdr', 'prospecting', 'webinar'],
    createdAt: '2025-11-12',
  },
  {
    id: 'cus_002',
    name: 'NovaRota Comercial',
    slug: 'novarota',
    plan: 'Growth',
    status: 'active',
    usersCount: 9,
    modulesEnabled: ['training-ai', 'prospecting'],
    createdAt: '2026-01-08',
  },
  {
    id: 'cus_003',
    name: 'Orbit Leads',
    slug: 'orbit',
    plan: 'Starter',
    status: 'trial',
    usersCount: 4,
    modulesEnabled: ['radar'],
    createdAt: '2026-06-21',
  },
  {
    id: 'cus_004',
    name: 'Pulse Digital',
    slug: 'pulse',
    plan: 'Enterprise',
    status: 'suspended',
    usersCount: 22,
    modulesEnabled: ['bdr', 'vsl', 'webinar', 'prospecting'],
    createdAt: '2025-08-03',
  },
]

export function getCustomerById(id) {
  return customers.find((customer) => customer.id === id) ?? null
}
