import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { BdrSessionProvider, useBdrSession } from '../modules/bdr'
import { formatDurationHHMMSS } from '../modules/bdr/services/formatters.js'
import { useWorkspace } from '../workspace/WorkspaceContext'
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
        label: 'Script de Resposta',
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
        to: null,
      },
    ],
  },
]

function DialerIcon({ name }) {
  const icons = {
    grid: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z"
        />
      </svg>
    ),
    doc: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm1 7V3.5L19.5 9H15zM8 13h8v2H8v-2zm0 4h8v2H8v-2zm0-8h5v2H8V9z"
        />
      </svg>
    ),
    briefcase: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M10 2h4a2 2 0 0 1 2 2v2h4a2 2 0 0 1 2 2v3H2V8a2 2 0 0 1 2-2h4V4a2 2 0 0 1 2-2zm0 4h4V4h-4v2zM2 13h20v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7z"
        />
      </svg>
    ),
    chevron: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.41 1.41l4.59-4.58a1 1 0 0 0 0-1.42L10.7 6.7a1 1 0 0 0-1.41.01z"
        />
      </svg>
    ),
  }

  return <span className="dialer-layout__icon">{icons[name]}</span>
}

function AttendanceTimer() {
  const { tempoAtendimentoSec } = useBdrSession()
  return (
    <div className="dialer-layout__timer" title="Tempo em atendimento">
      <span>Tempo em atendimento</span>
      <strong>{formatDurationHHMMSS(tempoAtendimentoSec)}</strong>
    </div>
  )
}

function DialerShell() {
  const { user, logout } = useAuth()
  const { currentUser } = useWorkspace()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

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
    <div className={`dialer-layout${collapsed ? ' dialer-layout--collapsed' : ' dialer-layout--expanded'}`}>
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
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? '›' : '‹'}
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
                    className={() => className}
                  >
                    <DialerIcon name={group.icon} />
                    <span className="dialer-layout__nav-short">{group.shortLabel}</span>
                  </NavLink>
                )
              }
              return (
                <button key={group.id} type="button" className={className} title={`${group.label} (em breve)`}>
                  <DialerIcon name={group.icon} />
                  <span className="dialer-layout__nav-short">{group.shortLabel}</span>
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
          >
            {collapsed ? 'Mods' : 'Módulos IMP'}
          </button>
        </div>
      </aside>

      <div className="dialer-layout__shell">
        <header className="dialer-layout__header">
          <div className="dialer-layout__header-actions">
            <AttendanceTimer />
            <div className="dialer-layout__role-block">
              <strong>BDR - Prospecção</strong>
              <span>{currentUser?.name || user?.name || 'Operador'}</span>
            </div>
            <button type="button" className="dialer-layout__logout" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </header>

        <main className="dialer-layout__content">
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
