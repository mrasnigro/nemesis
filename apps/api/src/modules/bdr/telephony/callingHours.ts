export type CallingWindow = {
  callingStart: string | null
  callingEnd: string | null
  callingDays: string
}

const WEEKDAYS: Record<string, string> = {
  Mon: '1',
  Tue: '2',
  Wed: '3',
  Thu: '4',
  Fri: '5',
  Sat: '6',
  Sun: '7',
}

function minutes(value: string) {
  const match = value.match(/(\d{2}):(\d{2})/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return hour * 60 + minute
}

/** Empty start or end means the customer has not limited when the dialer may place calls. */
export function withinCallingHours(now: Date, window: CallingWindow, timeZone: string) {
  if (!window.callingStart || !window.callingEnd) return true
  const start = minutes(window.callingStart)
  const end = minutes(window.callingEnd)
  if (start == null || end == null) return true

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? ''
  const day = WEEKDAYS[weekday]
  const allowed = new Set(
    window.callingDays
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )
  if (!day || !allowed.has(day)) return false

  let hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0')
  if (hour === 24) hour = 0
  const current = hour * 60 + minute
  if (start === end) return true
  if (start < end) return current >= start && current < end
  return current >= start || current < end
}
