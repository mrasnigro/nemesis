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
import { SEED_HISTORY, SEED_MEETINGS } from '../data/seeds.js'
import { CALL_SITUATIONS, CLIENT_STATUSES } from '../data/catalogs.js'

assert.equal(dispositionToClientStatus('interested'), 'Em negociação whatsApp')
assert.equal(dispositionToClientStatus('callback', { hasMeeting: true }), 'Agendado')
assert.equal(dispositionToClientStatus('no_interest'), 'Sem Interesse')

const atendidas = filterHistoryRows(SEED_HISTORY, { situation: 'Atendida' })
assert.ok(atendidas.length >= 2)
assert.ok(atendidas.every((r) => r.callStatus === 'Atendida'))

const agendados = filterHistoryRows(SEED_HISTORY, { clientStatus: 'Agendado' })
assert.ok(agendados.some((r) => r.id === 'h3'))

const day = meetingsForDate(SEED_MEETINGS, '2026-07-31')
assert.equal(day.length, 1)
assert.equal(day[0].leadName, 'Maria Santos')

const grid = buildMonthGrid(2026, 6) // July
assert.ok(grid.some((c) => c && c.iso === '2026-07-31'))

const summary = formatDiagnosisSummary(SEED_HISTORY[0].diagnosis)
assert.ok(summary.some((line) => line.includes('Termômetro')))

assert.equal(CALL_SITUATIONS.length, 7)
assert.equal(CLIENT_STATUSES.length, 5)
assert.ok(SEED_HISTORY.every((r) => r.diagnosis && typeof r.diagnosis === 'object'))
assert.ok(SEED_MEETINGS.every((m) => m.notes !== undefined))

console.log('historyMapping.smoke: OK')
