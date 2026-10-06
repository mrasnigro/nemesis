import '../styles/webinar-platform.css'

/** Plain page for visitors: no sidebar, no IMP chrome. `color` is the webinar's accent. */
export default function PublicShell({ color, children }) {
  const accent = /^#[0-9a-fA-F]{6}$/.test(color || '') ? color : '#007bff'
  return (
    <main className="public-page" style={{ '--public-accent': accent }}>
      <div className="public-page__inner">{children}</div>
    </main>
  )
}
