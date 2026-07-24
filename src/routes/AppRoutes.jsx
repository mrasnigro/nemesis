import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import AdminLayout from '../layouts/AdminLayout'
import DashboardLayout from '../layouts/DashboardLayout'
import Admin from '../pages/Admin'
import Dashboard from '../pages/Dashboard'
import Login from '../pages/Login'
import {
  BdrPage,
  ProspectingPage,
  RadarPage,
  TrainingAiPage,
  VslPage,
  WebinarPage,
} from '../pages/modules'
import ProtectedRoute from './ProtectedRoute'

function HomeRedirect() {
  const { isAuthenticated, user, getHomeForRole } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={getHomeForRole(user.role)} replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute allowedRoles={['imp']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/modules/training-ai" element={<TrainingAiPage />} />
        <Route path="/modules/bdr" element={<BdrPage />} />
        <Route path="/modules/prospecting" element={<ProspectingPage />} />
        <Route path="/modules/radar" element={<RadarPage />} />
        <Route path="/modules/webinar" element={<WebinarPage />} />
        <Route path="/modules/vsl" element={<VslPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Admin />} />
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
