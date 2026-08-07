import { Outlet } from 'react-router-dom'

/** Content-only admin shell — IMP sidebar owns admin nav. */
export default function ImpAdminOutlet() {
  return (
    <div className="webinar-live-root min-h-full bg-gray-100">
      <main className="p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  )
}
