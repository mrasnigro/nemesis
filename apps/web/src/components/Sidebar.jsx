import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Building2,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  Phone,
  ScrollText,
  Shield,
  Users,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import './Sidebar.css'

const NAV_ICONS = {
  dashboard: LayoutDashboard,
  phone: Phone,
  admin: Shield,
  modules: LayoutGrid,
  customers: Building2,
  users: Users,
  permissions: KeyRound,
  logs: ScrollText,
}

function NavIcon({ name }) {
  const Icon = NAV_ICONS[name] || NAV_ICONS.modules
  return (
    <span className="sidebar__icon">
      <Icon size={18} strokeWidth={1.75} aria-hidden="true" focusable="false" />
    </span>
  )
}

const PROFILE_WORKSPACE = {
  customer_admin: 'Workspace Gestor',
  sdr_bdr: 'Workspace SDR/BDR',
  closer: 'Workspace Closer',
}

export default function Sidebar({
  items = [],
  featureItems = [],
  featureTitle,
  open = false,
  hidden = false,
  onNavigate,
}) {
  const { user } = useAuth()
  const [featuresOpen, setFeaturesOpen] = useState(false)
  const mainItems = items.filter((item) => !item.section)
  const moduleItems = items.filter((item) => item.section === 'Módulos')

  return (
    <aside
      id="app-sidebar"
      className={`sidebar${open ? ' sidebar--open' : ''}`}
      inert={hidden ? true : undefined}
    >
      <div className="sidebar__brand">
        <span className="sidebar__mark">IMP</span>
        <div>
          <strong>CRM IMP</strong>
          <p>
            {user?.role === 'admin' ? 'Painel Admin' : (PROFILE_WORKSPACE[user?.profile] ?? 'Workspace')}
          </p>
        </div>
      </div>

      <p className="sidebar__section">Menu</p>
      <nav className="sidebar__nav" aria-label="Principal">
        {mainItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
            }
            onClick={onNavigate}
          >
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {moduleItems.length ? (
        <>
          <p className="sidebar__section">Módulos</p>
          <nav className="sidebar__nav" aria-label="Módulos">
            {moduleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
                }
                onClick={onNavigate}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </>
      ) : null}

      {featureItems.length ? (
        <>
          <button
            type="button"
            className="sidebar__features-toggle"
            aria-expanded={featuresOpen}
            onClick={() => setFeaturesOpen((current) => !current)}
          >
            {featureTitle || 'Funcionalidades'}
          </button>
          <div className={`sidebar__features-panel${featuresOpen ? ' is-open' : ''}`}>
            <p className="sidebar__section">{featureTitle || 'Funcionalidades'}</p>
            <ul className="sidebar__features">
              {featureItems.map((feature) => (
                <li key={feature.id} className="sidebar__feature">
                  <span className="sidebar__feature-dot" aria-hidden="true" />
                  <span>{feature.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      <div className="sidebar__footer">
        <div className="sidebar__status">
          <span className="sidebar__status-dot" />
          Sistema operacional
        </div>
      </div>
    </aside>
  )
}
