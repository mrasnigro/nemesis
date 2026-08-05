/**
 * Smoke checks for free-text conversation mocks.
 * Run: node src/modules/training-ai/services/conversation.smoke.mjs
 */
import assert from 'node:assert/strict'
import { getPersona } from '../data/personas.js'
import { resolveScenarioBundle } from '../data/seeds.js'
import {
  buildFreeTextAnswers,
  createConversationMessage,
  generateMockReply,
} from './conversation.js'
import { buildSessionEvaluation } from './scoring.js'

const msg = createConversationMessage({
  role: 'user',
  speaker: 'Você',
  text: 'Bom dia, posso ter um momento?',
})
assert.equal(msg.role, 'user')
assert.ok(msg.timestamp)
assert.ok(msg.id)
assert.equal(msg.speaker, 'Você')

const bundle = resolveScenarioBundle('scn_001')
const persona = getPersona('per_marina')
assert.ok(persona)

const reply0 = generateMockReply({
  persona,
  scenario: bundle.scenario,
  scriptTurns: bundle.turns,
  exchangeIndex: 0,
  userText: 'Bom dia, posso ter 30 segundos?',
})
assert.ok(typeof reply0 === 'string' && reply0.length > 10)

const reply1 = generateMockReply({
  persona,
  scenario: bundle.scenario,
  scriptTurns: bundle.turns,
  exchangeIndex: 1,
  userText: 'Queria marcar uma agenda de discovery.',
})
assert.ok(reply1.length > 10)

const answers = buildFreeTextAnswers({
  template: bundle.template,
  userMessages: [
    {
      text: 'Bom dia, sou da IMP. Posso ter 30 segundos? Em logística o insight é claro. Você ganha eficiência. Posso envolver o diretor e marcar 12 minutos na próxima semana?',
    },
  ],
})
assert.equal(answers.length, 1)
assert.equal(answers[0].mode, 'free')
assert.equal(answers[0].rubricImpact.crit_saudacao, true)
assert.equal(answers[0].rubricImpact.crit_permissao, true)

const report = buildSessionEvaluation({
  session: { id: 'sess_free', scenarioId: 'scn_001', personaId: persona.id, mode: 'free' },
  scenario: bundle.scenario,
  persona,
  templateId: 'tpl_cold_call',
  messages: [
    createConversationMessage({ role: 'ai', speaker: persona.name, text: persona.openingLine }),
    createConversationMessage({
      role: 'user',
      speaker: 'Você',
      text: 'Bom dia, sou da IMP. Posso ter 30 segundos e marcar 12 minutos de discovery?',
    }),
  ],
  mode: 'free',
})
assert.ok(report.score >= 20)
assert.equal(report.mode, 'free')
assert.ok(report.messages.some((m) => m.role === 'user' && m.timestamp))

console.log('training-ai conversation smoke: OK')
