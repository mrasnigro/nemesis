/**
 * Browser avatar provider — the persona really speaks, using the browser's speech synthesis (Web Speech API).
 * No video and no lip-sync: PersonaCallStage animates the avatar ring while the utterance plays.
 * A video avatar (HeyGen, D-ID...) would be another provider behind the same contract.
 */

import { assertAvatarProvider } from './provider.js'
import { estimateSpeechDurationMs } from './mockAvatarProvider.js'
import { getVoiceOption } from '../../utils/voiceSession.js'

export function isBrowserSpeechSupported(scope = globalThis) {
  return Boolean(scope?.speechSynthesis && scope?.SpeechSynthesisUtterance)
}

/** `voice_warm_f` / `voice_firm_m` → 'f' | 'm' | null */
const NAMED_GENDER = {
  athena: 'f',
  bella: 'f',
  borges: 'm',
  carla: 'f',
  carlos: 'm',
  christopher: 'm',
  conrado: 'm',
}

function genderOf(voiceRef) {
  const option = getVoiceOption(voiceRef)
  if (option?.gender === 'f' || option?.gender === 'm') return option.gender
  const named = NAMED_GENDER[String(voiceRef || '')]
  if (named) return named
  const match = /_(f|m)$/.exec(String(voiceRef || ''))
  return match ? match[1] : null
}

function voiceIndex(voiceRef, size) {
  if (!size) return 0
  let hash = 0
  const key = String(voiceRef || '')
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return Math.abs(hash) % size
}

const FEMALE_HINTS = /(female|feminina|femme|maria|luciana|francisca|vit[oó]ria|google português)/i
const MALE_HINTS = /(\bmale\b|masculin|daniel|felipe|ricardo|antonio|ant[oô]nio)/i

/**
 * Best installed voice for the persona: same language first, then the gender hinted by `voiceRef`.
 * @param {SpeechSynthesisVoice[]} voices
 */
export function pickVoice(voices, language = 'pt-BR', voiceRef = '') {
  const lang = String(language || 'pt-BR').toLowerCase()
  const base = lang.split('-')[0]
  const sameLanguage = voices.filter((voice) => voice.lang?.toLowerCase().startsWith(base))
  const pool = sameLanguage.length ? sameLanguage : voices
  if (!pool.length) return null
  const exact = pool.filter((voice) => voice.lang?.toLowerCase() === lang)
  const candidates = exact.length ? exact : pool
  const gender = genderOf(voiceRef)
  if (gender) {
    const hint = gender === 'f' ? FEMALE_HINTS : MALE_HINTS
    const gendered = candidates.filter((voice) => hint.test(voice.name))
    if (gendered.length) return gendered[voiceIndex(voiceRef, gendered.length)]
  }
  return candidates.find((voice) => voice.default) || candidates[0]
}

function isIosDevice() {
  const nav = globalThis.navigator
  if (!nav) return false
  const agent = nav.userAgent || ''
  return /iPad|iPhone|iPod/.test(agent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
}

function applyTuning(utterance, voiceRef) {
  const option = getVoiceOption(voiceRef)
  utterance.pitch = option?.pitch ?? 1
  const rate = option?.rate ?? 1
  // The iPhone speaks a rate of 1 at about twice Chrome's speed. This path is only the fallback voice.
  utterance.rate = isIosDevice() ? Math.min(0.8, Math.max(0.4, rate * 0.5)) : Math.min(1.5, Math.max(0.7, rate))
  utterance.volume = 1
}

/** Chrome drops an utterance spoken in the same turn as cancel(). */
function speakAfterCancel(synth, utterance) {
  synth.resume?.()
  synth.cancel()
  window.setTimeout(() => {
    synth.resume?.()
    synth.speak(utterance)
  }, 40)
}

let retainedUtterance = null

export function loadSynthVoices(synth = globalThis.speechSynthesis) {
  if (!synth?.getVoices) return Promise.resolve([])
  const ready = synth.getVoices()
  if (ready.length) return Promise.resolve(ready)
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      synth.removeEventListener?.('voiceschanged', finish)
      resolve(synth.getVoices?.() || [])
    }
    synth.addEventListener?.('voiceschanged', finish)
    window.setTimeout(finish, 500)
  })
}

export function stopVoiceSample(synth = globalThis.speechSynthesis) {
  retainedUtterance = null
  synth?.cancel?.()
}

/**
 * Play a short sample of the selected persona voice.
 * Pitch and rate differ even when the OS only has one voice for that language.
 */
export function speakVoiceSample({ voiceRef, text, onEnd, onError } = {}) {
  const synth = globalThis.speechSynthesis
  const Utterance = globalThis.SpeechSynthesisUtterance
  if (!synth || !Utterance) {
    onError?.()
    return
  }
  const option = getVoiceOption(voiceRef)
  const lang = option?.lang || 'pt-BR'
  loadSynthVoices(synth).then((voices) => {
    const utterance = new Utterance(String(text || ''))
    utterance.lang = lang
    const voice = pickVoice(voices, lang, voiceRef)
    if (voice) utterance.voice = voice
    applyTuning(utterance, voiceRef)
    utterance.onend = () => {
      retainedUtterance = null
      onEnd?.()
    }
    utterance.onerror = () => {
      retainedUtterance = null
      onError?.()
    }
    retainedUtterance = utterance
    speakAfterCancel(synth, utterance)
  })
}

let sessionCounter = 0

/**
 * @param {{ synth?: SpeechSynthesis, Utterance?: typeof SpeechSynthesisUtterance }} [options]
 * @returns {import('./provider.js').AvatarProvider}
 */
export function createBrowserAvatarProvider(options = {}) {
  const synth = options.synth ?? globalThis.speechSynthesis
  const Utterance = options.Utterance ?? globalThis.SpeechSynthesisUtterance
  if (!synth || !Utterance) throw new Error('Speech synthesis is not available in this environment')

  const provider = {
    id: 'browser',
    label: 'Voz do navegador',

    startSession({ persona } = {}) {
      sessionCounter += 1
      return { sessionRef: `browser_avatar_${persona?.id || 'persona'}_${sessionCounter}` }
    },

    speak({ text, persona } = {}) {
      const spoken = String(text || '').trim()
      return new Promise((resolve) => {
        const startedAt = Date.now()
        if (!spoken) {
          resolve({ durationMs: 0, text: '', provider: 'browser' })
          return
        }

        const utterance = new Utterance(spoken)
        utterance.lang = persona?.language || getVoiceOption(persona?.voiceRef)?.lang || 'pt-BR'
        const voice = pickVoice(synth.getVoices?.() || [], utterance.lang, persona?.voiceRef)
        if (voice) utterance.voice = voice
        applyTuning(utterance, persona?.voiceRef)

        let settled = false
        const finish = () => {
          if (settled) return
          settled = true
          clearTimeout(guard)
          resolve({ durationMs: Date.now() - startedAt, text: spoken, provider: 'browser' })
        }
        // Some browsers never fire `end` (tab hidden, voices still loading): never leave the call stage stuck.
        const guard = setTimeout(finish, estimateSpeechDurationMs(spoken) * 3 + 2000)
        utterance.onend = finish
        utterance.onerror = finish

        synth.cancel()
        synth.speak(utterance)
      })
    },

    stopSession() {
      synth.cancel()
    },
  }

  assertAvatarProvider(provider)
  return provider
}
