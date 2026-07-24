/**
 * Central registry for IMP Platform modules.
 * Add new modules here to surface them on the dashboard and routes.
 */
export const modules = [
  {
    id: 'training-ai',
    title: 'Treinamento IA',
    description: 'Capacitação e simulações com inteligência artificial.',
    path: '/modules/training-ai',
    status: 'coming-soon',
    accent: 'cyan',
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
    description: 'Campanhas de contato automatizado e follow-up.',
    path: '/modules/bdr',
    status: 'available',
    accent: 'blue',
    badge: 'BDR',
    icon: 'phone',
    actionLabel: 'Acessar Sistema BDR',
    /** Existing IMP BDR system — opened in a new browser tab */
    externalUrl: import.meta.env.VITE_IMP_BDR_URL || 'https://acelereseucrescimento.com.br/',
    features: [
      'Filas de discagem com priorização inteligente',
      'Scripts guiados para BDR e follow-up',
      'Registro automático de tentativas de contato',
      'Integração com pipeline comercial',
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
    description: 'Pipeline de leads e oportunidades comerciais.',
    path: '/modules/prospecting',
    status: 'coming-soon',
    accent: 'violet',
    badge: 'CRM',
    icon: 'funnel',
    actionLabel: 'Abrir pipeline',
    features: [
      'Kanban de oportunidades por estágio',
      'Qualificação de leads com critérios padronizados',
      'Alertas de follow-up e SLA comercial',
      'Visão consolidada de conversão',
    ],
    info: {
      category: 'Pipeline',
      version: '0.9.0',
      access: 'Usuário IMP',
      owner: 'Time Comercial',
    },
  },
  {
    id: 'radar',
    title: 'Radar de Tendências',
    description: 'Monitoramento de sinais e tendências de mercado.',
    path: '/modules/radar',
    status: 'coming-soon',
    accent: 'emerald',
    badge: 'Radar',
    icon: 'radar',
    actionLabel: 'Abrir radar',
    features: [
      'Monitoramento contínuo de sinais de mercado',
      'Alertas de tendências relevantes por segmento',
      'Painéis de inteligência competitiva',
      'Exportação de insights para o time comercial',
    ],
    info: {
      category: 'Intelligence',
      version: '0.9.0',
      access: 'Usuário IMP',
      owner: 'Time de Inteligência',
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
    id: 'vsl',
    title: 'VSL',
    description: 'Video Sales Letters e páginas de conversão.',
    path: '/modules/vsl',
    status: 'coming-soon',
    accent: 'rose',
    badge: 'VSL',
    icon: 'play',
    actionLabel: 'Abrir VSL',
    features: [
      'Biblioteca de VSLs e variações de oferta',
      'Páginas de conversão otimizadas',
      'Tracking de engajamento e CTA',
      'Testes A/B de criativos e scripts',
    ],
    info: {
      category: 'Conversão',
      version: '0.9.0',
      access: 'Usuário IMP',
      owner: 'Time de Performance',
    },
  },
]

export const dashboardMetrics = [
  {
    id: 'modules',
    label: 'Módulos',
    value: '6',
    hint: 'Disponíveis no workspace',
    accent: 'cyan',
    trend: { direction: 'up', value: '100%' },
  },
  {
    id: 'campaigns',
    label: 'Campanhas',
    value: '24',
    hint: 'Ativas neste mês',
    accent: 'blue',
    trend: { direction: 'up', value: '12%' },
  },
  {
    id: 'leads',
    label: 'Leads',
    value: '1.284',
    hint: 'No pipeline comercial',
    accent: 'violet',
    trend: { direction: 'up', value: '8%' },
  },
  {
    id: 'conversion',
    label: 'Conversão',
    value: '18.4%',
    hint: 'Taxa média de fechamento',
    accent: 'emerald',
    trend: { direction: 'down', value: '1.2%' },
  },
]

export function getModuleById(id) {
  return modules.find((module) => module.id === id) ?? null
}

export function getModuleByPath(path) {
  return modules.find((module) => module.path === path) ?? null
}
