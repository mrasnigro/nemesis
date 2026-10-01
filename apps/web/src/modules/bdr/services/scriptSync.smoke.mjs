/**
 * Node smoke checks for script → diagnosis sync (no test runner in repo).
 * Run: node src/modules/bdr/services/scriptSync.smoke.mjs
 */
import assert from 'node:assert/strict'
import { isScriptCompleted } from '../data/scriptContent.js'
import { thermometerLabel } from '../data/catalogs.js'
import {
  mapScriptRadioToDiagnosis,
  togglePainSelection,
  commercialDispositionRequiresDepth,
} from './scriptSync.js'
import { OBJECTION_LIBRARY } from '../data/objections.js'
import { DISPOSITIONS } from '../data/catalogs.js'

const equipe = mapScriptRadioToDiagnosis('equipe', '6-20')
assert.equal(equipe.diagnosis.employees, '6-20')
assert.equal(equipe.diagnosis.companySize, 'pequena')

const fat = mapScriptRadioToDiagnosis('faturamento', '200k-500k')
assert.equal(fat.diagnosis.monthlyRevenue, '200k-500k')

const dec = mapScriptRadioToDiagnosis('decisao', 'nao')
assert.equal(dec.diagnosis.partnerPresence, 'nao')

const emptyPains = {
  lucro: false,
  vendas: false,
  gestao: false,
  lideranca: false,
  todos: false,
  nenhum: false,
}
const withLucro = togglePainSelection(emptyPains, 'lucro')
assert.equal(withLucro.pains.lucro, true)
const withTodos = togglePainSelection(withLucro.pains, 'todos')
assert.equal(withTodos.pains.todos, true)
assert.equal(withTodos.pains.lucro, false)

assert.equal(thermometerLabel(30), 'Frio')
assert.equal(thermometerLabel(31), 'Morno')
assert.equal(thermometerLabel(65), 'Morno')
assert.equal(thermometerLabel(66), 'Quente')

assert.equal(DISPOSITIONS.length, 7)
assert.equal(OBJECTION_LIBRARY.length, 7)
assert.equal(
  OBJECTION_LIBRARY.reduce((n, c) => n + c.entries.length, 0),
  24,
)

assert.equal(
  isScriptCompleted({
    completed: true,
    answered: {},
    painsTouched: false,
    section: 'abertura',
  }),
  true,
)

assert.equal(commercialDispositionRequiresDepth('interested'), true)
assert.equal(commercialDispositionRequiresDepth('no_contact'), false)

console.log('scriptSync.smoke: OK')
