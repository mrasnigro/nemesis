import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useWorkspace } from '../workspace/WorkspaceContext'
import NavToggle, { useCompactNav } from '../components/NavToggle'
import './ModuleWorkspaceLayout.css'

function normalizeNav(nav = []) {
  if (nav.some((item) => Array.isArray(item.children))) {
    return nav.map((group) => ({
      id: group.id,
      label: group.label || '',
      icon: group.icon || null,
      collapsible: Boolean(group.collapsible),
      defaultOpen: group.defaultOpen !== false,
      items: (group.children || []).filter((child) => child?.to),
    }))
  }

  return nav.reduce((sections, item) => {
    const section = item.section || ''
    const last = sections[sections.length - 1]
    if (!last || last.label !== section) {
      sections.push({
        id: section || item.id || `section-${sections.length}`,
        label: section,
        icon: item.sectionIcon || null,
        collapsible: Boolean(item.sectionCollapsible),
        defaultOpen: item.sectionDefaultOpen !== false,
        items: item.to ? [item] : [],
      })
    } else if (item.to) {
      last.items.push(item)
    }
    return sections
  }, [])
}

export default function ModuleWorkspaceLayout({
  title,
  badge,
  basePath,
  nav = [],
  headerActions = null,
  className = '',
}) {
  const { user, logout } = useAuth()
  const { currentCustomer, currentUser } = useWorkspace()
  const navigate = useNavigate()
  const location = useLocation()
  const groups = useMemo(() => normalizeNav(nav), [nav])

  const [openGroups, setOpenGroups] = useState(() => {
    const initial = new Set()
    for (const group of groups) {
      if (!group.collapsible || group.defaultOpen) initial.add(group.id)
    }
    return initial
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const compactNav = useCompactNav('(max-width: 960px)')

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return undefined
    function onKey(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function toggleGroup(id) {
    setOpenGroups((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className={['module-workspace', className].filter(Boolean).join(' ')}>
      {menuOpen ? (
        <button
          type="button"
          className="nav-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <aside
        id="module-sidebar"
        className={`module-workspace__sidebar${menuOpen ? ' is-open' : ''}`}
        inert={compactNav && !menuOpen ? true : undefined}
      >
        <div className="module-workspace__brand">
          <span className="module-workspace__mark">IMP</span>
          <div className="module-workspace__brand-text">
            <strong>CRM IMP</strong>
            <p>{title}</p>
          </div>
        </div>

        {badge ? <span className="module-workspace__badge">{badge}</span> : null}

        <nav
          className="module-workspace__nav"
          aria-label={`Navegação ${title}`}
          onClick={(event) => {
            if (event.target.closest('a')) setMenuOpen(false)
          }}
        >
          {groups.map((group) => {
            const hasItems = group.items.length > 0
            const expanded = !group.collapsible || openGroups.has(group.id)
            const groupActive = group.items.some(
              (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
            )

            return (
              <div
                key={group.id}
                className={`module-workspace__nav-group${groupActive ? ' is-active-group' : ''}`}
              >
                {group.label ? (
                  group.collapsible ? (
                    <button
                      type="button"
                      className="module-workspace__nav-section module-workspace__nav-section--toggle"
                      aria-expanded={expanded}
                      onClick={() => toggleGroup(group.id)}
                    >
                      {group.icon ? (
                        <span className="module-workspace__nav-section-icon" aria-hidden="true">
                          {group.icon}
                        </span>
                      ) : null}
                      <span className="module-workspace__nav-section-label">{group.label}</span>
                      <span
                        className={`module-workspace__nav-chevron${expanded ? ' is-open' : ''}`}
                        aria-hidden="true"
                      >
                        ›
                      </span>
                    </button>
                  ) : (
                    <p className="module-workspace__nav-section">
                      {group.icon ? (
                        <span className="module-workspace__nav-section-icon" aria-hidden="true">
                          {group.icon}
                        </span>
                      ) : null}
                      <span className="module-workspace__nav-section-label">{group.label}</span>
                    </p>
                  )
                ) : null}

                {expanded && hasItems ? (
                  <div className="module-workspace__subnav">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.id}
                        to={item.to}
                        end={item.end ?? false}
                        className={({ isActive }) =>
                          `module-workspace__link${isActive ? ' is-active' : ''}`
                        }
                      >
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </nav>

        <div className="module-workspace__footer">
          <NavLink
            to="/dashboard"
            className="module-workspace__modules"
            onClick={() => setMenuOpen(false)}
          >
            ← Módulos IMP
          </NavLink>
        </div>
      </aside>

      <div className="module-workspace__main">
        <header className="module-workspace__header">
          <div className="module-workspace__heading">
            <NavToggle
              open={menuOpen}
              controls="module-sidebar"
              onClick={() => setMenuOpen((current) => !current)}
            />
            <div>
              <p className="module-workspace__eyebrow">{badge || 'Módulo IMP'}</p>
              <h1>{title}</h1>
            </div>
          </div>
          <div className="module-workspace__user">
            {headerActions}
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
