import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import AppRoutes from './routes'
import { WorkspaceProvider } from './workspace/WorkspaceContext'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceProvider>
          <AppRoutes />
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
