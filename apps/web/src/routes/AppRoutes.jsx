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
  WebinarPlansPage,
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
  TrainingDashboardsPage,
  TrainingGroupsPage,
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
  ClientDashboard,
  ClientLeads,
  ClientLiveWebinar,
  ClientNewWebinar,
  ClientProfile,
  ClientSubscription,
  ClientWebinarDetail,
  ClientWebinars,
  ImpAdminOutlet,
  ImpClientOutlet,
  StudioLayout,
  StudioPreview,
  StudioRoom,
  WebinarAdminDashboard,
  WebinarAdminNewWebinar,
  WebinarAdminPlans,
  WebinarAdminUsers,
  WebinarAdminWebinars,
  WebinarFullBleedLayout,
  WebinarGatedOutlet,
  WebinarLayout,
  WebinarLiveHomeRedirect,
  WebinarOneOnOneLaunchPage,
  WebinarOverviewPage,
  WebinarPlatformDashboard,
  WebinarPlatformLayout,
  WebinarPlatformLeads,
  WebinarPlatformStudio,
  WebinarPlatformSubscription,
  WebinarPlatformWebinarDetail,
  WebinarPlatformWebinarForm,
  WebinarPlatformWebinarWizard,
  WebinarPlatformWebinars,
  WebinarPublicJoin,
  WebinarPublicRoom,
  WebinarSessionRoot,
  WebinarSidecarPage,
} from '../modules/webinar'
import WebinarLegacyDetailRedirect from '../modules/webinar/live/WebinarLegacyDetailRedirect.jsx'
import {
  VslCampaignsPage,
  VslConfigurePage,
  VslLayout,
  VslMetricsPage,
} from '../modules/vsl'
import ModuleAccessRoute from './ModuleAccessRoute'
import ProtectedRoute from './ProtectedRoute'

function HomeRedirect() {
  const { isAuthenticated, isLoading, user, getHomeForRole } = useAuth()

  if (isLoading) return null

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
        <Route path="/modules/training-ai/grupos" element={<TrainingGroupsPage />} />
        <Route path="/modules/training-ai/dashboards/:view" element={<TrainingDashboardsPage />} />
        <Route path="/modules/training-ai/simulacao/persona/:personaId" element={<TrainingSimulationPage />} />
        <Route path="/modules/training-ai/simulacao/:scenarioId" element={<TrainingSimulationPage />} />
        <Route
          path="/modules/training-ai/relatorio/sessao/:sessionId"
          element={<TrainingReportPage />}
        />
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

      {/* Webinar on the platform API. Runs next to the current pages until streaming moves over. */}
      <Route
        element={
          <ProtectedRoute allowedRoles={['imp']}>
            <ModuleRoute moduleId="webinar">
              <WebinarPlatformLayout />
            </ModuleRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/modules/webinar/plataforma" element={<WebinarPlatformDashboard />} />
        <Route path="/modules/webinar/plataforma/webinars" element={<WebinarPlatformWebinars />} />
        <Route path="/modules/webinar/plataforma/webinars/novo" element={<WebinarPlatformWebinarWizard />} />
        <Route path="/modules/webinar/plataforma/webinars/:webinarId" element={<WebinarPlatformWebinarDetail />} />
        <Route
          path="/modules/webinar/plataforma/webinars/:webinarId/editar"
          element={<WebinarPlatformWebinarForm />}
        />
        <Route
          path="/modules/webinar/plataforma/webinars/:webinarId/estudio"
          element={<WebinarPlatformStudio />}
        />
        <Route path="/modules/webinar/plataforma/leads" element={<WebinarPlatformLeads />} />
        <Route path="/modules/webinar/plataforma/assinatura" element={<WebinarPlatformSubscription />} />
      </Route>

      {/* Visitors: no account, no session. The access code and the lead id are their keys. */}
      <Route path="/webinar/entrar" element={<WebinarPublicJoin />} />
      <Route path="/webinar/sala/:leadId" element={<WebinarPublicRoom />} />

      <Route
        element={
          <ProtectedRoute allowedRoles={['imp']}>
            <ModuleRoute moduleId="webinar">
              <WebinarSessionRoot />
            </ModuleRoute>
          </ProtectedRoute>
        }
      >
        <Route element={<WebinarLayout />}>
          <Route element={<WebinarGatedOutlet />}>
            <Route path="/modules/webinar" element={<WebinarLiveHomeRedirect />} />
            <Route path="/modules/webinar/dashboard" element={<ImpClientOutlet />}>
              <Route index element={<ClientDashboard />} />
              <Route path="webinars" element={<ClientWebinars />} />
              <Route path="webinars/new" element={<ClientNewWebinar />} />
              <Route path="webinars/:id" element={<ClientWebinarDetail />} />
              <Route path="leads" element={<ClientLeads />} />
              <Route path="subscription" element={<ClientSubscription />} />
              <Route path="profile" element={<ClientProfile />} />
            </Route>
            <Route path="/modules/webinar/admin" element={<ImpAdminOutlet />}>
              <Route path="dashboard" element={<WebinarAdminDashboard />} />
              <Route path="users" element={<WebinarAdminUsers />} />
              <Route path="plans" element={<WebinarAdminPlans />} />
              <Route path="webinars" element={<WebinarAdminWebinars />} />
              <Route path="webinars/new" element={<WebinarAdminNewWebinar />} />
            </Route>
            <Route path="/modules/webinar/reuniao-1a1" element={<WebinarOneOnOneLaunchPage />} />
            <Route path="/modules/webinar/overview" element={<WebinarOverviewPage />} />
            <Route path="/modules/webinar/sidecar" element={<WebinarSidecarPage />} />
            {/* Legacy stub URLs → live app */}
            <Route
              path="/modules/webinar/app"
              element={<Navigate to="/modules/webinar/dashboard" replace />}
            />
            <Route
              path="/modules/webinar/webinars"
              element={<Navigate to="/modules/webinar/dashboard/webinars" replace />}
            />
            <Route
              path="/modules/webinar/webinars/novo"
              element={<Navigate to="/modules/webinar/dashboard/webinars/new" replace />}
            />
            <Route
              path="/modules/webinar/webinars/:webinarId"
              element={<WebinarLegacyDetailRedirect />}
            />
          </Route>
        </Route>

        <Route element={<WebinarFullBleedLayout />}>
          <Route path="/modules/webinar/live/:id" element={<ClientLiveWebinar />} />
          <Route path="/modules/webinar/studio" element={<StudioLayout />}>
            <Route path="preview/:id" element={<StudioPreview />} />
            <Route path=":id" element={<StudioRoom />} />
          </Route>
        </Route>
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
        <Route path="webinar" element={<WebinarPlansPage />} />
        <Route path="logs" element={<LogsPage />} />
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
