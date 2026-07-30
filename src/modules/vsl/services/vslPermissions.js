export const VSL_PERMISSION_KEYS = [
  'vsl.campaigns',
  'vsl.configure',
  'vsl.metrics',
]

export function getVslPermissionsForUser(_user, hasModuleAccess = true) {
  if (!hasModuleAccess) return []
  return [...VSL_PERMISSION_KEYS]
}

export function hasVslPermission(permissions, key) {
  return Array.isArray(permissions) && permissions.includes(key)
}

export const VSL_PERMISSION_CATALOG = [
  {
    id: 'perm_vsl_001',
    key: 'vsl.campaigns',
    label: 'Ver campanhas VSL',
    description: 'Listar campanhas de Video Sales Letter.',
    scope: 'module',
  },
  {
    id: 'perm_vsl_002',
    key: 'vsl.configure',
    label: 'Configurar landing VSL',
    description: 'Editar página de oferta e CTAs.',
    scope: 'module',
  },
  {
    id: 'perm_vsl_003',
    key: 'vsl.metrics',
    label: 'Ver métricas VSL',
    description: 'Consultar conversão e engajamento de vídeo.',
    scope: 'module',
  },
]
