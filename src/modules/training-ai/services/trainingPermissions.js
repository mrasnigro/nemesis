export const TRAINING_PERMISSION_KEYS = [
  'training.view',
  'training.simulate',
  'training.report',
  'training.manage',
]

export function getTrainingPermissionsForUser(_user, hasModuleAccess = true) {
  if (!hasModuleAccess) return []
  return [...TRAINING_PERMISSION_KEYS]
}

export function hasTrainingPermission(permissions, key) {
  return Array.isArray(permissions) && permissions.includes(key)
}

export const TRAINING_PERMISSION_CATALOG = [
  {
    id: 'perm_training_001',
    key: 'training.view',
    label: 'Ver Treinamento IA',
    description: 'Acessar catálogo de cenários de treinamento.',
    scope: 'module',
  },
  {
    id: 'perm_training_002',
    key: 'training.simulate',
    label: 'Simular atendimento IA',
    description: 'Iniciar e conduzir simulações com IA.',
    scope: 'module',
  },
  {
    id: 'perm_training_003',
    key: 'training.report',
    label: 'Ver relatório de avaliação',
    description: 'Consultar score e feedback pós-simulação.',
    scope: 'module',
  },
  {
    id: 'perm_training_004',
    key: 'training.manage',
    label: 'Gerenciar personas',
    description: 'Criar e editar personas, cenários e templates de treinamento.',
    scope: 'module',
  },
]
