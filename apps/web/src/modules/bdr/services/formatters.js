export function formatDurationHHMMSS(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const hh = String(Math.floor(s / 3600)).padStart(2, '0')
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export function formatDurationShort(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const mm = Math.floor(s / 60)
  const ss = s % 60
  return `${mm}m ${String(ss).padStart(2, '0')}s`
}

export function formatTimestampPtBr(date = new Date()) {
  return date.toLocaleString('pt-BR')
}

export function campaignStatusLabel(status) {
  if (status === 'active') return 'Ativa'
  if (status === 'paused') return 'Pausada'
  return status
}
