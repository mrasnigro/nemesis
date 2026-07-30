/**
 * Central registry for IMP Platform modules.
 * Add new modules here to surface them on the Module Launcher and routes.
 */
export const modules = [
  {
    id: 'training-ai',
    title: 'Treinamento IA',
    description: 'Capacitação e simulações com inteligência artificial.',
    path: '/modules/training-ai',
    status: 'available',
    accent: 'amber',
    badge: 'IA',
    icon: 'sparkles',
    actionLabel: 'Iniciar treinamento',
    features: [
      'Seleção de cenários de capacitação',
      'Simulação de atendimento com IA',
      'Relatório de avaliação e score',
      'Histórico de evolução na sessão',
    ],
    info: {
      category: 'Capacitação',
      version: '1.0.0',
      access: 'Usuário IMP',
      owner: 'Time de Enablement',
    },
  },
  {
    id: 'bdr',
    title: 'Discagem Automática',
    description: 'Discador BDR com campanhas, filas e ações rápidas.',
    path: '/modules/bdr',
    status: 'available',
    accent: 'amber',
    badge: 'BDR',
    icon: 'phone',
    actionLabel: 'Abrir discador',
    features: [
      'Painel operacional do discador',
      'Discagem automática e ligação manual',
      'Histórico de chamadas',
      'Agendamentos realizados',
    ],
    info: {
      category: 'Outbound',
      version: '1.0.0',
      access: 'Usuário IMP',
      owner: 'Time Comercial',
    },
  },
  {
    id: 'prospecting',
    title: 'Prospecção',
    description: 'Ferramentas de prospecção e organização de contatos.',
    path: '/modules/prospecting',
    status: 'available',
    accent: 'amber',
    badge: 'PRO',
    icon: 'funnel',
    actionLabel: 'Abrir prospecção',
    features: [
      'Busca simulada de empresas',
      'Qualificação com critérios padronizados',
      'Envio de prospects para o BDR',
      'Fila e histórico de handoff',
    ],
    info: {
      category: 'Prospecção',
      version: '1.0.0',
      access: 'Usuário IMP',
      owner: 'Time Comercial',
    },
  },
  {
    id: 'webinar',
    title: 'Webinar',
    description: 'Gestão e transmissão de webinars ao vivo.',
    path: '/modules/webinar',
    status: 'available',
    accent: 'amber',
    badge: 'Live',
    icon: 'live',
    actionLabel: 'Abrir webinars',
    features: [
      'Gestão de eventos e publicação',
      'Controle de participantes e presença',
      'Métricas de attendance',
      'Handoff para BDR e Prospecção',
    ],
    info: {
      category: 'Eventos',
      version: '1.0.0',
      access: 'Usuário IMP',
      owner: 'Time de Marketing',
    },
  },
  {
    id: 'radar',
    title: 'Radar de Tendências',
    description: 'Monitoramento de sinais e tendências de mercado.',
    path: '/modules/radar',
    status: 'available',
    accent: 'amber',
    badge: 'Radar',
    icon: 'radar',
    actionLabel: 'Abrir radar',
    features: [
      'Dashboard de tendências e momentum',
      'Análise de mercado por segmento',
      'Detalhe de insights acionáveis',
      'Recomendações para o time comercial',
    ],
    info: {
      category: 'Intelligence',
      version: '1.0.0',
      access: 'Usuário IMP',
      owner: 'Time de Inteligência',
    },
  },
  {
    id: 'vsl',
    title: 'VSL',
    description: 'Video Sales Letters e páginas de oferta.',
    path: '/modules/vsl',
    status: 'available',
    accent: 'amber',
    badge: 'VSL',
    icon: 'play',
    actionLabel: 'Abrir VSL',
    features: [
      'Campanhas de Video Sales Letter',
      'Configuração de landing e CTA',
      'Métricas de conversão do vídeo',
      'Preview da página de oferta',
    ],
    info: {
      category: 'Conteúdo',
      version: '1.0.0',
      access: 'Usuário IMP',
      owner: 'Time de Performance',
    },
  },
]

export function getModuleById(id) {
  return modules.find((module) => module.id === id) ?? null
}

export function getModuleByPath(path) {
  return modules.find((module) => module.path === path) ?? null
}
