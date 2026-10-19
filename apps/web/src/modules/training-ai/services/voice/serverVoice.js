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
        // No recording, or a broken one: the phone's own voice covers the line. A blocked recording waits for a tap.
        if (error?.name === 'NotAllowedError') return null
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

/** A short valid silent WAV. Playing it inside a tap is what lets a phone play the real MP3 afterwards. */
function silentWavUrl() {
  const samples = 160
  const bytes = samples * 2
  const buffer = new ArrayBuffer(44 + bytes)
  const view = new DataView(buffer)
  const text = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index))
  }
  text(0, 'RIFF')
  view.setUint32(4, 36 + bytes, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 8000, true)
  view.setUint32(28, 16000, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, bytes, true)
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
}

/**
 * Phones (iOS Safari, Android Chrome) only let a page play sound after a tap, and the permission belongs to
 * the audio element that was started in that tap. One element is therefore unlocked on the first tap and
 * reused for every sentence; a new `Audio` per sentence, started after a network call, stays silent.
 */
let player = null
let unlocked = false
let silenceUrl = ''
/** Set when the phone blocked the MP3. The next tap plays that same recording instead of the phone's own voice. */
let retryPlayback = null
let blockedHandler = null

function sharedPlayer() {
  if (!player && typeof Audio !== 'undefined') {
    player = new Audio()
    player.preload = 'auto'
    player.playsInline = true
    player.setAttribute?.('playsinline', '')
  }
  return player
}

/** The page shows "tap to enable sound" while playback is blocked, and hides it once the MP3 starts. */
export function setServerPlaybackBlockedHandler(handler) {
  blockedHandler = handler
}

/** Call from a tap or click handler, before any await. Safe to call many times. */
export function unlockServerAudio() {
  const audio = sharedPlayer()
  if (!audio) return
  if (retryPlayback) {
    const retry = retryPlayback
    retryPlayback = null
    unlocked = true
    retry()
    return
  }
  if (unlocked) return
  if (!silenceUrl) silenceUrl = silentWavUrl()
  audio.src = silenceUrl
  audio
    .play()
    .then(() => {
      unlocked = true
      if (silenceUrl && audio.src === silenceUrl) audio.pause()
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
      if (retryPlayback === start) retryPlayback = null
      URL.revokeObjectURL(url)
      audio.onended = null
      audio.onerror = null
      if (current?.audio === audio) current = null
      if (error) reject(error)
      else resolve()
    }
    const start = () => {
      audio.onended = () => finish()
      audio.onerror = () => finish(new Error('playback failed'))
      audio.src = url
      const played = audio.play()
      played
        ?.then(() => blockedHandler?.(false))
        .catch((error) => {
          // A phone that blocks autoplay must not fall through to its own voice: that voice is a
          // different speed. Hold this exact MP3 and play it on the next tap.
          if (error?.name === 'NotAllowedError' && !settled) {
            retryPlayback = start
            blockedHandler?.(true)
            return
          }
          finish(error)
        })
    }
    current = {
      audio,
      stop: () => {
        if (retryPlayback === start) retryPlayback = null
        audio.pause()
        finish()
      },
    }
    start()
  })
}
