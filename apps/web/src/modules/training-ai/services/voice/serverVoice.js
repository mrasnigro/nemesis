/**
 * Server voice for practice calls: the API turns the trainee's speech into text and the persona's line into
 * speech (any OpenAI-compatible STT/TTS). The language model in between is the same one as in text mode.
 * Where the server has no voice provider, or it fails, the browser's own recognition and voice take over.
 */

import { getVoiceOption } from '../../utils/voiceSession.js'

/** 'f' | 'm': picks the server voice that suits the persona. */
export function personaGender(voiceRef) {
  const option = getVoiceOption(voiceRef)
  if (option?.gender === 'f' || option?.gender === 'm') return option.gender
  const match = /_(f|m)$/.exec(String(voiceRef || ''))
  return match ? match[1] : 'f'
}

/** Speech models invent subtitles for near-silence; those are not something the trainee said. */
const SILENCE_HALLUCINATIONS = /(amara\.org|legendas? (pela|por) |obrigado por assistir|inscreva-se)/i

export function isLikelyHallucination(text) {
  const value = String(text || '').trim()
  return !value || SILENCE_HALLUCINATIONS.test(value)
}

let current = null

export function stopServerSpeech() {
  current?.stop()
  current = null
}

/** Plays an MP3 blob. Resolves when it ends (or is stopped); rejects when the browser cannot play it. */
export function playServerSpeech(blob) {
  stopServerSpeech()
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    let settled = false
    const finish = (error) => {
      if (settled) return
      settled = true
      URL.revokeObjectURL(url)
      if (current?.audio === audio) current = null
      if (error) reject(error)
      else resolve()
    }
    audio.onended = () => finish()
    audio.onerror = () => finish(new Error('playback failed'))
    current = { audio, stop: () => audio.pause() || finish() }
    audio.play().catch((error) => finish(error))
  })
}
