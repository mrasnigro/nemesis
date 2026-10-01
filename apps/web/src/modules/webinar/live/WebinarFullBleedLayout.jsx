import { Outlet } from 'react-router-dom'
import WebinarSessionGate from '../components/WebinarSessionGate.jsx'
import './webinar-live.css'

/** Full-bleed Studio/Live — no IMP module sidebar. */
export default function WebinarFullBleedLayout() {
  return (
    <WebinarSessionGate>
      <div className="webinar-live-root webinar-live-root--fullbleed min-h-screen bg-gray-900 text-white">
        <Outlet />
      </div>
    </WebinarSessionGate>
  )
}
