import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import AdminLayout from '../layouts/AdminLayout'
import DashboardLayout from '../layouts/DashboardLayout'
import {
  AdminDashboard,
  CustomersPage,
  IntegrationsPage,
  LogsPage,
  ModulesPage,
  PermissionsPage,
  UsersPage,
} from '../pages/admin/index.js'
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
import ModuleAccessRoute from './ModuleAccessRoute'
import ProtectedRoute from './ProtectedRoute'

function HomeRedirect() {
  const { isAuthenticated, user, getHomeForRole } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={getHomeForRole(user.role)} replace />
}

function ModuleRoute({ moduleId, children }) {
  return <ModuleAccessRoute moduleId={moduleId}>{children}</ModuleAccessRoute>
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
        <Route
          path="/modules/training-ai"
          element={
            <ModuleRoute moduleId="training-ai">
              <TrainingAiPage />
            </ModuleRoute>
          }
        />
        <Route
          path="/modules/bdr"
          element={
            <ModuleRoute moduleId="bdr">
              <BdrPage />
            </ModuleRoute>
          }
        />
        <Route
          path="/modules/prospecting"
          element={
            <ModuleRoute moduleId="prospecting">
              <ProspectingPage />
            </ModuleRoute>
          }
        />
        <Route
          path="/modules/radar"
          element={
            <ModuleRoute moduleId="radar">
              <RadarPage />
            </ModuleRoute>
          }
        />
        <Route
          path="/modules/webinar"
          element={
            <ModuleRoute moduleId="webinar">
              <WebinarPage />
            </ModuleRoute>
          }
        />
        <Route
          path="/modules/vsl"
          element={
            <ModuleRoute moduleId="vsl">
              <VslPage />
            </ModuleRoute>
          }
        />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="modules" element={<ModulesPage />} />
        <Route path="permissions" element={<PermissionsPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="logs" element={<LogsPage />} />
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
