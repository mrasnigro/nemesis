/**
 * Smoke checks for the persona form model.
 * Run: node src/modules/training-ai/data/personas.smoke.mjs
 */
import assert from 'node:assert/strict'
import { createEmptyPersonaDraft, normalizePersonaInput } from './personas.js'
import { scenariosForPersona } from './scenarios.js'

const draft = normalizePersonaInput({
  name: 'Teste',
  role: 'CEO',
  company: 'Acme',
  industry: 'Tecnologia',
  location: 'São Paulo, SP',
  behavior: 'Direto',
  difficulty: 'advanced',
  trainingObjective: 'Praticar discovery',
  sellerInstructions: 'Você está ligando para um lead.',
  evaluationTemplateId: 'tpl_1',
  objectionsText: 'Sem tempo\nJá tenho fornecedor',
  personalDetailsText: 'Agenda apertada',
  prioritiesText: 'Reduzir custo',
  beliefsText: 'Prefere prova no segmento',
  companyFactsText: 'Responde ao board',
  salesModel: 'b2b',
})
assert.equal(draft.ok, true)
assert.equal(draft.persona.objections.length, 2)

const bad = normalizePersonaInput({ name: '' })
assert.equal(bad.ok, false)

assert.equal(createEmptyPersonaDraft().name, '')

const scenarios = [
  { id: 'a', personaId: 'per_1' },
  { id: 'b', personaId: 'per_2' },
]
assert.deepEqual(scenariosForPersona('per_1', scenarios).map((item) => item.id), ['a'])
assert.deepEqual(scenariosForPersona('per_1'), [])

console.log('training-ai personas smoke: OK')