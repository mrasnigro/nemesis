/**
 * Normalize Webinar API list DTO vs detail DB row into one IMP shape.
 */

const STATUS_LABELS = {
  draft: 'Rascunho',
  scheduled: 'Agendado',
  live: 'Ao vivo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

export function webinarStatusLabel(status) {
  return STATUS_LABELS[status] || status || '—'
}

export function webinarStatusTone(status) {
  if (status === 'live') return 'green'
  if (status === 'scheduled') return 'blue'
  if (status === 'completed') return 'muted'
  if (status === 'cancelled') return 'amber'
  return 'muted'
}

export function normalizeWebinar(raw = {}) {
  const id = String(raw.id ?? '')
  const scheduledDate = raw.scheduledDate || raw.date || null
  const durationMinutes = Number(raw.durationMinutes ?? raw.duration ?? 0) || 0
  const presenterName = raw.presenterName || raw.instructor || ''
  const status = raw.status || 'draft'

  return {
    id,
    title: raw.title || `Webinar #${id}`,
    description: raw.description || '',
    status,
    scheduledDate,
    durationMinutes,
    presenterName,
    timezone: raw.timezone || '',
    maxParticipants: raw.maxParticipants ?? null,
    clientId: raw.clientId ?? null,
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
    raw,
  }
}

export function normalizeWebinarList(payload) {
  const list = Array.isArray(payload)
    ? payload
    : payload?.items || payload?.data || payload?.webinars || []
  return list.map(normalizeWebinar).filter((item) => item.id)
}

export function formatWebinarWhen(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return String(iso)
  }
}
