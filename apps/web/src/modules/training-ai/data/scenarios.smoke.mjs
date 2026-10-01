/**
 * Smoke checks for Training IA scenario model.
 * Run: node src/modules/training-ai/data/scenarios.smoke.mjs
 */
import assert from 'node:assert/strict'
import { getPersona, seedPersonas } from './personas.js'
import { getEvaluationTemplate } from './evaluationTemplates.js'
import {
  createEmptyScenarioDraft,
  normalizeScenarioInput,
  seedScenarios,
  scenariosForPersona,
} from './scenarios.js'
import { resolveScenarioBundle } from './seeds.js'

assert.ok(seedScenarios.length >= 3)

for (const scenario of seedScenarios) {
  assert.ok(scenario.title)
  assert.ok(scenario.description)
  assert.ok(scenario.industry || scenario.segment)
  assert.ok(scenario.objective)
  assert.ok(scenario.personaId)
  assert.ok(scenario.evaluationTemplateId)
  assert.ok(scenario.sellerInstructions)
  assert.ok(getPersona(scenario.personaId))
  assert.ok(getEvaluationTemplate(scenario.evaluationTemplateId))
}

const linked = scenariosForPersona('per_marina', seedScenarios)
assert.ok(linked.some((s) => s.id === 'scn_001'))

const draft = createEmptyScenarioDraft({ personaId: seedPersonas[0].id })
assert.equal(draft.personaId, seedPersonas[0].id)

const bad = normalizeScenarioInput({ title: '' })
assert.equal(bad.ok, false)
assert.ok(bad.errors.length >= 1)

const good = normalizeScenarioInput({
  title: 'Cold call logistico',
  description: 'Abertura com decisora cética.',
  industry: 'Logística',
  objective: 'Marcar discovery de 12 minutos.',
  difficulty: 'beginner',
  personaId: 'per_marina',
  evaluationTemplateId: 'tpl_cold_call',
  sellerInstructions: 'Peça permissão e proponha agenda.',
  scriptHintsText: 'Permissão\nAgenda',
  focusText: 'Rapport, Agenda',
})
assert.equal(good.ok, true)
assert.equal(good.scenario.segment, 'Logística')
assert.deepEqual(good.scenario.scriptHints, ['Permissão', 'Agenda'])
assert.ok(good.scenario.focus.includes('Rapport'))

const lookup = (id) => seedPersonas.find((p) => p.id === id) || null
const liveScenarios = [
  ...seedScenarios,
  { id: 'scn_custom', ...good.scenario },
]
const bundle = resolveScenarioBundle('scn_custom', lookup, liveScenarios)
assert.ok(bundle?.scenario)
assert.equal(bundle.scenario.title, 'Cold call logistico')
assert.equal(bundle.persona?.id, 'per_marina')
assert.equal(bundle.template?.id, 'tpl_cold_call')
assert.deepEqual(bundle.turns, [])

const seedBundle = resolveScenarioBundle('scn_001')
assert.ok(seedBundle.turns.length >= 1)

console.log('training-ai scenarios smoke: OK')
