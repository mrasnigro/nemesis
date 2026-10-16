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

function base64ToBlob(base64, type = 'audio/mpeg') {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type })
}

/**
 * Plays a streamed reply sentence by sentence, in order, as the sentences arrive.
 * - `push({ text, audio })`: audio is base64 MP3, or null when the server could not voice that sentence
 *   (then `speakFallback(text)` says it with the browser voice).
 * - `close()`: no more sentences are coming; `onIdle` fires once the last one has been played.
 * - `stop()`: silence now (the trainee spoke over the persona); `onIdle` fires once.
 * - `onSentence(text)` fires when a sentence starts playing, to caption it.
 */
export function createSpeechQueue({ onSentence, onIdle, onError, speakFallback, play = playServerSpeech } = {}) {
  const items = []
  let playing = false
  let closed = false
  let stopped = false
  let idled = false

  function idle() {
    if (idled) return
    idled = true
    onIdle?.()
  }

  function pump() {
    if (stopped || playing) return
    const item = items.shift()
    if (!item) {
      if (closed) idle()
      return
    }
    playing = true
    onSentence?.(item.text)
    const spoken = item.audio
      ? Promise.resolve().then(() => play(base64ToBlob(item.audio)))
      : Promise.reject(new Error('no audio'))
    spoken
      .catch((error) => {
        onError?.(error)
        return speakFallback ? speakFallback(item.text) : null
      })
      .catch(() => null)
      .finally(() => {
        playing = false
        pump()
      })
  }

  return {
    push(item) {
      if (stopped || closed) return
      items.push(item)
      pump()
    },
    close() {
      if (stopped || closed) return
      closed = true
      pump()
    },
    stop() {
      if (stopped) return
      stopped = true
      items.length = 0
      stopServerSpeech()
      idle()
    },
    get stopped() {
      return stopped
    },
  }
}

let current = null

export function stopServerSpeech() {
  current?.stop()
  current = null
}

/** A tiny silent WAV: playing it inside a tap is what lets phones play sound later without a tap. */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='

/**
 * Phones (iOS Safari, Android Chrome) only let a page play sound after a tap, and the permission belongs to
 * the audio element that was started in that tap. One element is therefore unlocked on the first tap and
 * reused for every sentence; a new `Audio` per sentence, started after a network call, stays silent.
 */
let player = null
let unlocked = false

function sharedPlayer() {
  if (!player && typeof Audio !== 'undefined') {
    player = new Audio()
    player.preload = 'auto'
    player.setAttribute?.('playsinline', '')
  }
  return player
}

/** Call from a tap or click handler, before any await. Safe to call many times. */
export function unlockServerAudio() {
  if (unlocked) return
  const audio = sharedPlayer()
  if (!audio) return
  audio.src = SILENT_WAV
  audio
    .play()
    .then(() => {
      unlocked = true
      if (audio.src === SILENT_WAV) audio.pause() // a real line may already have taken the element
    })
    .catch(() => {
      /* not a real tap: the next one tries again */
    })
  // The browser's own voice (fallback) needs the same permission.
  try {
    const synth = globalThis.speechSynthesis
    if (synth && typeof SpeechSynthesisUtterance !== 'undefined') {
      const utterance = new SpeechSynthesisUtterance(' ')
      utterance.volume = 0
      synth.speak(utterance)
    }
  } catch {
    /* no speech synthesis */
  }
}

/** Plays an MP3 blob. Resolves when it ends (or is stopped); rejects when the browser cannot play it. */
export function playServerSpeech(blob) {
  stopServerSpeech()
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const audio = sharedPlayer() ?? new Audio()
    let settled = false
    const finish = (error) => {
      if (settled) return
      settled = true
      URL.revokeObjectURL(url)
      audio.onended = null
      audio.onerror = null
      if (current?.audio === audio) current = null
      if (error) reject(error)
      else resolve()
    }
    audio.onended = () => finish()
    audio.onerror = () => finish(new Error('playback failed'))
    current = {
      audio,
      stop: () => {
        audio.pause()
        finish()
      },
    }
    audio.src = url
    audio.play().catch((error) => finish(error))
  })
}
