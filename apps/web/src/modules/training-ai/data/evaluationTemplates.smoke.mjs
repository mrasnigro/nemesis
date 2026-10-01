/**
 * Smoke checks for evaluation template model + pass rules.
 * Run: node src/modules/training-ai/data/evaluationTemplates.smoke.mjs
 */
import assert from 'node:assert/strict'
import {
  assertTemplateWeights,
  createEmptyTemplateDraft,
  flattenCriteria,
  normalizeTemplateInput,
  seedEvaluationTemplates,
  totalTemplateWeight,
} from './evaluationTemplates.js'
import { buildFreeTextAnswers, evaluateCriterionPassRule } from '../services/conversation.js'
import { buildSessionEvaluation, evaluateRubric } from '../services/scoring.js'
import { resolveScenarioBundle } from './seeds.js'
import { seedScenarios } from './scenarios.js'

for (const template of seedEvaluationTemplates) {
  assert.ok(template.title)
  assert.ok(template.description)
  assert.equal(assertTemplateWeights(template), true, `${template.id} must sum 100`)
  for (const criterion of flattenCriteria(template)) {
    assert.ok(criterion.passRule?.type)
    assert.ok(criterion.passRule.keywords?.length)
    assert.ok(criterion.yesNoQuestion)
  }
}

const draft = createEmptyTemplateDraft()
assert.ok(draft.sections.length >= 1)

const bad = normalizeTemplateInput({ title: 'X', description: '', sections: [] })
assert.equal(bad.ok, false)

const good = normalizeTemplateInput({
  title: 'Rubrica teste',
  description: 'Template custom mock',
  contactType: 'custom',
  sections: [
    {
      name: 'Abertura',
      criteria: [
        {
          name: 'Saudação',
          weight: 40,
          yesNoQuestion: 'Cumprimentou?',
          passRuleType: 'keywords',
          keywordsText: 'bom dia\nolá',
        },
        {
          name: 'Sem pitch agressivo',
          weight: 60,
          yesNoQuestion: 'Evitou pressão indevida?',
          passRuleType: 'avoid_keywords',
          keywordsText: 'compre agora\ndesconto imediato',
        },
      ],
    },
  ],
})
assert.equal(good.ok, true)
assert.equal(totalTemplateWeight(good.template), 100)

const corpusPass = 'bom dia, sou da imp'
assert.equal(
  evaluateCriterionPassRule(good.template.sections[0].criteria[0], corpusPass),
  true,
)
assert.equal(
  evaluateCriterionPassRule(good.template.sections[0].criteria[1], corpusPass),
  true,
)
assert.equal(
  evaluateCriterionPassRule(
    good.template.sections[0].criteria[1],
    'compre agora com desconto imediato',
  ),
  false,
)

const liveTemplate = { id: 'tpl_live', ...good.template }
const answers = buildFreeTextAnswers({
  template: liveTemplate,
  userMessages: [{ text: 'Bom dia, posso ter um momento?' }],
})
assert.equal(answers[0].rubricImpact[liveTemplate.sections[0].criteria[0].id], true)

const rubric = evaluateRubric(liveTemplate, answers)
assert.ok(rubric.score >= 40)

const scenario = seedScenarios[0]
const report = buildSessionEvaluation({
  session: { id: 'sess_tpl', scenarioId: scenario.id, mode: 'free' },
  scenario: { ...scenario, evaluationTemplateId: liveTemplate.id },
  persona: { id: 'per_x', name: 'Teste' },
  template: liveTemplate,
  messages: [
    { role: 'ai', text: 'Alô?' },
    { role: 'user', text: 'Bom dia, sou da IMP.' },
  ],
  mode: 'free',
})
assert.equal(report.templateId, 'tpl_live')
assert.equal(report.templateTitle, 'Rubrica teste')

const bundle = resolveScenarioBundle(
  'scn_001',
  undefined,
  undefined,
  (id) => (id === 'tpl_cold_call' ? seedEvaluationTemplates[0] : null),
)
assert.ok(bundle.template)

console.log('training-ai evaluationTemplates smoke: OK')
