import assert from 'node:assert/strict'
import { createSpeechQueue, isLikelyHallucination, personaGender } from './serverVoice.js'
import { readNdjson } from '../api/ndjson.js'
import { isServerCaptureSupported, micErrorMessage, TURN_END_SILENCE_MS } from './vadCapture.js'

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
assert.equal(TURN_END_SILENCE_MS, 1800, 'leave enough pause for a slower speaker to finish their thought')

// A streamed reply is played sentence by sentence, in order, and the queue reports when it is done.
{
  const b64 = (text) => Buffer.from(text).toString('base64')
  const played = []
  const captions = []
  const spokenByBrowser = []
  let idles = 0
  const queue = createSpeechQueue({
    onSentence: (text) => captions.push(text),
    onIdle: () => (idles += 1),
    speakFallback: async (text) => spokenByBrowser.push(text),
    play: async (blob) => {
      played.push(await blob.text())
      await new Promise((resolve) => setTimeout(resolve, 5))
    },
  })
  queue.push({ text: 'Um.', audio: b64('um') })
  queue.push({ text: 'Dois.', audio: null }) // the server could not voice this one: browser voice covers it
  queue.push({ text: 'Três.', audio: b64('tres') })
  queue.close()
  await new Promise((resolve) => setTimeout(resolve, 80))
  assert.deepEqual(played, ['um', 'tres'])
  assert.deepEqual(spokenByBrowser, ['Dois.'])
  assert.deepEqual(captions, ['Um.', 'Dois.', 'Três.'])
  assert.equal(idles, 1)
}

// Stopping (the trainee spoke over the persona) drops what is left and goes idle once.
{
  const played = []
  let idles = 0
  const queue = createSpeechQueue({
    onIdle: () => (idles += 1),
    play: async () => {
      played.push('x')
      await new Promise((resolve) => setTimeout(resolve, 20))
    },
  })
  const audio = Buffer.from('a').toString('base64')
  queue.push({ text: 'A.', audio })
  queue.push({ text: 'B.', audio })
  queue.stop()
  queue.push({ text: 'C.', audio })
  queue.close()
  await new Promise((resolve) => setTimeout(resolve, 60))
  assert.equal(idles, 1)
  assert.ok(played.length <= 1)
  assert.equal(queue.stopped, true)
}

// The NDJSON reader joins rows split across chunks and skips damaged ones.
{
  const encoder = new TextEncoder()
  const chunks = ['{"type":"sentence","text":"a"}\n{"type":"sen', 'tence","text":"b"}\nnot json\n{"type":"done"}']
  const response = {
    body: {
      getReader() {
        let index = 0
        return {
          async read() {
            if (index >= chunks.length) return { done: true, value: undefined }
            return { done: false, value: encoder.encode(chunks[index++]) }
          },
        }
      },
    },
  }
  const rows = []
  await readNdjson(response, (row) => rows.push(row.type + (row.text || '')))
  assert.deepEqual(rows, ['sentencea', 'sentenceb', 'done'])
}

console.log('training-ai server voice smoke: OK')
