import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useWorkspace } from '../workspace/WorkspaceContext'
import './ModuleWorkspaceLayout.css'

export default function ModuleWorkspaceLayout({
  title,
  badge,
  basePath,
  nav = [],
}) {
  const { user, logout } = useAuth()
  const { currentCustomer, currentUser } = useWorkspace()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="module-workspace">
      <aside className="module-workspace__sidebar">
        <div className="module-workspace__brand">
          <span className="module-workspace__mark">IMP</span>
          <div className="module-workspace__brand-text">
            <strong>CRM IMP</strong>
            <p>{title}</p>
          </div>
        </div>

        {badge ? <span className="module-workspace__badge">{badge}</span> : null}

        <nav className="module-workspace__nav" aria-label={`Navegação ${title}`}>
          {nav.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.end ?? false}
              className={({ isActive }) =>
                `module-workspace__link${isActive ? ' is-active' : ''}`
              }
            >
              {item.icon ? (
                <span className="module-workspace__link-icon" aria-hidden="true">
                  {item.icon}
                </span>
              ) : null}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="module-workspace__footer">
          <NavLink to="/dashboard" className="module-workspace__modules">
            ← Módulos IMP
          </NavLink>
        </div>
      </aside>

      <div className="module-workspace__main">
        <header className="module-workspace__header">
          <div>
            <p className="module-workspace__eyebrow">{badge || 'Módulo IMP'}</p>
            <h1>{title}</h1>
          </div>
          <div className="module-workspace__user">
            <div className="module-workspace__user-meta">
              <span>{currentUser?.name || user?.name}</span>
              {currentCustomer ? <small>{currentCustomer.name}</small> : null}
            </div>
            <button type="button" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </header>

        <div className="module-workspace__content">
          <Outlet context={{ basePath }} />
        </div>
      </div>
    </div>
  )
}
