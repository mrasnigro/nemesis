import { LEAD_STATUS, SUBSCRIPTION_STATE, WEBINAR_STATUS } from '../utils/format.js'

const MAPS = { webinar: WEBINAR_STATUS, lead: LEAD_STATUS, subscription: SUBSCRIPTION_STATE }

export default function StatusPill({ status, kind = 'webinar' }) {
  const entry = MAPS[kind]?.[status] || { label: status || '—', tone: 'muted' }
  return <span className={`imp-pill imp-pill--${entry.tone}`}>{entry.label}</span>
}
