type Level = 'debug' | 'info' | 'warn' | 'error'

const silent = process.env.NODE_ENV === 'test'

/** One JSON object per line on stdout/stderr, ready for any log collector. */
export function log(level: Level, message: string, fields: Record<string, unknown> = {}) {
  if (silent && level !== 'error') return
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...fields })
  if (level === 'error' || level === 'warn') {
    console.error(line)
  } else {
    console.log(line)
  }
}
