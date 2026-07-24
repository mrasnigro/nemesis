/**
 * Mock third-party integrations per customer.
 * Ready to be replaced by API: GET /integrations
 */
export const integrations = [
  {
    id: 'int_001',
    name: 'IMP BDR System',
    provider: 'Acelere',
    type: 'dialer',
    status: 'connected',
    customerId: 'cus_001',
    lastSyncAt: '2026-07-24T19:10:00Z',
  },
  {
    id: 'int_002',
    name: 'WhatsApp Business',
    provider: 'Meta',
    type: 'messaging',
    status: 'connected',
    customerId: 'cus_001',
    lastSyncAt: '2026-07-24T17:45:00Z',
  },
  {
    id: 'int_003',
    name: 'Google Sheets Leads',
    provider: 'Google',
    type: 'data',
    status: 'pending',
    customerId: 'cus_002',
    lastSyncAt: null,
  },
  {
    id: 'int_004',
    name: 'Webhook Outbound',
    provider: 'Custom',
    type: 'webhook',
    status: 'error',
    customerId: 'cus_004',
    lastSyncAt: '2026-07-20T08:02:00Z',
  },
  {
    id: 'int_005',
    name: 'Radar Feed API',
    provider: 'IMP',
    type: 'data',
    status: 'connected',
    customerId: 'cus_003',
    lastSyncAt: '2026-07-24T12:00:00Z',
  },
]
