import { Outlet } from 'react-router-dom'

/** Content-only client shell — IMP sidebar owns product nav. */
export default function ImpClientOutlet() {
  return (
    <div className="webinar-live-root min-h-full bg-gray-50">
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  )
}
