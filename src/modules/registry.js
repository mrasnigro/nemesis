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
    status: 'coming-soon',
    accent: 'amber',
    badge: 'IA',
    icon: 'sparkles',
    actionLabel: 'Iniciar treinamento',
    features: [
      'Simulações de atendimento com feedback em tempo real',
      'Trilhas de capacitação personalizadas por perfil',
      'Score de desempenho e histórico de evolução',
      'Biblioteca de cenários comerciais prontos',
    ],
    info: {
      category: 'Capacitação',
      version: '0.9.0',
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
    status: 'coming-soon',
    accent: 'amber',
    badge: 'PRO',
    icon: 'funnel',
    actionLabel: 'Abrir prospecção',
    features: [
      'Listas de contatos e listas de trabalho',
      'Qualificação com critérios padronizados',
      'Alertas de follow-up e prioridades',
      'Visão consolidada de atividades',
    ],
    info: {
      category: 'Prospecção',
      version: '0.9.0',
      access: 'Usuário IMP',
      owner: 'Time Comercial',
    },
  },
  {
    id: 'webinar',
    title: 'Webinar',
    description: 'Gestão e transmissão de webinars ao vivo.',
    path: '/modules/webinar',
    status: 'coming-soon',
    accent: 'amber',
    badge: 'Live',
    icon: 'live',
    actionLabel: 'Abrir webinars',
    features: [
      'Criação e agendamento de webinars',
      'Controle de presença e engajamento',
      'Páginas de inscrição e lembretes',
      'Relatórios pós-evento',
    ],
    info: {
      category: 'Eventos',
      version: '0.9.0',
      access: 'Usuário IMP',
      owner: 'Time de Marketing',
    },
  },
  {
    id: 'radar',
    title: 'Radar de Tendências',
    description: 'Monitoramento de sinais e tendências de mercado.',
    path: '/modules/radar',
    status: 'coming-soon',
    accent: 'amber',
    badge: 'Radar',
    icon: 'radar',
    actionLabel: 'Abrir radar',
    features: [
      'Monitoramento contínuo de sinais de mercado',
      'Alertas de tendências relevantes por segmento',
      'Painéis de inteligência competitiva',
      'Exportação de insights para o time',
    ],
    info: {
      category: 'Intelligence',
      version: '0.9.0',
      access: 'Usuário IMP',
      owner: 'Time de Inteligência',
    },
  },
  {
    id: 'vsl',
    title: 'VSL',
    description: 'Video Sales Letters e páginas de oferta.',
    path: '/modules/vsl',
    status: 'coming-soon',
    accent: 'amber',
    badge: 'VSL',
    icon: 'play',
    actionLabel: 'Abrir VSL',
    features: [
      'Biblioteca de VSLs e variações de oferta',
      'Páginas de oferta otimizadas',
      'Tracking de engajamento e CTA',
      'Testes A/B de criativos e scripts',
    ],
    info: {
      category: 'Conteúdo',
      version: '0.9.0',
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
