/**
 * Scoring engine — maps MCQ answers → rubric pass/fail → weighted score.
 * Mock only: no LLM.
 */

import { flattenCriteria, getEvaluationTemplate } from '../data/evaluationTemplates.js'
import { scoreBand } from '../data/catalogs.js'

/**
 * Merge criterion outcomes from selected options.
 * Later answers override earlier ones for the same criterion.
 */
export function resolveCriterionOutcomes(answers = []) {
  const outcomes = {}
  for (const answer of answers) {
    const impact = answer.rubricImpact || {}
    for (const [criterionId, passed] of Object.entries(impact)) {
      outcomes[criterionId] = Boolean(passed)
    }
  }
  return outcomes
}

export function evaluateRubric(template, answers = []) {
  const criteria = flattenCriteria(template)
  const outcomes = resolveCriterionOutcomes(answers)

  const evaluatedCriteria = criteria.map((criterion) => {
    const passed = outcomes[criterion.id] === true
    return {
      id: criterion.id,
      name: criterion.name,
      sectionId: criterion.sectionId,
      sectionName: criterion.sectionName,
      weight: criterion.weight,
      yesNoQuestion: criterion.yesNoQuestion,
      passed,
    }
  })

  const score = evaluatedCriteria.reduce(
    (sum, item) => sum + (item.passed ? item.weight : 0),
    0,
  )

  const sections = []
  for (const item of evaluatedCriteria) {
    let section = sections.find((s) => s.id === item.sectionId)
    if (!section) {
      section = {
        id: item.sectionId,
        name: item.sectionName,
        criteria: [],
        passedCount: 0,
        totalCount: 0,
        earnedWeight: 0,
        totalWeight: 0,
      }
      sections.push(section)
    }
    section.criteria.push(item)
    section.totalCount += 1
    section.totalWeight += item.weight
    if (item.passed) {
      section.passedCount += 1
      section.earnedWeight += item.weight
    }
  }

  return {
    score,
    band: scoreBand(score),
    sections,
    criteria: evaluatedCriteria,
    outcomes,
  }
}

export function buildStrengthsAndImprovements(evaluatedCriteria, answers = []) {
  const passed = evaluatedCriteria.filter((c) => c.passed)
  const failed = evaluatedCriteria.filter((c) => !c.passed)

  const strengths = passed.length
    ? passed.map((c) => c.name)
    : ['Manteve a simulação até o final']

  const improvements = failed.length
    ? failed.map((c) => c.yesNoQuestion || c.name)
    : ['Aprofundar perguntas de diagnóstico na próxima rodada']

  const weakLabels = answers
    .filter((a) => a.quality === 'weak' || a.quality === 'poor')
    .map((a) => a.label)

  return {
    strengths,
    improvements,
    avoidedApproaches: weakLabels,
  }
}

export function buildCoachNotes(score) {
  if (score >= 90) return 'Excelente domínio da rubrica. Pronto para cenários avançados.'
  if (score >= 75) return 'Bom desempenho. Refine os critérios em falha e refaça o cenário.'
  if (score >= 60)
    return 'Em desenvolvimento. Foque em valor concreto e próximo passo agendável.'
  return 'Precisa de reforço. Revise a conversa e pratique a abertura e a agenda.'
}

/**
 * Full evaluation payload for a completed training session.
 */
export function buildSessionEvaluation({
  session,
  scenario,
  persona,
  templateId,
  answers,
  messages,
}) {
  const template = getEvaluationTemplate(templateId || scenario.evaluationTemplateId)
  if (!template) {
    throw new Error('Evaluation template not found')
  }

  const rubric = evaluateRubric(template, answers)
  const narrative = buildStrengthsAndImprovements(rubric.criteria, answers)

  return {
    id: `eval_${session?.id || Date.now()}`,
    sessionId: session?.id || null,
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    personaId: persona?.id || scenario.personaId,
    personaName: persona?.name || 'Persona',
    templateId: template.id,
    templateTitle: template.title,
    score: rubric.score,
    band: rubric.band,
    sections: rubric.sections,
    criteria: rubric.criteria,
    strengths: narrative.strengths,
    improvements: narrative.improvements,
    avoidedApproaches: narrative.avoidedApproaches,
    coachNotes: buildCoachNotes(rubric.score),
    messages: messages || [],
    answers: answers || [],
    completedAt: new Date().toISOString(),
  }
}
