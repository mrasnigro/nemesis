/**
 * Smoke: avatar provider abstraction (mock only — no real video/lip-sync).
 * Run: node src/modules/training-ai/services/avatar/avatar.smoke.mjs
 */
import assert from 'node:assert/strict'
import { getPersona } from '../../data/personas.js'
import {
  assertAvatarProvider,
  configureAvatarProvider,
  createAvatarEngine,
  createMockAvatarProvider,
  estimateSpeechDurationMs,
  getAvatarEngine,
  resetAvatarEngine,
} from './index.js'

resetAvatarEngine({ provider: createMockAvatarProvider() })

const provider = createMockAvatarProvider()
assertAvatarProvider(provider)
assert.equal(provider.id, 'mock')

assert.equal(estimateSpeechDurationMs(''), 1200)
assert.ok(estimateSpeechDurationMs('uma frase curta de teste') >= 1200)

const persona = getPersona('per_marina')

const engine = createAvatarEngine({ provider })
const sessionRef = await engine.ensureSession(persona)
assert.ok(sessionRef)

const sameSessionRef = await engine.ensureSession(persona)
assert.equal(sameSessionRef, sessionRef, 'session should be reused for the same persona')

const spoken = await engine.speak(persona, 'Alô? Marina falando.')
assert.equal(spoken.provider, 'mock')
assert.ok(spoken.durationMs > 0)
assert.equal(spoken.text, 'Alô? Marina falando.')

await engine.stopSession()

// Swappable stub provider — same engine API, no caller change.
const stub = {
  id: 'stub',
  startSession() {
    return { sessionRef: 'stub_session' }
  },
  speak() {
    return { durationMs: 1, text: 'stub', provider: 'stub' }
  },
}
configureAvatarProvider(stub)
const stubReply = await getAvatarEngine().speak(persona, 'oi')
assert.equal(stubReply.provider, 'stub')

resetAvatarEngine({ provider: createMockAvatarProvider() })
assert.equal(getAvatarEngine().getProvider().id, 'mock')

let threw = false
try {
  assertAvatarProvider({ id: 'x' })
} catch {
  threw = true
}
assert.equal(threw, true)

console.log('training-ai avatar provider smoke: OK')
