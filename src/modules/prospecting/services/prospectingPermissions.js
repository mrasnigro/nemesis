export const PROSPECTING_PERMISSION_KEYS = [
  'prospecting.search',
  'prospecting.qualify',
  'prospecting.send_bdr',
]

export function getProspectingPermissionsForUser(_user, hasModuleAccess = true) {
  if (!hasModuleAccess) return []
  return [...PROSPECTING_PERMISSION_KEYS]
}

export function hasProspectingPermission(permissions, key) {
  return Array.isArray(permissions) && permissions.includes(key)
}

export const PROSPECTING_PERMISSION_CATALOG = [
  {
    id: 'perm_prospect_001',
    key: 'prospecting.search',
    label: 'Buscar empresas',
    description: 'Pesquisar e filtrar empresas para prospecção.',
    scope: 'module',
  },
  {
    id: 'perm_prospect_002',
    key: 'prospecting.qualify',
    label: 'Qualificar prospects',
    description: 'Preencher critérios de qualificação.',
    scope: 'module',
  },
  {
    id: 'perm_prospect_003',
    key: 'prospecting.send_bdr',
    label: 'Enviar para BDR',
    description: 'Encaminhar prospects qualificados ao discador BDR.',
    scope: 'module',
  },
]
