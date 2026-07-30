export const vslMetrics = {
  activeCampaigns: 3,
  avgPlayRate: '62%',
  avgCvr: '4.8%',
  meetingsFromVsl: 26,
}

export const campaigns = [
  {
    id: 'vsl_001',
    name: 'Diagnóstico outbound 15 min',
    status: 'live',
    offer: 'Call de diagnóstico gratuita',
    videoUrl: 'https://cdn.imp.local/vsl/diagnostico.mp4',
    headline: 'Pare de depender só de inbound',
    subheadline: 'Veja como times B2B abrem 8–12 reuniões/semana com BDR + script.',
    ctaLabel: 'Quero meu diagnóstico',
    ctaPlacement: 'mid',
    theme: 'graphite-amber',
    plays: 1840,
    completes: 922,
    ctaClicks: 214,
    conversions: 88,
    cvr: 4.8,
  },
  {
    id: 'vsl_002',
    name: 'Webinar replay → reunião',
    status: 'live',
    offer: 'Agenda com especialista',
    videoUrl: 'https://cdn.imp.local/vsl/replay.mp4',
    headline: 'Você perdeu o ao vivo — não perca a reunião',
    subheadline: 'Resumo de 6 minutos com CTA direto para o calendário BDR.',
    ctaLabel: 'Agendar agora',
    ctaPlacement: 'end',
    theme: 'graphite-amber',
    plays: 960,
    completes: 610,
    ctaClicks: 151,
    conversions: 54,
    cvr: 5.6,
  },
  {
    id: 'vsl_003',
    name: 'Prova regional SP/Campinas',
    status: 'draft',
    offer: 'Piloto 14 dias',
    videoUrl: 'https://cdn.imp.local/vsl/regional.mp4',
    headline: 'Cases da sua região, não genéricos',
    subheadline: 'Variante com logos locais e objeção de preço tratada no minuto 3.',
    ctaLabel: 'Começar piloto',
    ctaPlacement: 'mid',
    theme: 'graphite-amber',
    plays: 0,
    completes: 0,
    ctaClicks: 0,
    conversions: 0,
    cvr: 0,
  },
]

export const STATUS_LABELS = {
  live: 'No ar',
  draft: 'Rascunho',
  paused: 'Pausada',
}

export const CTA_PLACEMENTS = [
  { id: 'start', label: 'Início do vídeo' },
  { id: 'mid', label: 'Meio (~60%)' },
  { id: 'end', label: 'Final' },
]
