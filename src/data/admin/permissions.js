/**
 * Permission catalog for future RBAC / module access control.
 * Ready to be replaced by API: GET /permissions
 */
export const permissions = [
  {
    id: 'perm_001',
    key: 'customers.read',
    label: 'Visualizar clientes',
    description: 'Permite listar e consultar contas multi-cliente.',
    scope: 'admin',
  },
  {
    id: 'perm_002',
    key: 'customers.manage',
    label: 'Gerenciar clientes',
    description: 'Criar, editar e suspender contas de clientes.',
    scope: 'admin',
  },
  {
    id: 'perm_003',
    key: 'users.manage',
    label: 'Gerenciar usuários',
    description: 'Convidar, editar e desativar usuários da plataforma.',
    scope: 'admin',
  },
  {
    id: 'perm_004',
    key: 'modules.assign',
    label: 'Atribuir módulos',
    description: 'Controlar quais módulos cada cliente pode acessar.',
    scope: 'admin',
  },
  {
    id: 'perm_005',
    key: 'modules.access',
    label: 'Acessar módulos',
    description: 'Abrir módulos liberados no workspace IMP.',
    scope: 'imp',
  },
  {
    id: 'perm_006',
    key: 'integrations.manage',
    label: 'Gerenciar integrações',
    description: 'Conectar e configurar integrações externas.',
    scope: 'admin',
  },
  {
    id: 'perm_007',
    key: 'logs.read',
    label: 'Visualizar logs',
    description: 'Consultar trilha de auditoria da plataforma.',
    scope: 'admin',
  },
  {
    id: 'perm_008',
    key: 'prospecting.use',
    label: 'Usar Prospecção',
    description: 'Acesso operacional ao módulo de prospecção.',
    scope: 'module',
  },
]

export const rolePermissionMap = {
  admin: [
    'customers.read',
    'customers.manage',
    'users.manage',
    'modules.assign',
    'integrations.manage',
    'logs.read',
  ],
  imp: ['modules.access', 'prospecting.use'],
}
