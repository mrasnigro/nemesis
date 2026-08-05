import { DIFFICULTY_LABELS } from './catalogs.js'
import { INDUSTRY_OPTIONS } from './personas.js'
import { getEvaluationTemplate } from './evaluationTemplates.js'

/**
 * Training scenarios (mock) — bind persona + evaluation template + briefing.
 * No LLM / voice / TTS.
 */

export const SCENARIO_DIFFICULTIES = ['beginner', 'intermediate', 'advanced']

export const FUNNEL_STAGE_OPTIONS = [
  'Primeiro Contato Frio',
  'Primeiro Contato Morno',
  'Descoberta/Qualificação',
  'Tratamento de Objeção',
  'Pós-Venda',
  'Contato Receptivo',
]

export { DIFFICULTY_LABELS, INDUSTRY_OPTIONS }

/** @deprecated prefer live templates from TrainingAiContext */
export function buildTemplateOptions(templates) {
  return (templates || []).map((item) => ({
    id: item.id,
    title: item.title,
    contactType: item.contactType,
  }))
}
export const seedScenarios = [
  {
    id: 'scn_001',
    title: 'Abertura consultiva B2B',
    description:
      'Simule a abertura de uma ligação fria com um diretor comercial cético.',
    industry: 'Logística',
    segment: 'Logística',
    objective: 'Ganhar 12 minutos de discovery na próxima semana com a decisora.',
    difficulty: 'beginner',
    durationMin: 8,
    funnelStage: 'Primeiro Contato Frio',
    focus: ['Rapport', 'Qualificação inicial', 'Agenda'],
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
    description:
      'O lead compara você com um concorrente mais barato. Reposicione valor sem desconto imediato.',
    industry: 'Varejo',
    segment: 'Varejo',
    objective: 'Reposicionar valor e propor piloto sem cair em desconto precoce.',
    difficulty: 'intermediate',
    durationMin: 10,
    funnelStage: 'Descoberta/Qualificação',
    focus: ['Objeções', 'Valor', 'Fechamento de próximo passo'],
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
    description:
      'Conduza um discovery profundo e classifique o termômetro de interesse ao final.',
    industry: 'Indústria',
    segment: 'Indústria',
    objective: 'Mapear processo, gargalo e stakeholders; fechar com marco/termômetro.',
    difficulty: 'advanced',
    durationMin: 12,
    funnelStage: 'Descoberta/Qualificação',
    focus: ['Diagnóstico', 'Perguntas abertas', 'Priorização'],
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

/** @deprecated prefer context scenarios; kept for static imports in smoke/tests */
export const trainingScenarios = seedScenarios

export function getScenario(scenarioId, list = seedScenarios) {
  return list.find((item) => item.id === scenarioId) || null
}

export function scenariosForPersona(personaId, scenarios = seedScenarios) {
  return scenarios.filter((item) => item.personaId === personaId)
}

export function createEmptyScenarioDraft(defaults = {}) {
  return {
    title: '',
    description: '',
    industry: defaults.industry || 'SaaS B2B',
    objective: '',
    difficulty: 'beginner',
    durationMin: 10,
    funnelStage: 'Primeiro Contato Frio',
    focus: [],
    personaId: defaults.personaId || '',
    evaluationTemplateId: defaults.evaluationTemplateId || 'tpl_cold_call',
    sellerInstructions: '',
    scriptHints: [],
  }
}

export function normalizeScenarioInput(input = {}, options = {}) {
  const errors = []
  const title = String(input.title || '').trim()
  const description = String(input.description || '').trim()
  const industry = String(input.industry || input.segment || '').trim()
  const objective = String(input.objective || '').trim()
  const sellerInstructions = String(input.sellerInstructions || '').trim()
  const personaId = String(input.personaId || '').trim()
  const evaluationTemplateId = String(input.evaluationTemplateId || '').trim()
  const difficulty = String(input.difficulty || 'beginner').trim()
  const funnelStage = String(input.funnelStage || 'Primeiro Contato Frio').trim()

  const durationRaw = Number(input.durationMin)
  const durationMin = Number.isFinite(durationRaw) && durationRaw > 0 ? Math.round(durationRaw) : 10

  const scriptHints =
    input.scriptHintsText != null
      ? String(input.scriptHintsText)
          .split(/\n|,/)
          .map((item) => item.trim())
          .filter(Boolean)
      : Array.isArray(input.scriptHints)
        ? input.scriptHints.map((item) => String(item).trim()).filter(Boolean)
        : []

  const focus =
    input.focusText != null
      ? String(input.focusText)
          .split(/\n|,/)
          .map((item) => item.trim())
          .filter(Boolean)
      : Array.isArray(input.focus)
        ? input.focus.map((item) => String(item).trim()).filter(Boolean)
        : []

  if (!title) errors.push('Informe o nome do cenário.')
  if (!description) errors.push('Informe a descrição.')
  if (!industry) errors.push('Informe a indústria / segmento.')
  if (!objective) errors.push('Informe o objetivo do treinamento.')
  if (!personaId) errors.push('Vincule uma persona.')
  if (!evaluationTemplateId) errors.push('Selecione um template de avaliação.')
  if (!sellerInstructions) errors.push('Informe as instruções da conversa.')
  if (!SCENARIO_DIFFICULTIES.includes(difficulty)) {
    errors.push('Dificuldade inválida.')
  }

  const resolveTemplate = options.templateLookup || getEvaluationTemplate
  if (!resolveTemplate(evaluationTemplateId)) {
    errors.push('Template de avaliação inválido.')
  }

  if (errors.length) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    scenario: {
      title,
      description,
      industry,
      segment: industry,
      objective,
      difficulty,
      durationMin,
      funnelStage,
      focus,
      personaId,
      evaluationTemplateId,
      sellerInstructions,
      scriptHints,
    },
  }
}
