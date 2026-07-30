import { DISPOSITIONS, thermometerLabel } from '../data/catalogs.js'

/**
 * Map Vw disposition → Tw client status used by history filters.
 */
export function dispositionToClientStatus(dispositionId, { hasMeeting = false } = {}) {
  switch (dispositionId) {
    case 'interested':
      return 'Em negociação whatsApp'
    case 'callback':
      return hasMeeting ? 'Agendado' : 'Agendado'
    case 'no_interest':
      return 'Sem Interesse'
    case 'no_contact':
    case 'wrong_number':
      return 'Sem contato / Ligação caiu'
    case 'sold':
      return 'Interessado'
    case 'deceased':
      return 'Sem Interesse'
    default:
      return DISPOSITIONS.find((d) => d.id === dispositionId)?.label || dispositionId || ''
  }
}

export function dispositionLabel(dispositionId) {
  return DISPOSITIONS.find((d) => d.id === dispositionId)?.label || dispositionId || ''
}

export function formatDiagnosisSummary(diagnosis = {}) {
  const parts = []
  if (diagnosis.companySize) parts.push(`Porte: ${diagnosis.companySize}`)
  if (diagnosis.employees) parts.push(`Equipe: ${diagnosis.employees}`)
  if (diagnosis.monthlyRevenue) parts.push(`Fat.: ${diagnosis.monthlyRevenue}`)
  if (diagnosis.partnerPresence) parts.push(`Sócio: ${diagnosis.partnerPresence}`)
  if (diagnosis.priority) parts.push(`Prioridade: ${diagnosis.priority}`)
  if (diagnosis.painPoints) parts.push(`Dores: ${diagnosis.painPoints}`)
  if (typeof diagnosis.salesTemperature === 'number') {
    parts.push(
      `Termômetro: ${diagnosis.salesTemperature}% (${thermometerLabel(diagnosis.salesTemperature)})`,
    )
  }
  return parts
}

export function filterHistoryRows(history, { situation = '', clientStatus = '' } = {}) {
  return (history || []).filter((row) => {
    if (situation && row.callStatus !== situation) return false
    if (clientStatus && row.clientStatus !== clientStatus) return false
    return true
  })
}

export function meetingsForDate(meetings, isoDate) {
  return (meetings || [])
    .filter((m) => m.date === isoDate)
    .slice()
    .sort((a, b) => String(a.time).localeCompare(String(b.time)))
}

export function meetingDateSet(meetings) {
  return new Set((meetings || []).map((m) => m.date))
}

export function pad2(n) {
  return String(n).padStart(2, '0')
}

export function toIsoDate(year, monthIndex, day) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`
}

export function formatIsoDatePt(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const MONTH_NAMES_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

export function monthTitlePt(year, monthIndex) {
  return `${MONTH_NAMES_PT[monthIndex]} de ${year}`
}

/** Calendar cells for month grid (Sun–Sat), including leading/trailing blanks as null */
export function buildMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startPad; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, iso: toIsoDate(year, monthIndex, day) })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function isPastIsoDate(iso, todayIso) {
  return Boolean(iso && todayIso && iso < todayIso)
}
