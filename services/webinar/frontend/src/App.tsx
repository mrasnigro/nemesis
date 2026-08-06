import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';

import AdminLayout from './components/AdminLayout';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminUsers } from './pages/AdminUsers';
import { AdminPlans } from './pages/AdminPlans';
import { AdminWebinars } from './pages/AdminWebinars';
import AdminNewWebinar from './pages/AdminNewWebinar';
import StudioLayout from './components/studio/StudioLayout';
import StudioRoom from './pages/StudioRoom';
import StudioPreview from './pages/StudioPreview';
import ClientLayout from './components/ClientLayout';
import ClientDashboard from './pages/ClientDashboard';
import ClientWebinars from './pages/ClientWebinars';
import ClientSubscription from './pages/ClientSubscription';
import ClientLiveWebinar from './pages/ClientLiveWebinar';
import ClientProfile from './pages/ClientProfile';
import ClientLeads from './pages/ClientLeads';
import ClientWebinarDetail from './pages/ClientWebinarDetail';
import ClientNewWebinar from './pages/ClientNewWebinar';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';
import { ResetPasswordForm } from './components/ResetPasswordForm';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicWebinarAccess } from './pages/PublicWebinarAccess';
import './styles/globals.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/forgot-password" element={<ForgotPasswordForm />} />
        <Route path="/reset-password" element={<ResetPasswordForm />} />
        <Route path="/webinar/:clientId/live/:accessCodeId" element={<PublicWebinarAccess />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['client', 'admin']}>
              <ClientLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ClientDashboard />} />
          <Route path="webinars" element={<ClientWebinars />} />
          <Route path="webinars/:id" element={<ClientWebinarDetail />} />
          <Route path="leads" element={<ClientLeads />} />
          <Route path="subscription" element={<ClientSubscription />} />
          <Route path="profile" element={<ClientProfile />} />
          <Route path="webinars/new" element={<ClientNewWebinar />} />
        </Route>
        <Route
          path="/live/:id"
          element={<ClientLiveWebinar />}
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="plans" element={<AdminPlans />} />
          <Route path="webinars" element={<AdminWebinars />} />
          <Route path="webinars/new" element={<AdminNewWebinar />} />
        </Route>
        <Route
          path="/admin/studio"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <StudioLayout />
            </ProtectedRoute>
          }
        >
          <Route path="preview/:id" element={<StudioPreview />} />
          <Route path=":id" element={<StudioRoom />} />
        </Route>
        <Route
          path="/studio"
          element={
            <ProtectedRoute allowedRoles={['client', 'admin']}>
              <StudioLayout />
            </ProtectedRoute>
          }
        >
          <Route path="preview/:id" element={<StudioPreview />} />
          <Route path=":id" element={<StudioRoom />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
