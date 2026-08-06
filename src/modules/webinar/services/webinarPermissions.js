/**
 * IMP admin permission catalog for the Webinar module (launcher).
 * Domain permissions remain coarse until SSO/handoff maps them to the sidecar.
 */

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
    description: 'Abrir e operar o serviço Webinar (sidecar) quando integrado.',
    scope: 'module',
  },
  {
    id: 'perm_webinar_002',
    key: 'webinar.participants',
    label: 'Ver participantes',
    description: 'Acesso futuro a dados de participantes via integração.',
    scope: 'module',
  },
  {
    id: 'perm_webinar_003',
    key: 'webinar.metrics',
    label: 'Ver métricas de webinar',
    description: 'Acesso futuro a métricas via integração.',
    scope: 'module',
  },
]
