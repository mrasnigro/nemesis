export const webinarMetrics = {
  upcoming: 2,
  liveOrSoon: 1,
  avgAttendance: '67%',
  meetingsBooked: 18,
}

export const webinars = [
  {
    id: 'web_001',
    title: 'Outbound que agenda: playbook BDR 2026',
    status: 'scheduled',
    startsAt: '2026-08-05T14:00:00Z',
    durationMin: 35,
    host: 'Bruno Lima',
    registrants: 186,
    attended: 0,
    attendanceRate: 0,
    engagement: 0,
    description: 'Táticas práticas de abertura, objeção e handoff para reunião.',
  },
  {
    id: 'web_002',
    title: 'Radar comercial: sinais que geram reunião',
    status: 'completed',
    startsAt: '2026-07-22T15:00:00Z',
    durationMin: 30,
    host: 'Ana Souza',
    registrants: 142,
    attended: 97,
    attendanceRate: 68,
    engagement: 74,
    description: 'Como usar insights de mercado na prospecção diária.',
  },
  {
    id: 'web_003',
    title: 'VSL + webinar: funil híbrido',
    status: 'draft',
    startsAt: '2026-08-14T16:30:00Z',
    durationMin: 40,
    host: 'Carla Mendes',
    registrants: 0,
    attended: 0,
    attendanceRate: 0,
    engagement: 0,
    description: 'Combinando página de oferta e evento ao vivo.',
  },
]

export const participantsByWebinar = {
  web_001: [
    { id: 'p1', name: 'Marina Costa', company: 'Nexo Logística', status: 'registered', watchMin: 0 },
    { id: 'p2', name: 'Rafael Souza', company: 'Atlas Retail', status: 'registered', watchMin: 0 },
    { id: 'p3', name: 'Helena Prado', company: 'Forge Industrial', status: 'registered', watchMin: 0 },
    { id: 'p4', name: 'Diego Alves', company: 'Orbit Leads', status: 'registered', watchMin: 0 },
  ],
  web_002: [
    { id: 'p5', name: 'Elena Costa', company: 'Pulse Digital', status: 'attended', watchMin: 28 },
    { id: 'p6', name: 'Paulo Freitas', company: 'Via Norte', status: 'attended', watchMin: 22 },
    { id: 'p7', name: 'Sofia Martins', company: 'Bright Ops', status: 'no_show', watchMin: 0 },
    { id: 'p8', name: 'Igor Mendes', company: 'CloudFarm', status: 'attended', watchMin: 30 },
    { id: 'p9', name: 'Lívia Rocha', company: 'North Sales', status: 'attended', watchMin: 18 },
  ],
  web_003: [],
}

export const STATUS_LABELS = {
  scheduled: 'Agendado',
  completed: 'Concluído',
  draft: 'Rascunho',
  live: 'Ao vivo',
}

export const PARTICIPANT_STATUS = {
  registered: 'Inscrito',
  attended: 'Presente',
  no_show: 'No-show',
}
