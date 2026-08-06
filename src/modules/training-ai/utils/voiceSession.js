/**
 * Voice UI stubs — no STT/TTS/audio pipeline (report R4 / R3b).
 * Sentiment and timeline are heuristic overlays for Insights composition.
 */

export const VOICE_OPTIONS = [
  { id: 'voice_neutral_f', label: 'Neutra · feminina' },
  { id: 'voice_neutral_m', label: 'Neutra · masculina' },
  { id: 'voice_warm_f', label: 'Acolhedora · feminina' },
  { id: 'voice_firm_m', label: 'Firme · masculina' },
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

function hashBars(seed, count = 48) {
  let x = seed || 1
  const bars = []
  for (let i = 0; i < count; i += 1) {
    x = (x * 1103515245 + 12345) & 0x7fffffff
    bars.push(18 + (x % 72))
  }
  return bars
}

/** Build playhead timeline from chat messages (text sessions act as pseudo-audio). */
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

  const seed =
    items.reduce((sum, m) => sum + String(m.text || '').length, 0) + items.length * 17

  return {
    durationSec,
    bars: hashBars(seed || 42),
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
