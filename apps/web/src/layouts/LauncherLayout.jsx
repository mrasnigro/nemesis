import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useWorkspace } from '../workspace/WorkspaceContext'
import './LauncherLayout.css'

export default function LauncherLayout() {
  const { user, logout } = useAuth()
  const { currentCustomer, currentUser } = useWorkspace()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="launcher-layout">
      <header className="launcher-layout__bar">
        <div className="launcher-layout__brand">
          <span className="launcher-layout__mark">IMP</span>
          <div>
            <strong>CRM IMP</strong>
            <p>Sistema de Gestão de Leads</p>
          </div>
        </div>

        <div className="launcher-layout__user">
          <div className="launcher-layout__user-meta">
            <span className="launcher-layout__user-name">
              {currentUser?.name || user?.name}
            </span>
            {currentCustomer ? (
              <span className="launcher-layout__user-context">{currentCustomer.name}</span>
            ) : null}
          </div>
          <button type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <main className="launcher-layout__main">
        <Outlet />
      </main>
    </div>
  )
}
