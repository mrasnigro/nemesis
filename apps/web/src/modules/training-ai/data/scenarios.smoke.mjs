/**
 * Smoke checks for the scenario form model.
 * Run: node src/modules/training-ai/data/scenarios.smoke.mjs
 */
import assert from 'node:assert/strict'
import { createEmptyScenarioDraft, getScenario, normalizeScenarioInput } from './scenarios.js'

const draft = createEmptyScenarioDraft({ personaId: 'per_1' })
assert.equal(draft.personaId, 'per_1')
assert.equal(draft.evaluationTemplateId, '', 'no default playbook: the administrator picks one')

const bad = normalizeScenarioInput({ title: '' })
assert.equal(bad.ok, false)
assert.ok(bad.errors.length >= 1)

const input = {
  title: 'Cold call logístico',
  description: 'Abertura com decisora cética.',
  industry: 'Logística',
  objective: 'Marcar discovery de 12 minutos.',
  difficulty: 'beginner',
  personaId: 'per_1',
  evaluationTemplateId: 'tpl_1',
  sellerInstructions: 'Peça permissão e proponha agenda.',
  scriptHintsText: 'Permissão\nAgenda',
  focusText: 'Rapport, Agenda',
}

const unknownTemplate = normalizeScenarioInput(input)
assert.equal(unknownTemplate.ok, false, 'the playbook must exist')

const good = normalizeScenarioInput(input, { templateLookup: (id) => (id === 'tpl_1' ? { id } : null) })
assert.equal(good.ok, true)
assert.equal(good.scenario.segment, 'Logística')
assert.deepEqual(good.scenario.scriptHints, ['Permissão', 'Agenda'])
assert.ok(good.scenario.focus.includes('Rapport'))

assert.equal(getScenario('s1', [{ id: 's1' }]).id, 's1')
assert.equal(getScenario('s1'), null)

console.log('training-ai scenarios smoke: OK')