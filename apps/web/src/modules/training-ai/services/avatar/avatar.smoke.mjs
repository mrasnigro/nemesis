/**
 * Smoke: avatar provider abstraction (mock + browser speech) and dictation.
 * Run: node src/modules/training-ai/services/avatar/avatar.smoke.mjs
 */
import assert from 'node:assert/strict'
import {
  assertAvatarProvider,
  configureAvatarProvider,
  createAvatarEngine,
  createBrowserAvatarProvider,
  createMockAvatarProvider,
  estimateSpeechDurationMs,
  getAvatarEngine,
  pickVoice,
  readTrainingAvatarProviderId,
  resetAvatarEngine,
} from './index.js'
import { createSpeechRecognizer, isSpeechRecognitionSupported } from '../voice/speechRecognition.js'

const persona = { id: 'per_test', name: 'Marina', language: 'pt-BR', voiceRef: 'voice_warm_f' }

resetAvatarEngine({ provider: createMockAvatarProvider() })

// --- mock (silent fallback)
const mock = createMockAvatarProvider()
assertAvatarProvider(mock)
assert.equal(mock.id, 'mock')
assert.equal(estimateSpeechDurationMs(''), 1200)
assert.ok(estimateSpeechDurationMs('uma frase curta de teste') >= 1200)

const engine = createAvatarEngine({ provider: mock })
const sessionRef = await engine.ensureSession(persona)
assert.ok(sessionRef)
assert.equal(await engine.ensureSession(persona), sessionRef, 'session should be reused for the same persona')
const spoken = await engine.speak(persona, 'Alô? Marina falando.')
assert.equal(spoken.provider, 'mock')
assert.ok(spoken.durationMs > 0)
await engine.stopSession()

// --- browser speech provider with a fake synthesizer
const voices = [
  { name: 'Google US English', lang: 'en-US', default: true },
  { name: 'Microsoft Daniel - Portuguese (Brazil)', lang: 'pt-BR' },
  { name: 'Microsoft Maria - Portuguese (Brazil)', lang: 'pt-BR' },
]
assert.equal(pickVoice(voices, 'pt-BR', 'voice_warm_f').name, 'Microsoft Maria - Portuguese (Brazil)')
assert.equal(pickVoice(voices, 'pt-BR', 'voice_firm_m').name, 'Microsoft Daniel - Portuguese (Brazil)')
assert.equal(pickVoice([], 'pt-BR'), null)

const spokenLines = []
let cancelled = 0
const fakeSynth = {
  getVoices: () => voices,
  cancel: () => {
    cancelled += 1
  },
  speak: (utterance) => {
    spokenLines.push(utterance)
    setTimeout(() => utterance.onend?.(), 5)
  },
}
class FakeUtterance {
  constructor(text) {
    this.text = text
  }
}
const browser = createBrowserAvatarProvider({ synth: fakeSynth, Utterance: FakeUtterance })
assert.equal(browser.id, 'browser')
const heard = await createAvatarEngine({ provider: browser }).speak(persona, 'Bom dia, tudo bem?')
assert.equal(heard.provider, 'browser')
assert.equal(spokenLines.length, 1)
assert.equal(spokenLines[0].lang, 'pt-BR')
assert.equal(spokenLines[0].voice.name, 'Microsoft Maria - Portuguese (Brazil)')
assert.deepEqual(await browser.speak({ text: '   ', persona }), { durationMs: 0, text: '', provider: 'browser' })
browser.stopSession()
assert.ok(cancelled >= 2)

assert.throws(() => createBrowserAvatarProvider({ synth: null, Utterance: null }))
assert.equal(readTrainingAvatarProviderId({}), 'mock', 'no speech synthesis => silent fallback')
assert.equal(readTrainingAvatarProviderId({ speechSynthesis: {}, SpeechSynthesisUtterance: function () {} }), 'browser')

// --- swappable provider, same engine API
configureAvatarProvider({
  id: 'stub',
  startSession: () => ({ sessionRef: 'stub_session' }),
  speak: () => ({ durationMs: 1, text: 'stub', provider: 'stub' }),
})
assert.equal((await getAvatarEngine().speak(persona, 'oi')).provider, 'stub')
resetAvatarEngine({ provider: createMockAvatarProvider() })
assert.equal(getAvatarEngine().getProvider().id, 'mock')
assert.throws(() => assertAvatarProvider({ id: 'x' }))

// --- dictation
assert.equal(isSpeechRecognitionSupported({}), false)
assert.equal(createSpeechRecognizer({ onText() {}, Recognition: undefined }), null)

class FakeRecognition {
  start() {
    FakeRecognition.last = this
  }
  stop() {
    this.onend?.()
  }
  abort() {}
}
const texts = []
let ended = 0
const errors = []
const recognizer = createSpeechRecognizer({
  lang: 'pt-BR',
  Recognition: FakeRecognition,
  onText: (text) => texts.push(text),
  onEnd: () => {
    ended += 1
  },
  onError: (message) => errors.push(message),
})
recognizer.start('Olá')
const fake = FakeRecognition.last
assert.equal(fake.lang, 'pt-BR')
assert.equal(fake.interimResults, true)
const result = (transcript, isFinal) => Object.assign([{ transcript }], { isFinal })
fake.onresult({ resultIndex: 0, results: [result('tudo bem', false)] })
fake.onresult({ resultIndex: 0, results: [result('tudo bem', true)] })
fake.onresult({ resultIndex: 1, results: [result('tudo bem', true), result('com você', false)] })
assert.deepEqual(texts, ['Olá tudo bem', 'Olá tudo bem', 'Olá tudo bem com você'])
fake.onerror({ error: 'no-speech' })
assert.equal(errors.length, 0)
fake.onerror({ error: 'not-allowed' })
assert.equal(errors.length, 1)
recognizer.stop()
assert.equal(ended, 1)

console.log('training-ai avatar + dictation smoke: OK')
