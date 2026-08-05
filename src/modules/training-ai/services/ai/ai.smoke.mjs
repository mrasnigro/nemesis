/**
 * Smoke: AI provider abstraction (mock only — no external API).
 * Run: node src/modules/training-ai/services/ai/ai.smoke.mjs
 */
import assert from 'node:assert/strict'
import { getPersona } from '../../data/personas.js'
import { resolveScenarioBundle } from '../../data/seeds.js'
import {
  assertAiProvider,
  configureConversationProvider,
  createConversationEngine,
  createMockAiProvider,
  generateMockReply,
  getConversationEngine,
  resetConversationEngine,
} from './index.js'

resetConversationEngine()

const provider = createMockAiProvider()
assertAiProvider(provider)
assert.equal(provider.id, 'mock')

const bundle = resolveScenarioBundle('scn_001')
const persona = getPersona('per_marina')

const direct = generateMockReply({
  persona,
  scenario: bundle.scenario,
  scriptTurns: bundle.turns,
  exchangeIndex: 0,
  userText: 'Bom dia, posso ter 30 segundos?',
})
assert.ok(typeof direct === 'string' && direct.length > 5)

const response = provider.generatePersonaReply({
  persona,
  scenario: bundle.scenario,
  scriptTurns: bundle.turns,
  exchangeIndex: 0,
  userText: 'Bom dia, posso ter 30 segundos?',
})
assert.equal(response.provider, 'mock')
assert.ok(response.text.length > 5)

const engine = createConversationEngine({ provider })
const opening = engine.createOpeningMessage({
  persona,
  scriptTurns: bundle.turns,
})
assert.equal(opening.role, 'ai')
assert.ok(opening.timestamp)
assert.ok(opening.text)

const user = engine.createUserMessage('Quero marcar uma agenda de discovery.')
assert.equal(user.role, 'user')

const reply = engine.generateReplyMessage({
  persona,
  scenario: bundle.scenario,
  scriptTurns: bundle.turns,
  exchangeIndex: 0,
  userText: user.text,
  messages: [opening],
})
assert.equal(reply.role, 'ai')
assert.equal(reply.provider, 'mock')
assert.ok(reply.text)

const asyncReply = await engine.generateReplyMessageAsync({
  persona,
  scenario: bundle.scenario,
  scriptTurns: bundle.turns,
  exchangeIndex: 1,
  userText: 'Vamos falar de valor e piloto.',
})
assert.equal(asyncReply.role, 'ai')

// Swappable stub provider — same engine API, no context change.
const stub = {
  id: 'stub',
  generatePersonaReply() {
    return { text: 'Resposta stub do provider.', provider: 'stub', finishReason: 'stop' }
  },
}
configureConversationProvider(stub)
const swapped = getConversationEngine().generateReplyMessage({
  persona,
  scenario: bundle.scenario,
  exchangeIndex: 0,
  userText: 'oi',
})
assert.equal(swapped.text, 'Resposta stub do provider.')
assert.equal(swapped.provider, 'stub')

resetConversationEngine()
assert.equal(getConversationEngine().getProvider().id, 'mock')

let threw = false
try {
  assertAiProvider({ id: 'x' })
} catch {
  threw = true
}
assert.equal(threw, true)

console.log('training-ai ai provider smoke: OK')
