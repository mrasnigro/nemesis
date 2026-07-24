const ICONS = {
  sparkles: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2zm7 11 1.1 3.4L24 17.5l-3.9 1.1L19 22l-1.1-3.4L14 17.5l3.9-1.1L19 13zM5 14l.9 2.8L9 18l-3.1.9L5 22l-.9-3.1L1 18l3.1-.9L5 14z"
      />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V21c0 .6-.4 1-1 1C10.6 22 2 13.4 2 2.9 2 2.4 2.4 2 3 2h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z"
      />
    </svg>
  ),
  funnel: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 4h18l-7 8v6l-4 2v-8L3 4z"
      />
    </svg>
  ),
  radar: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 9.95 11h-2.02A8 8 0 1 1 12 4V2zm0 4a6 6 0 0 0-6 6h2a4 4 0 0 1 4-4V6zm1 5.4 4.6-2.7-.9-1.5-5.2 3V18h2v-6.6z"
      />
    </svg>
  ),
  live: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17 10.5V7c0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1v10c0 .6.4 1 1 1h12c.6 0 1-.4 1-1v-3.5l4 4v-11l-4 4z"
      />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 5v14l11-7L8 5z"
      />
    </svg>
  ),
}

export default function ModuleIcon({ name = 'sparkles', className = '' }) {
  return (
    <span className={`module-icon ${className}`.trim()}>
      {ICONS[name] ?? ICONS.sparkles}
    </span>
  )
}
