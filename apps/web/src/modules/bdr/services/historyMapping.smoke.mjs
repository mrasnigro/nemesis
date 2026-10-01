/**
 * Smoke checks for history/meetings helpers.
 * Run: node src/modules/bdr/services/historyMapping.smoke.mjs
 */
import assert from 'node:assert/strict'
import {
  dispositionToClientStatus,
  filterHistoryRows,
  meetingsForDate,
  buildMonthGrid,
  formatDiagnosisSummary,
} from './historyMapping.js'
import { CALL_SITUATIONS, CLIENT_STATUSES } from '../data/catalogs.js'

// Test fixtures shaped like API responses (these are not application data).
const HISTORY = [
  {
    id: 'h1',
    callStatus: 'Atendida',
    clientStatus: 'Em negociação whatsApp',
    diagnosis: { companySize: 'pequena', employees: '6-20', salesTemperature: 70 },
  },
  { id: 'h2', callStatus: 'Atendida', clientStatus: 'Sem Interesse', diagnosis: { priority: 'baixa' } },
  { id: 'h3', callStatus: 'Atendida', clientStatus: 'Agendado', diagnosis: { painPoints: 'vendas' } },
  { id: 'h4', callStatus: 'Não atendida', clientStatus: '', diagnosis: {} },
]
const MEETINGS = [
  { id: 'm1', leadName: 'Carlos Oliveira', date: '2026-08-06', time: '09:30', notes: '' },
  { id: 'm2', leadName: 'Maria Santos', date: '2026-08-04', time: '14:30', notes: 'Follow-up' },
]

assert.equal(dispositionToClientStatus('interested'), 'Em negociação whatsApp')
assert.equal(dispositionToClientStatus('callback', { hasMeeting: true }), 'Agendado')
assert.equal(dispositionToClientStatus('no_interest'), 'Sem Interesse')

const atendidas = filterHistoryRows(HISTORY, { situation: 'Atendida' })
assert.equal(atendidas.length, 3)
assert.ok(atendidas.every((r) => r.callStatus === 'Atendida'))

const agendados = filterHistoryRows(HISTORY, { clientStatus: 'Agendado' })
assert.deepEqual(
  agendados.map((r) => r.id),
  ['h3'],
)

assert.deepEqual(filterHistoryRows([], { situation: 'Atendida' }), [])

const day = meetingsForDate(MEETINGS, '2026-08-06')
assert.equal(day.length, 1)
assert.equal(day[0].leadName, 'Carlos Oliveira')

const grid = buildMonthGrid(2026, 7) // August
assert.ok(grid.some((c) => c && c.iso === '2026-08-06'))

const summary = formatDiagnosisSummary(HISTORY[0].diagnosis)
assert.ok(summary.some((line) => line.includes('Termômetro')))

assert.equal(CALL_SITUATIONS.length, 7)
assert.equal(CLIENT_STATUSES.length, 5)
console.log('historyMapping.smoke: OK')
