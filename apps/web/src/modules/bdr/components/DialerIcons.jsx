/** Stroke icons matching sample SDRDialer (lucide-style). */

function StrokeIcon({ className, children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export function IconArrowLeft({ className }) {
  return (
    <StrokeIcon className={className}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </StrokeIcon>
  )
}

export function IconPhone({ className }) {
  return (
    <StrokeIcon className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </StrokeIcon>
  )
}

export function IconPhoneOff({ className }) {
  return (
    <StrokeIcon className={className}>
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
      <line x1="22" x2="2" y1="2" y2="22" />
    </StrokeIcon>
  )
}

export function IconClock({ className }) {
  return (
    <StrokeIcon className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </StrokeIcon>
  )
}

export function IconGrid({ className }) {
  return (
    <StrokeIcon className={className}>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </StrokeIcon>
  )
}

export function IconMessage({ className }) {
  return (
    <StrokeIcon className={className}>
      <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
    </StrokeIcon>
  )
}

export function IconHelp({ className }) {
  return (
    <StrokeIcon className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </StrokeIcon>
  )
}

export function IconFile({ className }) {
  return (
    <StrokeIcon className={className}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <line x1="10" x2="8" y1="9" y2="9" />
    </StrokeIcon>
  )
}

const TAB_ICONS = {
  grid: IconGrid,
  message: IconMessage,
  help: IconHelp,
  file: IconFile,
}

export function TabIcon({ name, className }) {
  const Icon = TAB_ICONS[name]
  if (!Icon) return null
  return <Icon className={className} />
}
