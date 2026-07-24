/**
 * Mock activity / audit logs.
 * Ready to be replaced by API: GET /logs
 */
export const activityLogs = [
  {
    id: 'log_001',
    action: 'module.assigned',
    summary: 'Módulo BDR atribuído ao cliente Acelere Seu Crescimento',
    actor: 'Ana Souza',
    customerId: 'cus_001',
    level: 'info',
    createdAt: '2026-07-24T19:12:00Z',
  },
  {
    id: 'log_002',
    action: 'user.invited',
    summary: 'Convite enviado para diego@orbit.com',
    actor: 'Administrador',
    customerId: 'cus_003',
    level: 'info',
    createdAt: '2026-07-24T16:40:00Z',
  },
  {
    id: 'log_003',
    action: 'integration.error',
    summary: 'Falha na sincronização do Webhook Outbound',
    actor: 'Sistema',
    customerId: 'cus_004',
    level: 'error',
    createdAt: '2026-07-24T15:05:00Z',
  },
  {
    id: 'log_004',
    action: 'customer.suspended',
    summary: 'Conta Pulse Digital marcada como suspensa',
    actor: 'Administrador',
    customerId: 'cus_004',
    level: 'warning',
    createdAt: '2026-07-23T10:18:00Z',
  },
  {
    id: 'log_005',
    action: 'permission.updated',
    summary: 'Papel imp atualizado com prospecting.use',
    actor: 'Ana Souza',
    customerId: 'cus_001',
    level: 'info',
    createdAt: '2026-07-22T21:30:00Z',
  },
  {
    id: 'log_006',
    action: 'user.login',
    summary: 'Bruno Lima acessou o workspace IMP',
    actor: 'Bruno Lima',
    customerId: 'cus_001',
    level: 'info',
    createdAt: '2026-07-24T18:05:00Z',
  },
]
