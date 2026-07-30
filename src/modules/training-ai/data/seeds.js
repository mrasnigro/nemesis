export const trainingMetrics = {
  completed: 12,
  avgScore: 78,
  streakDays: 4,
  pending: 3,
}

export const trainingScenarios = [
  {
    id: 'scn_001',
    title: 'Abertura consultiva B2B',
    segment: 'SaaS B2B',
    difficulty: 'beginner',
    durationMin: 8,
    focus: ['Rapport', 'Qualificação inicial', 'Agenda'],
    description:
      'Simule a abertura de uma ligação frias com um diretor comercial cético.',
    persona: {
      name: 'Marina Costa',
      role: 'Diretora Comercial',
      company: 'Nexo Logística',
      mood: 'Cética, objetiva',
    },
    scriptHints: [
      'Confirme se é um bom momento',
      'Cite um insight do segmento logístico',
      'Peça 12 minutos com agenda clara',
    ],
  },
  {
    id: 'scn_002',
    title: 'Tratamento de objeção de preço',
    segment: 'Serviços',
    difficulty: 'intermediate',
    durationMin: 10,
    focus: ['Objeções', 'Valor', 'Fechamento de próximo passo'],
    description:
      'O lead compara você com um concorrente mais barato. Reposicione valor sem desconto imediato.',
    persona: {
      name: 'Rafael Souza',
      role: 'Head de Operações',
      company: 'Atlas Retail',
      mood: 'Pressão por custo',
    },
    scriptHints: [
      'Separe preço de custo de oportunidade',
      'Quantifique impacto operacional',
      'Proponha prova controlada',
    ],
  },
  {
    id: 'scn_003',
    title: 'Diagnóstico de dor e termômetro',
    segment: 'Indústria',
    difficulty: 'advanced',
    durationMin: 12,
    focus: ['Diagnóstico', 'Perguntas abertas', 'Priorização'],
    description:
      'Conduza um discovery profundo e classifique o termômetro de interesse ao final.',
    persona: {
      name: 'Helena Prado',
      role: 'Gerente de Expansão',
      company: 'Forge Industrial',
      mood: 'Analítica, detalhista',
    },
    scriptHints: [
      'Explore processo atual antes da solução',
      'Valide stakeholders',
      'Feche com resumo e próximo marco',
    ],
  },
]

export const simulationTurnsByScenario = {
  scn_001: [
    {
      id: 't1',
      ai: 'Alô? Marina falando. Quem é e por que está ligando?',
      options: [
        {
          id: 'a',
          label: 'Bom dia, Marina. Sou da IMP. Posso ter 30 segundos?',
          quality: 'good',
        },
        {
          id: 'b',
          label: 'Ligo para vender uma solução de leads.',
          quality: 'weak',
        },
        {
          id: 'c',
          label: 'Você precisa melhorar sua geração de demanda.',
          quality: 'poor',
        },
      ],
    },
    {
      id: 't2',
      ai: 'Trinta segundos. Seja direto — recebo muitas ligações.',
      options: [
        {
          id: 'a',
          label:
            'Ajudamos times B2B a abrir reuniões com decisores em logística. Vale 12 min semana que vem?',
          quality: 'good',
        },
        {
          id: 'b',
          label: 'Temos o melhor CRM do mercado.',
          quality: 'weak',
        },
        {
          id: 'c',
          label: 'Posso te mandar um PDF?',
          quality: 'poor',
        },
      ],
    },
    {
      id: 't3',
      ai: 'Doze minutos... o que exatamente eu saio ganhando nessa conversa?',
      options: [
        {
          id: 'a',
          label:
            'Um mapa do funil outbound para o seu ciclo médio de 45 dias e critérios de qualificação.',
          quality: 'good',
        },
        {
          id: 'b',
          label: 'Vou te mostrar o produto todo.',
          quality: 'weak',
        },
        {
          id: 'c',
          label: 'É só uma apresentação institucional.',
          quality: 'poor',
        },
      ],
    },
  ],
  scn_002: [
    {
      id: 't1',
      ai: 'Olha, já tenho um fornecedor 30% mais barato. Por que eu mudaria?',
      options: [
        {
          id: 'a',
          label:
            'Faz sentido proteger o custo. O ponto é o custo oculto de no-shows e ciclo longo — posso mostrar o delta?',
          quality: 'good',
        },
        {
          id: 'b',
          label: 'A gente também faz desconto.',
          quality: 'weak',
        },
        {
          id: 'c',
          label: 'Seu fornecedor é ruim.',
          quality: 'poor',
        },
      ],
    },
    {
      id: 't2',
      ai: 'Ok, me dê um número concreto sem enrolação.',
      options: [
        {
          id: 'a',
          label:
            'Em contas similares, reduzimos 18% do tempo até reunião qualificada em 60 dias.',
          quality: 'good',
        },
        {
          id: 'b',
          label: 'Resultados variam, mas geralmente é bom.',
          quality: 'weak',
        },
        {
          id: 'c',
          label: 'Garantimos 10x ROI.',
          quality: 'poor',
        },
      ],
    },
    {
      id: 't3',
      ai: 'Interessante. Qual o próximo passo sem eu comprar nada agora?',
      options: [
        {
          id: 'a',
          label:
            'Uma call de 20 min com diagnóstico do processo atual e um plano piloto de 2 semanas.',
          quality: 'good',
        },
        {
          id: 'b',
          label: 'Assina o contrato e a gente começa.',
          quality: 'poor',
        },
        {
          id: 'c',
          label: 'Te mando um case genérico por e-mail.',
          quality: 'weak',
        },
      ],
    },
  ],
  scn_003: [
    {
      id: 't1',
      ai: 'Antes de qualquer pitch: o que você precisa entender do nosso processo?',
      options: [
        {
          id: 'a',
          label:
            'Como vocês priorizam contas hoje e onde o pipeline mais trava entre MQL e reunião.',
          quality: 'good',
        },
        {
          id: 'b',
          label: 'Quero saber se vocês compram software.',
          quality: 'poor',
        },
        {
          id: 'c',
          label: 'Quantas pessoas tem no time?',
          quality: 'weak',
        },
      ],
    },
    {
      id: 't2',
      ai: 'Trava principal: follow-up inconsistente depois do primeiro contato.',
      options: [
        {
          id: 'a',
          label:
            'Entendi. Quem define a cadência hoje e qual a meta de tentativas por lead?',
          quality: 'good',
        },
        {
          id: 'b',
          label: 'Nossa ferramenta resolve tudo isso.',
          quality: 'weak',
        },
        {
          id: 'c',
          label: 'Então o problema é o time.',
          quality: 'poor',
        },
      ],
    },
    {
      id: 't3',
      ai: 'Cadência é informal. Quero ver se vocês estruturam isso sem engessar o time.',
      options: [
        {
          id: 'a',
          label:
            'Posso te mostrar um playbook leve com gates de qualificação e termômetro — 25 min amanhã?',
          quality: 'good',
        },
        {
          id: 'b',
          label: 'Temos mil configurações avançadas.',
          quality: 'weak',
        },
        {
          id: 'c',
          label: 'Sem processo não tem o que fazer.',
          quality: 'poor',
        },
      ],
    },
  ],
}

export function buildEvaluation(scenario, answers) {
  const qualityScore = { good: 34, weak: 18, poor: 6 }
  const raw = answers.reduce((sum, answer) => sum + (qualityScore[answer.quality] || 0), 0)
  const score = Math.min(100, Math.round(raw + (answers.length === 3 ? 8 : 0)))

  const strengths = answers
    .filter((a) => a.quality === 'good')
    .map((a) => a.label)
  const improvements = answers
    .filter((a) => a.quality !== 'good')
    .map((a) => a.label)

  return {
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    score,
    completedAt: new Date().toISOString(),
    dimensions: [
      { id: 'rapport', label: 'Rapport', value: Math.min(100, score + 4) },
      { id: 'clarity', label: 'Clareza', value: Math.max(40, score - 6) },
      { id: 'value', label: 'Proposta de valor', value: Math.min(100, score + 2) },
      { id: 'next', label: 'Próximo passo', value: Math.max(35, score - 3) },
    ],
    strengths: strengths.length
      ? strengths
      : ['Manteve a conversa ativa até o final'],
    improvements: improvements.length
      ? improvements.map((item) => `Evitar abordagem: “${item.slice(0, 60)}…”`)
      : ['Aprofundar perguntas de diagnóstico'],
    coachNotes:
      score >= 80
        ? 'Excelente controle da conversa. Pronto para cenários avançados.'
        : 'Foque em valor concreto e próximo passo agendável nas próximas simulações.',
  }
}
