import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, isLoading, user, getHomeForRole } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <section className="access-denied">
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Carregando sessão...</p>
      </section>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getHomeForRole(user.role)} replace />
  }

  return children
}
