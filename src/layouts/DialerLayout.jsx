import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { BdrSessionProvider } from '../modules/bdr'
import AttendanceTimer from '../modules/bdr/components/AttendanceTimer.jsx'
import '../modules/bdr/styles/bdr-theme.css'
import './DialerLayout.css'

const MODULE_NAV = [
  {
    id: 'prospeccoes',
    label: 'Prospecções',
    shortLabel: 'Pros.',
    icon: 'grid',
    children: [
      {
        id: 'contato-telefonico',
        label: 'Contato Telefônico',
        to: '/modules/bdr',
        match: (path) => path.startsWith('/modules/bdr'),
      },
      {
        id: 'via-redes-sociais',
        label: 'Via Redes Sociais',
        to: null,
      },
    ],
  },
  {
    id: 'repositorio',
    label: 'Repositório',
    shortLabel: 'Repo.',
    icon: 'doc',
    children: [
      {
        id: 'script-ligacao',
        label: 'Script para Ligação',
        to: null,
      },
      {
        id: 'script-resposta',
        label: 'Script de Respostas',
        to: null,
      },
    ],
  },
  {
    id: 'treinamentos',
    label: 'Treinamentos',
    shortLabel: 'Treino',
    icon: 'briefcase',
    children: [
      {
        id: 'simular-ia',
        label: 'Simular IA',
        to: '/modules/training-ai',
        match: (path) => path.startsWith('/modules/training-ai'),
      },
    ],
  },
]

function StrokeIcon({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

function DialerIcon({ name }) {
  const icons = {
    grid: (
      <StrokeIcon>
        <rect width="7" height="7" x="3" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="14" rx="1" />
        <rect width="7" height="7" x="3" y="14" rx="1" />
      </StrokeIcon>
    ),
    doc: (
      <StrokeIcon>
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" />
        <line x1="16" x2="8" y1="17" y2="17" />
        <line x1="10" x2="8" y1="9" y2="9" />
      </StrokeIcon>
    ),
    briefcase: (
      <StrokeIcon>
        <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </StrokeIcon>
    ),
    chevron: (
      <StrokeIcon>
        <path d="m9 18 6-6-6-6" />
      </StrokeIcon>
    ),
    modules: (
      <StrokeIcon>
        <rect width="7" height="7" x="3" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="14" rx="1" />
        <rect width="7" height="7" x="3" y="14" rx="1" />
      </StrokeIcon>
    ),
  }

  return <span className="dialer-layout__icon">{icons[name]}</span>
}

function DialerShell() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  /* Sample SDRDialer starts collapsed (w-20) */
  const [collapsed, setCollapsed] = useState(true)
  const isDiscagemRoute = location.pathname.startsWith('/modules/bdr/discagem')
    || location.pathname.startsWith('/modules/bdr/manual')
  const isAgendamentosRoute = location.pathname.startsWith('/modules/bdr/agendamentos')

  const activeGroupIds = useMemo(
    () =>
      MODULE_NAV.filter((group) =>
        group.children.some((child) => child.match?.(location.pathname)),
      ).map((group) => group.id),
    [location.pathname],
  )

  const [openGroups, setOpenGroups] = useState(() => new Set())

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function toggleGroup(id) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div
      className={`dialer-layout${collapsed ? ' dialer-layout--collapsed' : ' dialer-layout--expanded'}${
        isDiscagemRoute ? ' dialer-layout--discagem' : ''
      }`}
    >
      <aside className="dialer-layout__sidebar" aria-label="CRM IMP GROUP">
        <div className="dialer-layout__brand">
          {collapsed ? (
            <span className="dialer-layout__brand-mark" title="CRM IMP GROUP">
              CRM
            </span>
          ) : (
            <div className="dialer-layout__brand-text">
              <strong>CRM IMP GROUP</strong>
            </div>
          )}
        </div>

        <button
          type="button"
          className="dialer-layout__collapse"
          aria-expanded={!collapsed}
          title={collapsed ? 'Abrir' : 'Recolher'}
          onClick={() => setCollapsed((v) => !v)}
        >
          <span
            className={`dialer-layout__collapse-icon${collapsed ? '' : ' dialer-layout__collapse-icon--open'}`}
          >
            <DialerIcon name="chevron" />
          </span>
        </button>

        <nav aria-label="Módulos">
          {MODULE_NAV.map((group) => {
            const groupActive = activeGroupIds.includes(group.id)
            const expanded = !collapsed && openGroups.has(group.id)

            if (collapsed) {
              const firstLink = group.children.find((child) => child.to)
              const className = `dialer-layout__nav-link${groupActive ? ' dialer-layout__nav-link--active' : ''}`
              if (firstLink?.to) {
                return (
                  <NavLink
                    key={group.id}
                    to={firstLink.to}
                    title={group.label}
                    aria-label={group.label}
                    className={() => className}
                  >
                    <DialerIcon name={group.icon} />
                  </NavLink>
                )
              }
              return (
                <button
                  key={group.id}
                  type="button"
                  className={className}
                  title={`${group.label} (em breve)`}
                  aria-label={group.label}
                >
                  <DialerIcon name={group.icon} />
                </button>
              )
            }

            return (
              <div
                key={group.id}
                className={`dialer-layout__group${groupActive ? ' dialer-layout__group--active' : ''}`}
              >
                <button
                  type="button"
                  className="dialer-layout__group-toggle"
                  aria-expanded={expanded}
                  onClick={() => toggleGroup(group.id)}
                >
                  <DialerIcon name={group.icon} />
                  <span className="dialer-layout__nav-label">{group.label}</span>
                  <span
                    className={`dialer-layout__chevron${expanded ? ' dialer-layout__chevron--open' : ''}`}
                  >
                    <DialerIcon name="chevron" />
                  </span>
                </button>

                {expanded ? (
                  <div className="dialer-layout__subnav">
                    {group.children.map((child) => {
                      const active = child.match?.(location.pathname)
                      const childClass = `dialer-layout__sublink${active ? ' dialer-layout__sublink--active' : ''}`

                      if (!child.to) {
                        return (
                          <button
                            key={child.id}
                            type="button"
                            className={childClass}
                            title={`${child.label} (em breve)`}
                          >
                            <DialerIcon name="doc" />
                            <span>{child.label}</span>
                          </button>
                        )
                      }

                      return (
                        <NavLink
                          key={child.id}
                          to={child.to}
                          title={child.label}
                          className={() => childClass}
                        >
                          <DialerIcon name="doc" />
                          <span>{child.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </nav>

        <div className="dialer-layout__sidebar-foot">
          <button
            type="button"
            className="dialer-layout__modules"
            onClick={() => navigate('/dashboard')}
            title="Voltar aos módulos"
            aria-label="Módulos IMP"
          >
            {collapsed ? <DialerIcon name="modules" /> : 'Módulos IMP'}
          </button>
        </div>
      </aside>

      <div className="dialer-layout__shell">
        {isDiscagemRoute ? null : (
          <header className="dialer-layout__header">
            <div
              className={`dialer-layout__header-inner${
                isAgendamentosRoute ? ' dialer-layout__header-inner--agenda' : ''
              }`}
            >
              {isAgendamentosRoute ? (
                <>
                  <h1 className="dialer-layout__page-title">Agendamentos Realizados</h1>
                  <button
                    type="button"
                    className="dialer-layout__page-back"
                    onClick={() => navigate('/modules/bdr')}
                  >
                    <svg
                      className="bdr-page__back-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Voltar
                  </button>
                </>
              ) : (
                <div className="dialer-layout__header-actions">
                  <AttendanceTimer />
                  <div className="dialer-layout__role-block">
                    <p className="dialer-layout__role-title">BDR - Prospecção</p>
                    <p className="dialer-layout__role-sub">Operador</p>
                  </div>
                  <button
                    type="button"
                    className="dialer-layout__logout"
                    onClick={handleLogout}
                  >
                    Sair
                  </button>
                </div>
              )}
            </div>
          </header>
        )}

        <main className={`dialer-layout__content${isDiscagemRoute ? ' dialer-layout__content--dialer' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default function DialerLayout() {
  return (
    <BdrSessionProvider>
      <DialerShell />
    </BdrSessionProvider>
  )
}
