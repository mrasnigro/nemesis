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
  TrainingAiLayout,
  TrainingCatalogPage,
  TrainingHistoryPage,
  TrainingPersonaDetailPage,
  TrainingPersonaFormPage,
  TrainingPersonasPage,
  TrainingReportPage,
  TrainingScenarioDetailPage,
  TrainingScenarioFormPage,
  TrainingScenariosPage,
  TrainingSimulationPage,
  TrainingTemplateDetailPage,
  TrainingTemplateFormPage,
  TrainingTemplatesPage,
} from '../modules/training-ai'
import {
  ProspectingLayout,
  ProspectQualifyPage,
  ProspectSearchPage,
  ProspectSendBdrPage,
} from '../modules/prospecting'
import {
  RadarAnalysisPage,
  RadarDashboardPage,
  RadarInsightPage,
  RadarLayout,
} from '../modules/radar'
import {
  WebinarHomePage,
  WebinarLayout,
} from '../modules/webinar'
import {
  VslCampaignsPage,
  VslConfigurePage,
  VslLayout,
  VslMetricsPage,
} from '../modules/vsl'
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
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={['imp']}>
            <ModuleRoute moduleId="training-ai">
              <TrainingAiLayout />
            </ModuleRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/modules/training-ai" element={<TrainingCatalogPage />} />
        <Route path="/modules/training-ai/cenarios" element={<TrainingScenariosPage />} />
        <Route path="/modules/training-ai/cenarios/novo" element={<TrainingScenarioFormPage />} />
        <Route
          path="/modules/training-ai/cenarios/:scenarioId/editar"
          element={<TrainingScenarioFormPage />}
        />
        <Route
          path="/modules/training-ai/cenarios/:scenarioId"
          element={<TrainingScenarioDetailPage />}
        />
        <Route path="/modules/training-ai/personas" element={<TrainingPersonasPage />} />
        <Route path="/modules/training-ai/personas/nova" element={<TrainingPersonaFormPage />} />
        <Route
          path="/modules/training-ai/personas/:personaId/editar"
          element={<TrainingPersonaFormPage />}
        />
        <Route
          path="/modules/training-ai/personas/:personaId"
          element={<TrainingPersonaDetailPage />}
        />
        <Route path="/modules/training-ai/templates" element={<TrainingTemplatesPage />} />
        <Route path="/modules/training-ai/templates/novo" element={<TrainingTemplateFormPage />} />
        <Route
          path="/modules/training-ai/templates/:templateId/editar"
          element={<TrainingTemplateFormPage />}
        />
        <Route
          path="/modules/training-ai/templates/:templateId"
          element={<TrainingTemplateDetailPage />}
        />
        <Route path="/modules/training-ai/historico" element={<TrainingHistoryPage />} />
        <Route path="/modules/training-ai/simulacao/:scenarioId" element={<TrainingSimulationPage />} />
        <Route path="/modules/training-ai/relatorio/:scenarioId" element={<TrainingReportPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={['imp']}>
            <ModuleRoute moduleId="prospecting">
              <ProspectingLayout />
            </ModuleRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/modules/prospecting" element={<ProspectSearchPage />} />
        <Route path="/modules/prospecting/qualify/:companyId" element={<ProspectQualifyPage />} />
        <Route path="/modules/prospecting/enviar-bdr" element={<ProspectSendBdrPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={['imp']}>
            <ModuleRoute moduleId="radar">
              <RadarLayout />
            </ModuleRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/modules/radar" element={<RadarDashboardPage />} />
        <Route path="/modules/radar/analise" element={<RadarAnalysisPage />} />
        <Route path="/modules/radar/insight/:insightId" element={<RadarInsightPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={['imp']}>
            <ModuleRoute moduleId="webinar">
              <WebinarLayout />
            </ModuleRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/modules/webinar" element={<WebinarHomePage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={['imp']}>
            <ModuleRoute moduleId="vsl">
              <VslLayout />
            </ModuleRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/modules/vsl" element={<VslCampaignsPage />} />
        <Route path="/modules/vsl/:campaignId" element={<VslConfigurePage />} />
        <Route path="/modules/vsl/:campaignId/metricas" element={<VslMetricsPage />} />
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
