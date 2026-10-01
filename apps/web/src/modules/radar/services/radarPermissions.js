export const RADAR_PERMISSION_KEYS = [
  'radar.dashboard',
  'radar.analyze',
  'radar.insights',
]

export function getRadarPermissionsForUser(_user, hasModuleAccess = true) {
  if (!hasModuleAccess) return []
  return [...RADAR_PERMISSION_KEYS]
}

export function hasRadarPermission(permissions, key) {
  return Array.isArray(permissions) && permissions.includes(key)
}

export const RADAR_PERMISSION_CATALOG = [
  {
    id: 'perm_radar_001',
    key: 'radar.dashboard',
    label: 'Ver dashboard Radar',
    description: 'Acessar painel de tendências.',
    scope: 'module',
  },
  {
    id: 'perm_radar_002',
    key: 'radar.analyze',
    label: 'Rodar análise de mercado',
    description: 'Disparar análises simuladas por segmento.',
    scope: 'module',
  },
  {
    id: 'perm_radar_003',
    key: 'radar.insights',
    label: 'Abrir insights',
    description: 'Consultar detalhes de sinais e tendências.',
    scope: 'module',
  },
]
