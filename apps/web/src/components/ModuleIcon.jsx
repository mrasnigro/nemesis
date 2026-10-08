/**
 * Module icons from the Lucide pack (https://lucide.dev) — not hand-drawn path coordinates.
 * Call sites keep stable names (`sparkles`, `phone`, …).
 */
import {
  Filter,
  LayoutGrid,
  MonitorPlay,
  Phone,
  Play,
  Radar,
  Sparkles,
  Video,
} from 'lucide-react'

const ICONS = {
  sparkles: Sparkles,
  phone: Phone,
  funnel: Filter,
  radar: Radar,
  live: Video,
  play: Play,
  modules: LayoutGrid,
  webinar: MonitorPlay,
}

export default function ModuleIcon({ name = 'sparkles', className = '', size = 22, strokeWidth = 1.75 }) {
  const Icon = ICONS[name] || ICONS.sparkles
  return (
    <span className={`module-icon ${className}`.trim()}>
      <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" focusable="false" />
    </span>
  )
}
