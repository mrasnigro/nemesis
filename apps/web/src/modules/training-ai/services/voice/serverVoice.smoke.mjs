import assert from 'node:assert/strict'
import { isLikelyHallucination, personaGender } from './serverVoice.js'
import { isServerCaptureSupported, micErrorMessage } from './vadCapture.js'

// Server voice picks the persona's gender from the voice reference, with a female default.
assert.equal(personaGender('carlos'), 'm')
assert.equal(personaGender('carla'), 'f')
assert.equal(personaGender('voice_firm_m'), 'm')
assert.equal(personaGender('voice_warm_f'), 'f')
assert.equal(personaGender('something_m'), 'm')
assert.equal(personaGender(''), 'f')
assert.equal(personaGender(undefined), 'f')

// Speech models invent subtitles for silence; they must not become the trainee's turn.
assert.equal(isLikelyHallucination(''), true)
assert.equal(isLikelyHallucination('   '), true)
assert.equal(isLikelyHallucination('Legendas pela comunidade Amara.org'), true)
assert.equal(isLikelyHallucination('Obrigado por assistir!'), true)
assert.equal(isLikelyHallucination('Oi, tudo bem? Aqui é o Pedro da Acme.'), false)

// The hands-free microphone needs getUserMedia, MediaRecorder and an AudioContext.
assert.equal(isServerCaptureSupported({}), false)
assert.equal(isServerCaptureSupported({ navigator: { mediaDevices: { getUserMedia() {} } }, MediaRecorder: class {} }), false)
assert.equal(
  isServerCaptureSupported({
    navigator: { mediaDevices: { getUserMedia() {} } },
    MediaRecorder: class {},
    AudioContext: class {},
  }),
  true,
)

assert.match(micErrorMessage({ name: 'NotAllowedError' }), /bloqueou o microfone/)
assert.match(micErrorMessage({ name: 'NotFoundError' }), /Nenhum microfone/)
assert.match(micErrorMessage(new Error('x')), /Não foi possível usar o microfone/)

console.log('training-ai server voice smoke: OK')
