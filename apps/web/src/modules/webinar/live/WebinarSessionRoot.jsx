import { Outlet } from 'react-router-dom'
import { WebinarSessionProvider } from '../context/WebinarSessionContext.jsx'
import './webinar-live.css'

/** Shared session root for shell + full-bleed Studio/Live routes. */
export default function WebinarSessionRoot() {
  return (
    <WebinarSessionProvider>
      <Outlet />
    </WebinarSessionProvider>
  )
}
