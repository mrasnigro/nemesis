export const radarMetrics = {
  activeSignals: 24,
  risingTrends: 6,
  watchlist: 9,
  alertsToday: 3,
}

export const trendCards = [
  {
    id: 'tr_001',
    title: 'Outbound assistido por IA',
    segment: 'SaaS B2B',
    momentum: 88,
    direction: 'up',
    summary: 'Times comerciais combinam discagem com copilots de script.',
  },
  {
    id: 'tr_002',
    title: 'Webinars curtos de qualificação',
    segment: 'Serviços',
    momentum: 76,
    direction: 'up',
    summary: 'Eventos de 25–35 min com CTA direto para reunião BDR.',
  },
  {
    id: 'tr_003',
    title: 'VSL + proof social local',
    segment: 'Performance',
    momentum: 71,
    direction: 'stable',
    summary: 'Páginas com depoimentos regionais convertem melhor no BR.',
  },
  {
    id: 'tr_004',
    title: 'Compressão de ciclo enterprise',
    segment: 'Indústria',
    momentum: 64,
    direction: 'down',
    summary: 'Comitês mais longos; necessidade de multi-threading.',
  },
]

export const marketSegments = [
  { id: 'saas', label: 'SaaS B2B', heat: 82, opportunities: 14 },
  { id: 'logistics', label: 'Logística', heat: 74, opportunities: 9 },
  { id: 'retail', label: 'Varejo', heat: 61, opportunities: 7 },
  { id: 'industry', label: 'Indústria', heat: 58, opportunities: 5 },
]

export const insights = [
  {
    id: 'ins_001',
    title: 'SDRs priorizam listas com sinal de hiring',
    category: 'Prospecção',
    severity: 'alta',
    publishedAt: '2026-07-28T10:00:00Z',
    trendId: 'tr_001',
    bullets: [
      'Empresas com vagas abertas de SDR/BDR respondem 1.7x mais.',
      'Melhor janela de contato: terça e quarta, 10h–12h.',
      'Mensagens que citam a vaga aberta elevam taxa de conexão.',
    ],
    recommendation:
      'Na Prospecção, filtre por sinal “Contrata SDRs” e envie lote aquecido ao BDR.',
  },
  {
    id: 'ins_002',
    title: 'Webinar → BDR em menos de 24h',
    category: 'Eventos',
    severity: 'média',
    publishedAt: '2026-07-27T15:30:00Z',
    trendId: 'tr_002',
    bullets: [
      'Participantes engajados (>60% presença) agendam 2.3x mais.',
      'Follow-up telefônico no mesmo dia supera e-mail em 41%.',
      'CTA de “diagnóstico rápido” supera “demo completa”.',
    ],
    recommendation:
      'Configure no Webinar a exportação automática de presentes para a fila BDR.',
  },
  {
    id: 'ins_003',
    title: 'VSL com prova regional',
    category: 'Conteúdo',
    severity: 'média',
    publishedAt: '2026-07-26T09:10:00Z',
    trendId: 'tr_003',
    bullets: [
      'Versões com logo de clientes do mesmo estado sobem CVR em ~12%.',
      'CTA após 62% do vídeo performa melhor que CTA imediato.',
      'Mobile ainda responde por 58% das plays.',
    ],
    recommendation:
      'No módulo VSL, ative variante regional e acompanhe a métrica de CTA mid-video.',
  },
]

export function buildMarketAnalysis(segmentId) {
  const segment = marketSegments.find((item) => item.id === segmentId) || marketSegments[0]
  return {
    id: `an_${Date.now()}`,
    segmentId: segment.id,
    segmentLabel: segment.label,
    generatedAt: new Date().toISOString(),
    heat: segment.heat,
    narrative: `O segmento ${segment.label} apresenta calor ${segment.heat}/100 com ${segment.opportunities} oportunidades monitoradas. Sinais de contratação e troca de stack continuam como principais gatilhos de abordagem.`,
    topActions: [
      'Priorizar contas com hiring signal na Prospecção',
      'Alinhar script BDR ao insight de ciclo atual',
      'Testar oferta de webinar curto para nutrir lista fria',
    ],
  }
}
