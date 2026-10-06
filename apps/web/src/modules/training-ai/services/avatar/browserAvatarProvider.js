/**
 * Browser avatar provider — the persona really speaks, using the browser's speech synthesis (Web Speech API).
 * No video and no lip-sync: PersonaCallStage animates the avatar ring while the utterance plays.
 * A video avatar (HeyGen, D-ID...) would be another provider behind the same contract.
 */

import { assertAvatarProvider } from './provider.js'
import { estimateSpeechDurationMs } from './mockAvatarProvider.js'

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
  const named = NAMED_GENDER[String(voiceRef || '')]
  if (named) return named
  const match = /_(f|m)$/.exec(String(voiceRef || ''))
  return match ? match[1] : null
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
    const match = candidates.find((voice) => hint.test(voice.name))
    if (match) return match
  }
  return candidates.find((voice) => voice.default) || candidates[0]
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
        utterance.lang = persona?.language || 'pt-BR'
        const voice = pickVoice(synth.getVoices?.() || [], utterance.lang, persona?.voiceRef)
        if (voice) utterance.voice = voice
        utterance.rate = 1

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
