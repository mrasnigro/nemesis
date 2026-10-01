/**
 * Smoke checks for the playbook (evaluation template) form model.
 * Scoring itself lives on the server (apps/api/tests/training.test.ts).
 * Run: node src/modules/training-ai/data/evaluationTemplates.smoke.mjs
 */
import assert from 'node:assert/strict'
import {
  assertTemplateWeights,
  createEmptyTemplateDraft,
  flattenCriteria,
  getEvaluationTemplate,
  normalizeTemplateInput,
  publishedTemplates,
  scenariosUsingTemplate,
  totalTemplateWeight,
} from './evaluationTemplates.js'

const draft = createEmptyTemplateDraft()
assert.ok(draft.sections.length >= 1)

const bad = normalizeTemplateInput({ title: 'X', description: '', sections: [] })
assert.equal(bad.ok, false)

const good = normalizeTemplateInput({
  title: 'Rubrica teste',
  description: 'Playbook de teste',
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
assert.equal(assertTemplateWeights(good.template), true)

const criteria = flattenCriteria(good.template)
assert.equal(criteria.length, 2)
assert.deepEqual(criteria[0].passRule, { type: 'keywords', keywords: ['bom dia', 'olá'] })
assert.deepEqual(criteria[1].passRule.keywords, ['compre agora', 'desconto imediato'])

const unbalanced = normalizeTemplateInput({
  ...good.template,
  sections: [{ ...good.template.sections[0], criteria: [{ ...good.template.sections[0].criteria[0], weight: 10 }] }],
})
assert.equal(unbalanced.ok, false, 'weights must add up to 100')

const live = { id: 'tpl_live', ...good.template }
assert.equal(getEvaluationTemplate('tpl_live', [live]).title, 'Rubrica teste')
assert.equal(getEvaluationTemplate('missing'), null)
assert.equal(good.template.status, 'draft', 'new playbooks start as drafts')
assert.equal(publishedTemplates([live, { id: 'p', status: 'published' }]).length, 1)
assert.equal(scenariosUsingTemplate('tpl_live', [{ evaluationTemplateId: 'tpl_live' }, { evaluationTemplateId: 'x' }]).length, 1)

console.log('training-ai evaluationTemplates smoke: OK')