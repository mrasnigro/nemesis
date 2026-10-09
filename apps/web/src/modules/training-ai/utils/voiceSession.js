/**
 * Voice practice helpers. Sentiment is a keyword estimate shown next to each message, not a model output.
 */

export const VOICE_OPTIONS = [
  { id: 'carla', label: 'Carla · média', lang: 'pt-BR', gender: 'f', pitch: 1.12, rate: 1 },
  { id: 'helena', label: 'Helena · grave', lang: 'pt-BR', gender: 'f', pitch: 0.9, rate: 0.92 },
  { id: 'livia', label: 'Lívia · aguda', lang: 'pt-BR', gender: 'f', pitch: 1.38, rate: 1.06 },
  { id: 'marina', label: 'Marina · calma', lang: 'pt-BR', gender: 'f', pitch: 1.02, rate: 0.86 },
  { id: 'ana', label: 'Ana · jovem', lang: 'pt-BR', gender: 'f', pitch: 1.26, rate: 1.12 },
  { id: 'borges', label: 'Borges · média', lang: 'pt-BR', gender: 'm', pitch: 0.74, rate: 0.96 },
  { id: 'carlos', label: 'Carlos · clara', lang: 'pt-BR', gender: 'm', pitch: 0.88, rate: 1.04 },
  { id: 'conrado', label: 'Conrado · grave', lang: 'pt-BR', gender: 'm', pitch: 0.56, rate: 0.9 },
  { id: 'rafael', label: 'Rafael · jovem', lang: 'pt-BR', gender: 'm', pitch: 0.98, rate: 1.12 },
  { id: 'diego', label: 'Diego · firme', lang: 'pt-BR', gender: 'm', pitch: 0.66, rate: 1.06 },
  { id: 'lucia', label: 'Lucía · média', lang: 'es-ES', gender: 'f', pitch: 1.14, rate: 1 },
  { id: 'sofia', label: 'Sofía · grave', lang: 'es-ES', gender: 'f', pitch: 0.92, rate: 0.9 },
  { id: 'mateo', label: 'Mateo · média', lang: 'es-ES', gender: 'm', pitch: 0.76, rate: 0.98 },
  { id: 'andres', label: 'Andrés · grave', lang: 'es-ES', gender: 'm', pitch: 0.58, rate: 0.92 },
  { id: 'athena', label: 'Athena · média', lang: 'en-US', gender: 'f', pitch: 1.16, rate: 1 },
  { id: 'bella', label: 'Bella · calma', lang: 'en-US', gender: 'f', pitch: 1.02, rate: 0.88 },
  { id: 'luna', label: 'Luna · aguda', lang: 'en-US', gender: 'f', pitch: 1.36, rate: 1.08 },
  { id: 'christopher', label: 'Christopher · média', lang: 'en-US', gender: 'm', pitch: 0.8, rate: 1 },
  { id: 'james', label: 'James · grave', lang: 'en-US', gender: 'm', pitch: 0.58, rate: 0.9 },
  { id: 'owen', label: 'Owen · jovem', lang: 'en-US', gender: 'm', pitch: 0.96, rate: 1.1 },
  { id: 'voice_neutral_f', label: 'Neutra · feminina', lang: 'pt-BR', gender: 'f', pitch: 1.1, rate: 1 },
  { id: 'voice_neutral_m', label: 'Neutra · masculina', lang: 'pt-BR', gender: 'm', pitch: 0.8, rate: 1 },
  { id: 'voice_warm_f', label: 'Acolhedora · feminina', lang: 'pt-BR', gender: 'f', pitch: 1.05, rate: 0.9 },
  { id: 'voice_firm_m', label: 'Firme · masculina', lang: 'pt-BR', gender: 'm', pitch: 0.62, rate: 1.02 },
]

export function getVoiceOption(voiceRef) {
  return VOICE_OPTIONS.find((item) => item.id === voiceRef) || null
}

const SAMPLE_TEXT = {
  pt: 'Olá, eu sou a persona desta simulação. Posso falar um pouco mais devagar ou mais firme.',
  es: 'Hola, soy la persona de esta simulación. Puedo hablar más despacio o con más firmeza.',
  en: 'Hello, I am the persona for this simulation. I can speak more slowly, or with a firmer tone.',
}

export function sampleTextFor(lang = 'pt-BR') {
  const code = String(lang || 'pt-BR').toLowerCase()
  if (code.startsWith('en')) return SAMPLE_TEXT.en
  if (code.startsWith('es')) return SAMPLE_TEXT.es
  return SAMPLE_TEXT.pt
}

export const PRACTICE_MEDIA_MODES = [
  { id: 'text', label: 'Texto' },
  { id: 'voice', label: 'Voz' },
]

const POSITIVE = /\b(obrigad|excelente|perfeito|otim|interessante|faz sentido|concordo|combinad)\w*/i
const NEGATIVE =
  /\b(não|nao|caro|difícil|dificil|sem tempo|sem orçamento|orcamento|problema|jamais|impossív)\w*/i
const CURIOUS = /\?|por que|como|quando|quem|qual\b/i

export function estimateMessageSentiment(message = {}) {
  const text = String(message.text || '')
  if (NEGATIVE.test(text) && !POSITIVE.test(text)) {
    return { id: 'negative', label: 'Tensão', tone: 'amber' }
  }
  if (POSITIVE.test(text)) {
    return { id: 'positive', label: 'Positivo', tone: 'green' }
  }
  if (CURIOUS.test(text)) {
    return { id: 'curious', label: 'Curioso', tone: 'blue' }
  }
  return { id: 'neutral', label: 'Neutro', tone: 'muted' }
}

/** Timeline of a conversation: each message placed at its real offset from the first one. */
export function buildSessionTimeline(messages = []) {
  const items = Array.isArray(messages) ? messages : []
  const times = items
    .map((m) => (m.timestamp ? new Date(m.timestamp).getTime() : null))
    .filter((t) => Number.isFinite(t))

  let durationSec = Math.max(45, items.length * 18)
  if (times.length >= 2) {
    durationSec = Math.max(45, Math.round((Math.max(...times) - Math.min(...times)) / 1000) + 8)
  }

  const start = times.length ? Math.min(...times) : Date.now()
  const markers = items.map((message, index) => {
    const sentiment = estimateMessageSentiment(message)
    let atSec =
      message.timestamp && Number.isFinite(new Date(message.timestamp).getTime())
        ? Math.max(0, Math.round((new Date(message.timestamp).getTime() - start) / 1000))
        : Math.round((index / Math.max(1, items.length - 1 || 1)) * (durationSec - 4))
    if (atSec >= durationSec) atSec = Math.max(0, durationSec - 2)
    return {
      id: `mk_${message.id || index}`,
      messageId: message.id,
      atSec,
      role: message.role,
      sentiment,
      label: sentiment.label,
    }
  })

  return {
    durationSec,
    markers,
  }
}

export function formatPlayhead(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export function nearestMessageId(markers = [], atSec = 0) {
  if (!markers.length) return null
  let best = markers[0]
  let bestDist = Math.abs(best.atSec - atSec)
  for (const marker of markers) {
    const dist = Math.abs(marker.atSec - atSec)
    if (dist < bestDist) {
      best = marker
      bestDist = dist
    }
  }
  return best.messageId || null
}
