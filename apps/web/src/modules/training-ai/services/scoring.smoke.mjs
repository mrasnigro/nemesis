/**
 * Smoke checks for Training IA rubric scoring (no test runner required).
 * Run: node src/modules/training-ai/services/scoring.smoke.mjs
 */
import assert from 'node:assert/strict'
import {
  assertTemplateWeights,
  evaluationTemplates,
  getEvaluationTemplate,
} from '../data/evaluationTemplates.js'
import { resolveScenarioBundle } from '../data/seeds.js'
import { buildSessionEvaluation, evaluateRubric } from './scoring.js'

for (const template of evaluationTemplates) {
  assert.equal(
    assertTemplateWeights(template),
    true,
    `${template.id} weights must sum to 100`,
  )
}

const bundle = resolveScenarioBundle('scn_001')
assert.ok(bundle?.persona)
assert.ok(bundle?.template)
assert.equal(bundle.scenario.evaluationTemplateId, 'tpl_cold_call')

const goodAnswers = bundle.turns.map((turn) => turn.options.find((o) => o.quality === 'good'))
const goodEval = evaluateRubric(bundle.template, goodAnswers)
assert.equal(goodEval.score, 100, 'all-good path should score 100')
assert.ok(goodEval.criteria.every((c) => c.passed))

const poorAnswers = bundle.turns.map((turn) => turn.options.find((o) => o.quality === 'poor'))
const poorEval = evaluateRubric(bundle.template, poorAnswers)
assert.ok(poorEval.score < 50, 'all-poor path should score low')

const session = {
  id: 'sess_test',
  scenarioId: bundle.scenario.id,
  personaId: bundle.persona.id,
}
const report = buildSessionEvaluation({
  session,
  scenario: bundle.scenario,
  persona: bundle.persona,
  templateId: bundle.template.id,
  answers: goodAnswers,
  messages: [{ id: 'm0', role: 'ai', text: 'hi' }],
  mode: 'mcq',
})
assert.equal(report.score, 100)
assert.ok(report.sections.length >= 1)
assert.ok(report.strengths.length >= 1)
assert.equal(report.templateTitle, getEvaluationTemplate('tpl_cold_call').title)

const freeMessages = [
  { id: '1', role: 'ai', text: 'Alô?' },
  {
    id: '2',
    role: 'user',
    text: 'Bom dia, sou da IMP. Posso ter 30 segundos? Em logística o pipeline trava no follow-up. Você ganha eficiência se marcar 12 minutos de discovery na próxima semana.',
  },
]
const freeReport = buildSessionEvaluation({
  session,
  scenario: bundle.scenario,
  persona: bundle.persona,
  templateId: bundle.template.id,
  answers: [],
  messages: freeMessages,
  mode: 'free',
})
assert.ok(freeReport.score >= 40, 'keyword-rich free text should score meaningfully')
assert.equal(freeReport.mode, 'free')
assert.ok(freeReport.answers[0]?.mode === 'free')

console.log('training-ai scoring smoke: OK')
