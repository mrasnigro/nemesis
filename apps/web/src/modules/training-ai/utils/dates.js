/** Local calendar date helpers shared by History and Dashboards. */

export function toLocalIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatBrDate(iso) {
  const [year, month, day] = String(iso || '').slice(0, 10).split('-')
  if (!year || !month || !day) return String(iso || '')
  return `${day}/${month}/${year}`
}

export function formatClock(isoOrDate) {
  const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(Number(ms) || 0) / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = Math.floor(total % 60)
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}
