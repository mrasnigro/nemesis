export const WEBINAR_PERMISSION_KEYS = [
  'webinar.manage',
  'webinar.participants',
  'webinar.metrics',
]

export function getWebinarPermissionsForUser(_user, hasModuleAccess = true) {
  if (!hasModuleAccess) return []
  return [...WEBINAR_PERMISSION_KEYS]
}

export function hasWebinarPermission(permissions, key) {
  return Array.isArray(permissions) && permissions.includes(key)
}

export const WEBINAR_PERMISSION_CATALOG = [
  {
    id: 'perm_webinar_001',
    key: 'webinar.manage',
    label: 'Gerenciar webinars',
    description: 'Criar e editar eventos de webinar.',
    scope: 'module',
  },
  {
    id: 'perm_webinar_002',
    key: 'webinar.participants',
    label: 'Ver participantes',
    description: 'Consultar lista de inscritos e presença.',
    scope: 'module',
  },
  {
    id: 'perm_webinar_003',
    key: 'webinar.metrics',
    label: 'Ver métricas de webinar',
    description: 'Acessar indicadores de presença e engajamento.',
    scope: 'module',
  },
]
