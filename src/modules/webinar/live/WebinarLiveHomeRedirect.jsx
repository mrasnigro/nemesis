import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'
import { useWebinarSession } from '../context/WebinarSessionContext.jsx'

/** `/modules/webinar` → live dashboard (or admin home for webinar/IMP admins). */
export default function WebinarLiveHomeRedirect() {
  const { user: impUser } = useAuth()
  const { session, isReady } = useWebinarSession()

  if (!isReady) return null

  const isAdmin = session?.user?.role === 'admin' || impUser?.role === 'admin'
  if (isAdmin) {
    return <Navigate to="/modules/webinar/admin/dashboard" replace />
  }
  return <Navigate to="/modules/webinar/dashboard" replace />
}
