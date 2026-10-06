/**
 * Voice practice helpers. Sentiment is a keyword estimate shown next to each message, not a model output.
 */

export const VOICE_OPTIONS = [
  { id: 'borges', label: 'Borges · pt-BR', lang: 'pt-BR', gender: 'm' },
  { id: 'carla', label: 'Carla · pt-BR', lang: 'pt-BR', gender: 'f' },
  { id: 'carlos', label: 'Carlos · pt-BR', lang: 'pt-BR', gender: 'm' },
  { id: 'conrado', label: 'Conrado · pt-BR', lang: 'pt-BR', gender: 'm' },
  { id: 'athena', label: 'Athena · en-US', lang: 'en-US', gender: 'f' },
  { id: 'bella', label: 'Bella · en-US', lang: 'en-US', gender: 'f' },
  { id: 'christopher', label: 'Christopher · en-US', lang: 'en-US', gender: 'm' },
  { id: 'voice_neutral_f', label: 'Neutra · feminina', lang: 'pt-BR', gender: 'f' },
  { id: 'voice_neutral_m', label: 'Neutra · masculina', lang: 'pt-BR', gender: 'm' },
  { id: 'voice_warm_f', label: 'Acolhedora · feminina', lang: 'pt-BR', gender: 'f' },
  { id: 'voice_firm_m', label: 'Firme · masculina', lang: 'pt-BR', gender: 'm' },
]

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
