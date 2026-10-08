/**
 * Starter catalog: three playbooks, three agents and three scenarios a new customer can install with one
 * click and then edit. Keys (`key`, `personaKey`, `templateKey`) only link the items to each other; real ids
 * are generated when the catalog is installed.
 */

type Kw = { type: 'keywords' | 'avoid_keywords'; keywords: string[] }

function criterion(id: string, name: string, weight: number, yesNoQuestion: string, passRule: Kw) {
  return { id, name, weight, yesNoQuestion, active: true, passRule }
}

export const starterTemplates = [
  {
    key: 'cold_call',
    title: 'Contato Telefônico - Frio',
    description: 'Rubrica para abertura consultiva em ligação fria: saudação, permissão, valor e próximo passo.',
    contactType: 'cold_call',
    status: 'published',
    scenarioTypes: ['cold_first', 'warm_first', 'inbound'],
    sections: [
      {
        id: 'sec_abertura',
        name: 'Abertura',
        description: 'Estabelecer contato e gerar interesse inicial.',
        criteria: [
          criterion('crit_saudacao', 'Saudação e apresentação', 15, 'O vendedor cumprimentou e se apresentou com clareza?', {
            type: 'keywords',
            keywords: ['bom dia', 'boa tarde', 'olá', 'sou da', 'me chamo', 'imp'],
          }),
          criterion('crit_permissao', 'Pedido de permissão', 10, 'Pediu um momento curto antes de avançar o pitch?', {
            type: 'keywords',
            keywords: ['segundos', 'minuto', 'momento', 'posso', 'bom momento', 'permit'],
          }),
        ],
      },
      {
        id: 'sec_valor',
        name: 'Proposta de valor',
        description: 'Trazer insight e proposta clara de valor.',
        criteria: [
          criterion('crit_insight', 'Insight do segmento', 15, 'Trouxe um insight relevante para o segmento do lead?', {
            type: 'keywords',
            keywords: ['logíst', 'indústria', 'segmento', 'pipeline', 'lead', 'insight'],
          }),
          criterion('crit_agenda', 'Agenda clara', 15, 'Propôs um próximo passo com tempo e objetivo explícitos?', {
            type: 'keywords',
            keywords: ['12 minut', '15 minut', 'agenda', 'discovery', 'reunião', 'agendar'],
          }),
        ],
      },
      {
        id: 'sec_qualificacao',
        name: 'Qualificação',
        description: 'Entender necessidades e contexto do prospect.',
        criteria: [
          criterion('crit_beneficio', 'Benefício concreto', 20, 'Explicou o que o lead ganha na conversa (não só o produto)?', {
            type: 'keywords',
            keywords: ['você ganha', 'benefício', 'eficiência', 'resultado', 'impacto', 'ganho'],
          }),
          criterion('crit_decisor', 'Confirmação de decisores', 10, 'Validou ou abriu caminho para envolvimento de decisores?', {
            type: 'keywords',
            keywords: ['decisor', 'diretor', 'time', 'stakeholder', 'envolver', 'quem decide'],
          }),
        ],
      },
      {
        id: 'sec_fecho',
        name: 'Próximo passo',
        description: 'Consolidar próximo passo e compromisso.',
        criteria: [
          criterion('crit_next', 'Fechamento do próximo passo', 15, 'Convidou para um próximo marco agendável?', {
            type: 'keywords',
            keywords: ['próximo passo', 'marcar', 'agendar', 'semana que vem', 'calendário'],
          }),
        ],
      },
    ],
  },
  {
    key: 'objection',
    title: 'Tratamento de Objeção - Preço',
    description: 'Rubrica para reposicionar valor sob pressão de custo, sem desconto precoce.',
    contactType: 'objection',
    status: 'published',
    scenarioTypes: ['discovery', 'negotiation', 'presentation'],
    sections: [
      {
        id: 'sec_reconhecimento',
        name: 'Reconhecimento',
        description: 'Reconhecer a preocupação do cliente sem atacar o concorrente.',
        criteria: [
          criterion('crit_empatia', 'Empatia com a pressão de custo', 15, 'Reconheceu a preocupação de custo sem atacar o concorrente?', {
            type: 'keywords',
            keywords: ['entendo', 'faz sentido', 'pressão', 'custo', 'orçamento'],
          }),
        ],
      },
      {
        id: 'sec_reposicao',
        name: 'Reposição de valor',
        description: 'Reposicionar valor sem conceder desconto precoce.',
        criteria: [
          criterion('crit_custo_oculto', 'Custo oculto / oportunidade', 20, 'Separou preço de custo de oportunidade com argumento claro?', {
            type: 'keywords',
            keywords: ['custo oculto', 'oportunidade', 'retrabalho', 'custo de oportunidade'],
          }),
          criterion('crit_numero', 'Evidência numérica', 20, 'Trouxe um número concreto e crível?', {
            type: 'keywords',
            keywords: ['%', 'min', 'horas', 'dias', 'reais', 'r$'],
          }),
        ],
      },
      {
        id: 'sec_avanco',
        name: 'Avanço comercial',
        description: 'Consolidar próximo passo e compromisso.',
        criteria: [
          criterion('crit_piloto', 'Prova controlada', 25, 'Propôs um próximo passo sem exigir compra imediata?', {
            type: 'keywords',
            keywords: ['piloto', 'prova', 'teste', 'trial', 'controlad'],
          }),
          criterion('crit_sem_desconto', 'Evitar desconto precoce', 20, 'Evitou cair em desconto imediato como resposta principal?', {
            type: 'avoid_keywords',
            keywords: ['desconto', 'mais barato', 'abaixar preço', 'preço menor'],
          }),
        ],
      },
    ],
  },
  {
    key: 'discovery',
    title: 'Diagnóstico / Discovery',
    description: 'Rubrica para discovery: processo, gargalo, stakeholders e marco sem pitch precoce.',
    contactType: 'discovery',
    status: 'published',
    scenarioTypes: ['discovery', 'presentation', 'negotiation', 'post_sale'],
    sections: [
      {
        id: 'sec_diagnostico',
        name: 'Diagnóstico',
        description: '',
        criteria: [
          criterion('crit_processo', 'Exploração do processo atual', 20, 'Perguntou como o processo funciona hoje antes de oferecer solução?', {
            type: 'keywords',
            keywords: ['como funciona', 'processo', 'hoje', 'atual', 'rotina'],
          }),
          criterion('crit_gargalo', 'Identificação do gargalo', 20, 'Aprofundou a dor/gargalo mencionado pelo lead?', {
            type: 'keywords',
            keywords: ['dor', 'gargalo', 'trava', 'dificuldade', 'problema'],
          }),
        ],
      },
      {
        id: 'sec_stakeholders',
        name: 'Stakeholders',
        description: '',
        criteria: [
          criterion('crit_cadencia', 'Cadência e ownership', 20, 'Clarificou quem define cadência/metas no processo?', {
            type: 'keywords',
            keywords: ['cadência', 'meta', 'owner', 'responsável', 'quem define'],
          }),
        ],
      },
      {
        id: 'sec_termometro',
        name: 'Termômetro e fecho',
        description: 'Fechar com marco e playbook leve.',
        criteria: [
          criterion('crit_playbook', 'Playbook / próximo marco', 25, 'Propôs um playbook leve ou marco com data?', {
            type: 'keywords',
            keywords: ['playbook', 'marco', 'próximo', 'agendar', 'data'],
          }),
          criterion('crit_sem_pitch', 'Evitar pitch prematuro', 15, 'Evitou empurrar features antes de validar o contexto?', {
            type: 'avoid_keywords',
            keywords: ['nossa plataforma', 'temos ia', 'funcionalidades', 'features', 'integração com'],
          }),
        ],
      },
    ],
  },
]

export const starterPersonas = [
  {
    key: 'marina',
    name: 'Marina Costa',
    role: 'Diretora Comercial',
    company: 'Nexo Logística',
    industry: 'Logística',
    location: 'São Paulo, SP',
    language: 'pt-BR',
    negotiatorType: 'Cliente Analítico',
    scenarioType: 'cold_first',
    templateKey: 'cold_call',
    tone: 'Objetivo',
    behavior: 'Cética e objetiva; quer saber o motivo da ligação em poucos segundos.',
    difficulty: 'beginner',
    mood: 'Cética, objetiva',
    openingLine: 'Alô? Marina falando. Quem é e por que está ligando?',
    personalDetails: ['Responde direto ao board', 'Agenda apertada nas manhãs'],
    objections: ['Recebo muitas ligações', 'Não tenho tempo agora'],
    priorities: ['Previsibilidade de agenda', 'Reuniões com decisores'],
    beliefs: ['Prefere fornecedores que conhecem logística'],
    problemAwareness: 'Sabe que o funil está irregular, mas não prioriza tool nova sem ROI claro.',
    solutionAwareness: 'Aberta a ouvir se houver prova no segmento; cética a pitch genérico.',
    salesModel: 'b2b',
    companyInfo: 'Operação multi-CD com pipeline dependente de agenda de diretoria.',
    trainingObjective: 'Praticar abertura consultiva e pedido de agenda com decisora cética em logística.',
    sellerInstructions:
      'Você está ligando para um Lead que se cadastrou no site da IMP. Objetivo: ganhar 12 minutos de discovery na próxima semana.',
    status: 'active',
    traits: ['Analítico', 'Cético', 'Objetivo'],
    interactionMode: 'both',
    voiceRef: 'voice_neutral_f',
    scenarioContext: 'Lead baixou material no site da IMP; contato frio B2B logística.',
  },
  {
    key: 'rafael',
    name: 'Rafael Souza',
    role: 'Head de Operações',
    company: 'Atlas Retail',
    industry: 'Varejo',
    location: 'Curitiba, PR',
    language: 'pt-BR',
    negotiatorType: 'Cliente Dominante',
    scenarioType: 'discovery',
    templateKey: 'objection',
    tone: 'Direto',
    behavior: 'Pressão por custo; compara com concorrente e pede números sem rodeio.',
    difficulty: 'intermediate',
    mood: 'Pressão por custo',
    openingLine: 'Olha, já tenho um fornecedor 30% mais barato. Por que eu mudaria?',
    personalDetails: ['Decide rápido', 'Foca em custo operacional'],
    objections: ['Concorrente mais barato', 'Sem orçamento este trimestre'],
    priorities: ['Reduzir custo oculto', 'Piloto sem lock-in'],
    beliefs: ['Desconto imediato é o único sinal de valor'],
    problemAwareness: 'Sente custo alto na operação mas ancora tudo em preço de lista.',
    solutionAwareness: 'Considera piloto curto se houver métricas claras e sem lock-in.',
    salesModel: 'b2b',
    companyInfo: 'Rede varejo com pressão de margem e comparação agressiva de fornecedores.',
    trainingObjective: 'Tratar objeção de preço sem desconto precoce e propor prova controlada.',
    sellerInstructions:
      'O prospect já usa um fornecedor mais barato. Não ofereça desconto na primeira reação — quantifique custo oculto e proponha um piloto.',
    status: 'active',
    traits: ['Dominante', 'Competitivo', 'Direto'],
    interactionMode: 'both',
    voiceRef: 'voice_firm_m',
    scenarioContext: 'Tratamento de objeção de preço em discovery varejo.',
  },
  {
    key: 'helena',
    name: 'Helena Prado',
    role: 'Gerente de Expansão',
    company: 'Forge Industrial',
    industry: 'Indústria',
    location: 'Belo Horizonte, MG',
    language: 'pt-BR',
    negotiatorType: 'Cliente Analítico',
    scenarioType: 'discovery',
    templateKey: 'discovery',
    tone: 'Consultivo',
    behavior: 'Analítica e detalhista; exige diagnóstico do processo antes de qualquer pitch.',
    difficulty: 'advanced',
    mood: 'Analítica, detalhista',
    openingLine: 'Antes de qualquer pitch: o que você precisa entender do nosso processo?',
    personalDetails: ['Exige dados', 'Mapeia stakeholders antes de avançar'],
    objections: ['Não quero processo engessado', 'Já tentamos ferramentas genéricas'],
    priorities: ['Diagnóstico antes de pitch', 'Gates leves de qualificação'],
    beliefs: ['Ferramentas sem process design falham'],
    problemAwareness: 'Vê gargalos de expansão; quer clareza de causa raiz.',
    solutionAwareness: 'Aceita abordagem consultiva com marcos e termômetro explícitos.',
    salesModel: 'b2b',
    companyInfo: 'Indústria em expansão regional com governance leve.',
    trainingObjective: 'Conduzir discovery profundo, validar stakeholders e fechar com marco/termômetro.',
    sellerInstructions:
      'Antes de qualquer pitch, entenda o processo atual e onde o pipeline trava. Feche com um marco leve (playbook / termômetro).',
    status: 'active',
    traits: ['Analítico', 'Detalhista', 'Curioso'],
    interactionMode: 'both',
    voiceRef: 'voice_warm_f',
    scenarioContext: 'Discovery profundo + classificação de termômetro.',
  },
]

export const starterScenarios = [
  {
    title: 'Abertura consultiva B2B',
    description: 'Simule a abertura de uma ligação fria com um diretor comercial cético.',
    industry: 'Logística',
    segment: 'Logística',
    objective: 'Ganhar 12 minutos de discovery na próxima semana com a decisora.',
    difficulty: 'beginner',
    durationMin: 8,
    funnelStage: 'Primeiro Contato Frio',
    focus: ['Rapport', 'Qualificação inicial', 'Agenda'],
    personaKey: 'marina',
    templateKey: 'cold_call',
    sellerInstructions:
      'Você está ligando para um lead que baixou um material no site da IMP. Objetivo: ganhar 12 minutos de discovery na próxima semana.',
    scriptHints: ['Confirme se é um bom momento', 'Cite um insight do segmento logístico', 'Peça 12 minutos com agenda clara'],
  },
  {
    title: 'Tratamento de objeção de preço',
    description: 'O lead compara você com um concorrente mais barato. Reposicione valor sem desconto imediato.',
    industry: 'Varejo',
    segment: 'Varejo',
    objective: 'Reposicionar valor e propor piloto sem cair em desconto precoce.',
    difficulty: 'intermediate',
    durationMin: 10,
    funnelStage: 'Descoberta/Qualificação',
    focus: ['Objeções', 'Valor', 'Fechamento de próximo passo'],
    personaKey: 'rafael',
    templateKey: 'objection',
    sellerInstructions:
      'O prospect já usa um fornecedor mais barato. Não ofereça desconto na primeira reação — quantifique custo oculto e proponha um piloto.',
    scriptHints: ['Separe preço de custo de oportunidade', 'Quantifique impacto operacional', 'Proponha prova controlada'],
  },
  {
    title: 'Diagnóstico de dor e termômetro',
    description: 'Conduza um discovery profundo e classifique o termômetro de interesse ao final.',
    industry: 'Indústria',
    segment: 'Indústria',
    objective: 'Mapear processo, gargalo e stakeholders; fechar com marco/termômetro.',
    difficulty: 'advanced',
    durationMin: 12,
    funnelStage: 'Descoberta/Qualificação',
    focus: ['Diagnóstico', 'Perguntas abertas', 'Priorização'],
    personaKey: 'helena',
    templateKey: 'discovery',
    sellerInstructions:
      'Antes de qualquer pitch, entenda o processo atual e onde o pipeline trava. Feche com um marco leve (playbook / termômetro).',
    scriptHints: ['Explore processo atual antes da solução', 'Valide stakeholders', 'Feche com resumo e próximo marco'],
  },
]
