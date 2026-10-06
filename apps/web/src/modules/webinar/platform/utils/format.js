export const WEBINAR_STATUS = {
  draft: { label: 'Rascunho', tone: 'muted' },
  scheduled: { label: 'Agendado', tone: 'blue' },
  live: { label: 'Ao vivo', tone: 'rose' },
  completed: { label: 'Encerrado', tone: 'green' },
  cancelled: { label: 'Cancelado', tone: 'muted' },
}

export const LEAD_STATUS = {
  registered: { label: 'Inscrito', tone: 'blue' },
  attended: { label: 'Presente', tone: 'green' },
  no_show: { label: 'Faltou', tone: 'rose' },
}

/** Where a customer's subscription stands (the API computes `state`; "expired" is a date in the past). */
export const SUBSCRIPTION_STATE = {
  active: { label: 'Ativa', tone: 'green' },
  expired: { label: 'Vencida', tone: 'rose' },
  suspended: { label: 'Suspensa', tone: 'rose' },
  cancelled: { label: 'Cancelada', tone: 'muted' },
}

export function formatMoney(cents) {
  return (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** A plan limit: null means the plan sets none. */
export function formatLimit(value, unit = '') {
  if (value === null || value === undefined) return 'Sem limite'
  return `${value.toLocaleString('pt-BR')}${unit}`
}

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR')
}

/** Status changes an owner can make from the detail page, by current status. */
export const STATUS_ACTIONS = {
  draft: [{ to: 'scheduled', label: 'Publicar agendamento', primary: true }],
  scheduled: [
    { to: 'draft', label: 'Voltar a rascunho' },
    { to: 'cancelled', label: 'Cancelar' },
  ],
  live: [{ to: 'completed', label: 'Encerrar', primary: true }],
  completed: [],
  cancelled: [{ to: 'draft', label: 'Reabrir como rascunho' }],
}

export function formatDateTime(value, timeZone) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', ...(timeZone ? { timeZone } : {}) })
}

export function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Zones offered in the webinar form. The browser's own zone and the webinar's current one are added. */
const COMMON_ZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Rio_Branco',
  'America/Noronha',
  'America/New_York',
  'Europe/Lisbon',
  'UTC',
]

export const DEFAULT_TIMEZONE = 'America/Sao_Paulo'

export function timezoneOptions(current) {
  const browser = Intl.DateTimeFormat().resolvedOptions().timeZone
  return [...new Set([current, ...COMMON_ZONES, browser].filter(Boolean))]
}

/** Calendar fields of an instant as seen on a wall clock in `timeZone`. */
function wallClock(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  )
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

/** ISO instant → value for <input type="datetime-local">, read on the clock of `timeZone`. */
export function toLocalInput(value, timeZone = DEFAULT_TIMEZONE) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const w = wallClock(date, timeZone)
  const pad = (n) => String(n).padStart(2, '0')
  return `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}`
}

/**
 * <input type="datetime-local"> value typed on the clock of `timeZone` → ISO instant (UTC), or null.
 * The offset is measured at the guessed instant and re-measured once, which settles on daylight-saving changes.
 */
export function fromLocalInput(value, timeZone = DEFAULT_TIMEZONE) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value || '')
  if (!match) return null
  const [year, month, day, hour, minute] = match.slice(1).map(Number)
  const wanted = Date.UTC(year, month - 1, day, hour, minute)
  const offsetAt = (instant) => {
    const w = wallClock(new Date(instant), timeZone)
    return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - instant
  }
  let instant = wanted - offsetAt(wanted)
  instant = wanted - offsetAt(instant)
  const result = new Date(instant)
  return Number.isNaN(result.getTime()) ? null : result.toISOString()
}

/** Turns an API error into one readable line (field messages are appended when the server sent them). */
export function errorMessage(error, fallback = 'Algo deu errado. Tente novamente.') {
  if (!error) return ''
  const details = Array.isArray(error.details) ? error.details.filter((item) => item?.message) : []
  const base = error.message || fallback
  if (details.length === 0) return base
  return `${base}: ${details.map((item) => (item.path ? `${item.path} — ${item.message}` : item.message)).join('; ')}`
}

/** The page a visitor opens with a code already filled in. */
export function publicJoinUrl(code) {
  return `${window.location.origin}/webinar/entrar?codigo=${encodeURIComponent(code)}`
}
