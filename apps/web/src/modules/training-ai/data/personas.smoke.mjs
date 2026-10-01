/**
 * Smoke checks for persona model + scenario linkage.
 * Run: node src/modules/training-ai/data/personas.smoke.mjs
 */
import assert from 'node:assert/strict'
import {
  normalizePersonaInput,
  seedPersonas,
} from './personas.js'
import { resolveScenarioBundle, scenariosForPersona, trainingScenarios } from './seeds.js'

assert.ok(seedPersonas.every((p) => p.industry && p.behavior && p.trainingObjective))
assert.ok(seedPersonas.every((p) => Array.isArray(p.objections) && p.objections.length > 0))

const linked = scenariosForPersona('per_marina')
assert.equal(linked.length, 1)
assert.equal(linked[0].id, 'scn_001')

const draft = normalizePersonaInput({
  name: 'Teste',
  role: 'CEO',
  industry: 'Tecnologia',
  behavior: 'Direto',
  difficulty: 'advanced',
  trainingObjective: 'Praticar discovery',
  objectionsText: 'Sem tempo\nJá tenho fornecedor',
})
assert.equal(draft.ok, true)
assert.equal(draft.persona.objections.length, 2)

const bad = normalizePersonaInput({ name: '' })
assert.equal(bad.ok, false)

const personasState = [...seedPersonas, { ...draft.persona, id: 'per_new' }]
const lookup = (id) => personasState.find((p) => p.id === id) || null
const bundle = resolveScenarioBundle('scn_001', lookup)
assert.equal(bundle.persona.name, 'Marina Costa')

assert.equal(trainingScenarios.every((s) => Boolean(lookup(s.personaId))), true)

console.log('training-ai personas smoke: OK')
