import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './Sidebar.css'

function NavIcon({ name }) {
  const icons = {
    dashboard: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 4h7v7H4V4zm9 0h7v5h-7V4zM4 13h7v7H4v-7zm9 3h7v4h-7v-4zm0-2h7v-4h-7v4z"
        />
      </svg>
    ),
    admin: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"
        />
      </svg>
    ),
    modules: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"
        />
      </svg>
    ),
  }

  return <span className="sidebar__icon">{icons[name] ?? icons.modules}</span>
}

export default function Sidebar({ items = [] }) {
  const { user } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__mark">IMP</span>
        <div>
          <strong>IMP Platform</strong>
          <p>{user?.role === 'admin' ? 'CRM Admin' : 'CRM Workspace'}</p>
        </div>
      </div>

      <p className="sidebar__section">Menu</p>

      <nav className="sidebar__nav" aria-label="Principal">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
            }
          >
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__status">
          <span className="sidebar__status-dot" />
          Sistema operacional
        </div>
      </div>
    </aside>
  )
}
