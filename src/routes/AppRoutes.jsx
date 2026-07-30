import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import AdminLayout from '../layouts/AdminLayout'
import DialerLayout from '../layouts/DialerLayout'
import LauncherLayout from '../layouts/LauncherLayout'
import {
  AdminDashboard,
  CustomersPage,
  LogsPage,
  ModulesPage,
  PermissionsPage,
  UsersPage,
} from '../pages/admin/index.js'
import Dashboard from '../pages/Dashboard'
import Login from '../pages/Login'
import {
  BdrAgendamentosPage,
  BdrDiscagemPage,
  BdrHistoricoPage,
  BdrManualPage,
  BdrPainelPage,
} from '../modules/bdr'
import {
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
            <LauncherLayout />
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
        element={
          <ProtectedRoute allowedRoles={['imp']}>
            <ModuleRoute moduleId="bdr">
              <DialerLayout />
            </ModuleRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/modules/bdr" element={<BdrPainelPage />} />
        <Route path="/modules/bdr/discagem" element={<BdrDiscagemPage />} />
        <Route path="/modules/bdr/manual" element={<BdrManualPage />} />
        <Route path="/modules/bdr/historico" element={<BdrHistoricoPage />} />
        <Route path="/modules/bdr/agendamentos" element={<BdrAgendamentosPage />} />
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
        <Route path="logs" element={<LogsPage />} />
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
