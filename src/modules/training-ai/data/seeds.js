import { getPersona } from './personas.js'
import { getEvaluationTemplate } from './evaluationTemplates.js'

export { seedPersonas, personas, getPersona } from './personas.js'
export { evaluationTemplates, getEvaluationTemplate } from './evaluationTemplates.js'

export const trainingMetricsSeed = {
  completed: 0,
  avgScore: 0,
  streakDays: 0,
  pending: 3,
}

/**
 * Training scenarios — each binds persona + evaluation template.
 * Legacy MCQ turns remain as mock reply scaffolding for free conversation.
 */
export const trainingScenarios = [
  {
    id: 'scn_001',
    title: 'Abertura consultiva B2B',
    segment: 'SaaS B2B',
    difficulty: 'beginner',
    durationMin: 8,
    funnelStage: 'Primeiro Contato Frio',
    focus: ['Rapport', 'Qualificação inicial', 'Agenda'],
    description:
      'Simule a abertura de uma ligação fria com um diretor comercial cético.',
    personaId: 'per_marina',
    evaluationTemplateId: 'tpl_cold_call',
    sellerInstructions:
      'Você está ligando para um lead que baixou um material no site da IMP. Objetivo: ganhar 12 minutos de discovery na próxima semana.',
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
    funnelStage: 'Descoberta/Qualificação',
    focus: ['Objeções', 'Valor', 'Fechamento de próximo passo'],
    description:
      'O lead compara você com um concorrente mais barato. Reposicione valor sem desconto imediato.',
    personaId: 'per_rafael',
    evaluationTemplateId: 'tpl_objection',
    sellerInstructions:
      'O prospect já usa um fornecedor mais barato. Não ofereça desconto na primeira reação — quantifique custo oculto e proponha um piloto.',
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
    funnelStage: 'Descoberta/Qualificação',
    focus: ['Diagnóstico', 'Perguntas abertas', 'Priorização'],
    description:
      'Conduza um discovery profundo e classifique o termômetro de interesse ao final.',
    personaId: 'per_helena',
    evaluationTemplateId: 'tpl_discovery',
    sellerInstructions:
      'Antes de qualquer pitch, entenda o processo atual e onde o pipeline trava. Feche com um marco leve (playbook / termômetro).',
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
          rubricImpact: {
            crit_saudacao: true,
            crit_permissao: true,
            crit_insight: false,
            crit_agenda: false,
            crit_beneficio: false,
            crit_decisor: false,
            crit_next: false,
          },
        },
        {
          id: 'b',
          label: 'Ligo para vender uma solução de leads.',
          quality: 'weak',
          rubricImpact: {
            crit_saudacao: false,
            crit_permissao: false,
            crit_insight: false,
            crit_agenda: false,
            crit_beneficio: false,
            crit_decisor: false,
            crit_next: false,
          },
        },
        {
          id: 'c',
          label: 'Você precisa melhorar sua geração de demanda.',
          quality: 'poor',
          rubricImpact: {
            crit_saudacao: false,
            crit_permissao: false,
            crit_insight: false,
            crit_agenda: false,
            crit_beneficio: false,
            crit_decisor: false,
            crit_next: false,
          },
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
          rubricImpact: {
            crit_saudacao: true,
            crit_permissao: true,
            crit_insight: true,
            crit_agenda: true,
            crit_beneficio: false,
            crit_decisor: true,
            crit_next: false,
          },
        },
        {
          id: 'b',
          label: 'Temos o melhor CRM do mercado.',
          quality: 'weak',
          rubricImpact: {
            crit_saudacao: true,
            crit_permissao: true,
            crit_insight: false,
            crit_agenda: false,
            crit_beneficio: false,
            crit_decisor: false,
            crit_next: false,
          },
        },
        {
          id: 'c',
          label: 'Posso te mandar um PDF?',
          quality: 'poor',
          rubricImpact: {
            crit_saudacao: true,
            crit_permissao: true,
            crit_insight: false,
            crit_agenda: false,
            crit_beneficio: false,
            crit_decisor: false,
            crit_next: false,
          },
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
          rubricImpact: {
            crit_saudacao: true,
            crit_permissao: true,
            crit_insight: true,
            crit_agenda: true,
            crit_beneficio: true,
            crit_decisor: true,
            crit_next: true,
          },
        },
        {
          id: 'b',
          label: 'Vou te mostrar o produto todo.',
          quality: 'weak',
          rubricImpact: {
            crit_saudacao: true,
            crit_permissao: true,
            crit_insight: true,
            crit_agenda: true,
            crit_beneficio: false,
            crit_decisor: true,
            crit_next: false,
          },
        },
        {
          id: 'c',
          label: 'É só uma apresentação institucional.',
          quality: 'poor',
          rubricImpact: {
            crit_saudacao: true,
            crit_permissao: true,
            crit_insight: false,
            crit_agenda: false,
            crit_beneficio: false,
            crit_decisor: false,
            crit_next: false,
          },
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
          rubricImpact: {
            crit_empatia: true,
            crit_custo_oculto: true,
            crit_numero: false,
            crit_piloto: false,
            crit_sem_desconto: true,
          },
        },
        {
          id: 'b',
          label: 'A gente também faz desconto.',
          quality: 'weak',
          rubricImpact: {
            crit_empatia: false,
            crit_custo_oculto: false,
            crit_numero: false,
            crit_piloto: false,
            crit_sem_desconto: false,
          },
        },
        {
          id: 'c',
          label: 'Seu fornecedor é ruim.',
          quality: 'poor',
          rubricImpact: {
            crit_empatia: false,
            crit_custo_oculto: false,
            crit_numero: false,
            crit_piloto: false,
            crit_sem_desconto: true,
          },
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
          rubricImpact: {
            crit_empatia: true,
            crit_custo_oculto: true,
            crit_numero: true,
            crit_piloto: false,
            crit_sem_desconto: true,
          },
        },
        {
          id: 'b',
          label: 'Resultados variam, mas geralmente é bom.',
          quality: 'weak',
          rubricImpact: {
            crit_empatia: true,
            crit_custo_oculto: true,
            crit_numero: false,
            crit_piloto: false,
            crit_sem_desconto: true,
          },
        },
        {
          id: 'c',
          label: 'Garantimos 10x ROI.',
          quality: 'poor',
          rubricImpact: {
            crit_empatia: true,
            crit_custo_oculto: true,
            crit_numero: false,
            crit_piloto: false,
            crit_sem_desconto: true,
          },
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
          rubricImpact: {
            crit_empatia: true,
            crit_custo_oculto: true,
            crit_numero: true,
            crit_piloto: true,
            crit_sem_desconto: true,
          },
        },
        {
          id: 'b',
          label: 'Assina o contrato e a gente começa.',
          quality: 'poor',
          rubricImpact: {
            crit_empatia: true,
            crit_custo_oculto: true,
            crit_numero: true,
            crit_piloto: false,
            crit_sem_desconto: true,
          },
        },
        {
          id: 'c',
          label: 'Te mando um case genérico por e-mail.',
          quality: 'weak',
          rubricImpact: {
            crit_empatia: true,
            crit_custo_oculto: true,
            crit_numero: true,
            crit_piloto: false,
            crit_sem_desconto: true,
          },
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
          rubricImpact: {
            crit_processo: true,
            crit_gargalo: true,
            crit_cadencia: false,
            crit_playbook: false,
            crit_sem_pitch: true,
          },
        },
        {
          id: 'b',
          label: 'Quero saber se vocês compram software.',
          quality: 'poor',
          rubricImpact: {
            crit_processo: false,
            crit_gargalo: false,
            crit_cadencia: false,
            crit_playbook: false,
            crit_sem_pitch: false,
          },
        },
        {
          id: 'c',
          label: 'Quantas pessoas tem no time?',
          quality: 'weak',
          rubricImpact: {
            crit_processo: false,
            crit_gargalo: false,
            crit_cadencia: false,
            crit_playbook: false,
            crit_sem_pitch: true,
          },
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
          rubricImpact: {
            crit_processo: true,
            crit_gargalo: true,
            crit_cadencia: true,
            crit_playbook: false,
            crit_sem_pitch: true,
          },
        },
        {
          id: 'b',
          label: 'Nossa ferramenta resolve tudo isso.',
          quality: 'weak',
          rubricImpact: {
            crit_processo: true,
            crit_gargalo: true,
            crit_cadencia: false,
            crit_playbook: false,
            crit_sem_pitch: false,
          },
        },
        {
          id: 'c',
          label: 'Então o problema é o time.',
          quality: 'poor',
          rubricImpact: {
            crit_processo: true,
            crit_gargalo: true,
            crit_cadencia: false,
            crit_playbook: false,
            crit_sem_pitch: false,
          },
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
          rubricImpact: {
            crit_processo: true,
            crit_gargalo: true,
            crit_cadencia: true,
            crit_playbook: true,
            crit_sem_pitch: true,
          },
        },
        {
          id: 'b',
          label: 'Temos mil configurações avançadas.',
          quality: 'weak',
          rubricImpact: {
            crit_processo: true,
            crit_gargalo: true,
            crit_cadencia: true,
            crit_playbook: false,
            crit_sem_pitch: false,
          },
        },
        {
          id: 'c',
          label: 'Sem processo não tem o que fazer.',
          quality: 'poor',
          rubricImpact: {
            crit_processo: true,
            crit_gargalo: true,
            crit_cadencia: true,
            crit_playbook: false,
            crit_sem_pitch: false,
          },
        },
      ],
    },
  ],
}

export function getScenario(scenarioId) {
  return trainingScenarios.find((item) => item.id === scenarioId) || null
}

export function scenariosForPersona(personaId, scenarios = trainingScenarios) {
  return scenarios.filter((item) => item.personaId === personaId)
}

/**
 * @param {string} scenarioId
 * @param {(id: string) => object | null} [personaLookup]
 */
export function resolveScenarioBundle(scenarioId, personaLookup = getPersona) {
  const scenario = getScenario(scenarioId)
  if (!scenario) return null
  const persona = personaLookup(scenario.personaId)
  const template = getEvaluationTemplate(scenario.evaluationTemplateId)
  const turns = simulationTurnsByScenario[scenarioId] || []
  return { scenario, persona, template, turns }
}

export function createTrainingSession({ scenario, persona, mode = 'free' }) {
  return {
    id: `sess_${Date.now()}`,
    scenarioId: scenario.id,
    personaId: persona?.id || scenario.personaId,
    evaluationTemplateId: scenario.evaluationTemplateId,
    mode,
    messages: [],
    answers: [],
    evaluation: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: 'running',
  }
}

/** @deprecated use scoring.buildSessionEvaluation */
export function buildEvaluation() {
  throw new Error('Use buildSessionEvaluation from services/scoring.js')
}
