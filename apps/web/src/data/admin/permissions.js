import { BDR_PERMISSION_CATALOG } from '../../modules/bdr/services/bdrPermissions.js'
import { TRAINING_PERMISSION_CATALOG } from '../../modules/training-ai/services/trainingPermissions.js'
import { PROSPECTING_PERMISSION_CATALOG } from '../../modules/prospecting/services/prospectingPermissions.js'
import { RADAR_PERMISSION_CATALOG } from '../../modules/radar/services/radarPermissions.js'
import { WEBINAR_PERMISSION_CATALOG } from '../../modules/webinar/services/webinarPermissions.js'
import { VSL_PERMISSION_CATALOG } from '../../modules/vsl/services/vslPermissions.js'

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
  ...TRAINING_PERMISSION_CATALOG,
  ...BDR_PERMISSION_CATALOG,
  ...PROSPECTING_PERMISSION_CATALOG,
  ...RADAR_PERMISSION_CATALOG,
  ...WEBINAR_PERMISSION_CATALOG,
  ...VSL_PERMISSION_CATALOG,
]

export const rolePermissionMap = {
  admin: [
    'customers.read',
    'customers.manage',
    'users.manage',
    'modules.assign',
    'logs.read',
  ],
  imp: [
    'modules.access',
    'prospecting.use',
    'training.view',
    'training.simulate',
    'training.report',
    'bdr.operate',
    'bdr.campaigns.select',
    'bdr.history.self',
    'bdr.history.team',
    'bdr.schedule',
    'bdr.scripts.view',
    'prospecting.search',
    'prospecting.qualify',
    'prospecting.send_bdr',
    'radar.dashboard',
    'radar.analyze',
    'radar.insights',
    'webinar.manage',
    'webinar.participants',
    'webinar.metrics',
    'vsl.campaigns',
    'vsl.configure',
    'vsl.metrics',
  ],
}
