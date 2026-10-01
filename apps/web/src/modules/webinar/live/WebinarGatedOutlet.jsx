import { Outlet } from 'react-router-dom'
import WebinarSessionGate from '../components/WebinarSessionGate.jsx'

export default function WebinarGatedOutlet() {
  return (
    <WebinarSessionGate>
      <Outlet />
    </WebinarSessionGate>
  )
}
