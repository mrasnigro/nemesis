/** Derive short trait pills from persona fields. */

const TRAIT_FROM_NEGOTIATOR = {
  'Cliente Analítico': ['Analítico', 'Objetivo'],
  'Cliente Dominante': ['Dominante', 'Direto'],
  'Cliente Expressivo': ['Expressivo', 'Energético'],
  'Cliente Amigável': ['Amigável', 'Colaborativo'],
}

export function derivePersonaTraits(persona = {}) {
  if (Array.isArray(persona.traits) && persona.traits.length) {
    return persona.traits.slice(0, 3)
  }
  const fromType = TRAIT_FROM_NEGOTIATOR[persona.negotiatorType] || ['Consultivo']
  const moodParts = String(persona.mood || persona.behavior || '')
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2)
  const merged = [...fromType]
  for (const part of moodParts) {
    const word = part.split(/\s+/)[0]
    if (word && !merged.some((t) => t.toLowerCase() === word.toLowerCase())) {
      merged.push(word.charAt(0).toUpperCase() + word.slice(1))
    }
    if (merged.length >= 3) break
  }
  return merged.slice(0, 3)
}

export function personaStatus(persona = {}) {
  const status = persona.status || 'active'
  if (status === 'paused') return { id: 'paused', label: 'Pausado', tone: 'amber' }
  if (status === 'inactive') return { id: 'inactive', label: 'Inativo', tone: 'muted' }
  return { id: 'active', label: 'Ativo', tone: 'green' }
}

export function sectionWeightsFromTemplate(template) {
  return (template?.sections || []).map((section) => ({
    id: section.id,
    name: section.name,
    weight: (section.criteria || []).reduce((sum, c) => sum + (Number(c.weight) || 0), 0),
  }))
}

export function estimateSessionMetrics(report) {
  const messages = report?.messages || []
  const userMsgs = messages.filter((m) => m.role === 'user')
  const aiMsgs = messages.filter((m) => m.role === 'ai')
  const times = messages
    .map((m) => (m.timestamp ? new Date(m.timestamp).getTime() : null))
    .filter((t) => Number.isFinite(t))
  let durationSec = 0
  if (times.length >= 2) {
    durationSec = Math.max(0, Math.round((Math.max(...times) - Math.min(...times)) / 1000))
  } else {
    durationSec = Math.max(60, messages.length * 25)
  }
  const mm = String(Math.floor(durationSec / 60)).padStart(2, '0')
  const ss = String(durationSec % 60).padStart(2, '0')
  const talkShare =
    userMsgs.length + aiMsgs.length
      ? Math.round((userMsgs.length / (userMsgs.length + aiMsgs.length)) * 100)
      : 0

  return {
    durationLabel: `${mm}:${ss}`,
    messageCount: messages.length,
    userMessageCount: userMsgs.length,
    talkShare,
    questionHints: userMsgs.filter((m) => /\?|por que|como|quando|quem/i.test(m.text || ''))
      .length,
  }
}
