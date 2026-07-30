import { BDR_PERMISSION_KEYS } from '../data/catalogs.js'

/**
 * Prototype: any user with module `bdr` receives the full operate set.
 * Platform module gate remains ModuleAccessRoute.
 */
export function getBdrPermissionsForUser(_user, hasModuleAccess = true) {
  if (!hasModuleAccess) return []
  return [...BDR_PERMISSION_KEYS]
}

export function hasBdrPermission(permissions, key) {
  return Array.isArray(permissions) && permissions.includes(key)
}

export const BDR_PERMISSION_CATALOG = [
  {
    id: 'perm_bdr_001',
    key: 'bdr.operate',
    label: 'Operar discador BDR',
    description: 'Alterar status, discagem automática e manual.',
    scope: 'module',
  },
  {
    id: 'perm_bdr_002',
    key: 'bdr.campaigns.select',
    label: 'Selecionar campanhas BDR',
    description: 'Escolher campanha ativa no painel.',
    scope: 'module',
  },
  {
    id: 'perm_bdr_003',
    key: 'bdr.history.self',
    label: 'Histórico próprio BDR',
    description: 'Visualizar histórico de ligações do operador.',
    scope: 'module',
  },
  {
    id: 'perm_bdr_004',
    key: 'bdr.history.team',
    label: 'Histórico da equipe BDR',
    description: 'Visualizar histórico da equipe (supervisor).',
    scope: 'module',
  },
  {
    id: 'perm_bdr_005',
    key: 'bdr.schedule',
    label: 'Agendar reuniões BDR',
    description: 'Criar agendamentos a partir da ligação.',
    scope: 'module',
  },
  {
    id: 'perm_bdr_006',
    key: 'bdr.scripts.view',
    label: 'Scripts e questionamentos BDR',
    description: 'Acessar script de abordagem e objeções.',
    scope: 'module',
  },
]
