/** Outline (stroke) icons — unfilled, for nav and dashboard actions. */

const PATHS = {
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M8 3.5v3.5M16 3.5v3.5M3.5 10h17" />
      <circle cx="12" cy="15" r="2.25" />
    </>
  ),
  filter: (
    <>
      <path d="M4 6h16l-6 7.5V19l-4 1.5v-7L4 6z" />
    </>
  ),
  export: (
    <>
      <path d="M12 4v10" />
      <path d="M8.5 7.5 12 4l3.5 3.5" />
      <path d="M5 15.5V18a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18v-2.5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19.5h16" />
      <path d="M7 16.5V11" />
      <path d="M12 16.5V7" />
      <path d="M17 16.5v-5" />
    </>
  ),
  headset: (
    <>
      <path d="M4.5 13.5v-2a7.5 7.5 0 0 1 15 0v2" />
      <rect x="3" y="12.5" width="4" height="6" rx="1.5" />
      <rect x="17" y="12.5" width="4" height="6" rx="1.5" />
      <path d="M19 18.5v1a2 2 0 0 1-2 2h-3" />
    </>
  ),
  notebook: (
    <>
      <rect x="6" y="3.5" width="13" height="17" rx="1.5" />
      <path d="M9.5 3.5v17" />
      <path d="M12.5 8h4M12.5 12h4M12.5 16h3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M4.9 6.5l1.6 1.6M17.5 15.9l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.5l1.6-1.6M17.5 8.1l1.6-1.6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.25" />
      <path d="M5.5 19.5c1.4-3.2 3.7-4.8 6.5-4.8s5.1 1.6 6.5 4.8" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="2.75" />
      <path d="M3.5 19c1.2-2.7 3.1-4 5.5-4s4.3 1.3 5.5 4" />
      <circle cx="16.5" cy="9" r="2.25" />
      <path d="M14.2 19c.7-1.7 1.9-2.7 3.8-2.7 1.7 0 2.9.8 3.7 2.2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="5.5" />
      <path d="M16 16l4 4" />
    </>
  ),
  refresh: (
    <>
      <path d="M4.5 12a7.5 7.5 0 0 1 12.7-5.4L19 9" />
      <path d="M19.5 4.5V9h-4.5" />
      <path d="M19.5 12a7.5 7.5 0 0 1-12.7 5.4L5 15" />
      <path d="M4.5 19.5V15h4.5" />
    </>
  ),
  paperclip: (
    <>
      <path d="M15.5 8.5 9.2 14.8a2.6 2.6 0 1 1-3.7-3.7l7.5-7.5a4 4 0 0 1 5.7 5.7l-8.1 8.1a5.4 5.4 0 0 1-7.6-7.6L9.5 3.8" />
    </>
  ),
  building: (
    <>
      <path d="M4.5 20.5h15" />
      <path d="M6.5 20.5V6.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v14" />
      <path d="M9.5 9h1M13.5 9h1M9.5 12.5h1M13.5 12.5h1M9.5 16h1M13.5 16h1" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  x: (
    <>
      <path d="M7 7l10 10M17 7 7 17" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h10M18 7h2" />
      <circle cx="16" cy="7" r="2" />
      <path d="M4 12h4M12 12h8" />
      <circle cx="10" cy="12" r="2" />
      <path d="M4 17h12M20 17h0" />
      <circle cx="18" cy="17" r="2" />
    </>
  ),
  clipboard: (
    <>
      <rect x="7" y="4.5" width="10" height="15" rx="1.5" />
      <path d="M9.5 4.5V3.5h5v1" />
      <path d="M10 9.5h4M10 13h4M10 16.5h2.5" />
    </>
  ),
  pencil: (
    <>
      <path d="M13.5 5.5 18.5 10.5" />
      <path d="M5 19l1.2-4.5L15.8 5 19 8.2 9.5 17.8 5 19z" />
    </>
  ),
  save: (
    <>
      <path d="M5 5.5h11.5L19 8v10.5H5V5.5z" />
      <path d="M8 5.5v4.5h7V5.5" />
      <path d="M8 19v-5.5h8V19" />
    </>
  ),
  minus: <path d="M6 12h12" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  phone: (
    <>
      <path d="M8.2 3.8 10.5 3.2a1.4 1.4 0 0 1 1.6.8l1 2.4a1.4 1.4 0 0 1-.4 1.6l-1.2 1.1a12.2 12.2 0 0 0 4.4 4.4l1.1-1.2a1.4 1.4 0 0 1 1.6-.4l2.4 1a1.4 1.4 0 0 1 .8 1.6l-.6 2.3a1.4 1.4 0 0 1-1.4 1.1A15.8 15.8 0 0 1 4.1 5.2a1.4 1.4 0 0 1 1.1-1.4z" />
    </>
  ),
  chat: (
    <>
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H11l-4 3.5V15H7.5A2.5 2.5 0 0 1 5 12.5v-6z" />
    </>
  ),
}

export default function OutlineIcon({ name, className = '' }) {
  const content = PATHS[name]
  if (!content) return null
  return (
    <svg
      className={`training-ai__outline-icon ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {content}
    </svg>
  )
}
