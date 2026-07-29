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
    modulesEnabled: ['training-ai', 'bdr', 'prospecting', 'webinar'],
    createdAt: '2025-11-12',
    metrics: {
      leads: 1284,
      campaigns: 24,
      conversionRate: 18.4,
      activeUsers: 12,
      contactsToday: 86,
    },
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
    metrics: {
      leads: 642,
      campaigns: 11,
      conversionRate: 12.1,
      activeUsers: 7,
      contactsToday: 34,
    },
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
    metrics: {
      leads: 128,
      campaigns: 3,
      conversionRate: 7.5,
      activeUsers: 2,
      contactsToday: 9,
    },
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
    metrics: {
      leads: 2104,
      campaigns: 31,
      conversionRate: 9.8,
      activeUsers: 0,
      contactsToday: 0,
    },
  },
]

export function getCustomerById(id) {
  return customers.find((customer) => customer.id === id) ?? null
}

export function getCustomerMetrics(customerId) {
  const customer = getCustomerById(customerId)
  return customer?.metrics ?? null
}
