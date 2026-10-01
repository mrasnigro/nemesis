import { DIFFICULTY_LABELS } from './catalogs.js'
import { INDUSTRY_OPTIONS } from './personas.js'

/**
 * Training scenarios: bind a persona, a playbook and a briefing.
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

export function getScenario(scenarioId, list = []) {
  return list.find((item) => item.id === scenarioId) || null
}

export function scenariosForPersona(personaId, scenarios = []) {
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
    evaluationTemplateId: defaults.evaluationTemplateId || '',
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

  const resolveTemplate = options.templateLookup || (() => null)
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
