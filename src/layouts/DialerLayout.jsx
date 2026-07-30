import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { BdrSessionProvider, useBdrSession } from '../modules/bdr'
import { formatDurationHHMMSS } from '../modules/bdr/services/formatters.js'
import { useWorkspace } from '../workspace/WorkspaceContext'
import './DialerLayout.css'

const NAV = [
  { to: '/modules/bdr', end: true, label: 'Painel', icon: 'grid' },
  { to: '/modules/bdr/discagem?mode=automatic', label: 'Discagem', icon: 'phone', kind: 'auto' },
  { to: '/modules/bdr/discagem?mode=manual', label: 'Manual', icon: 'call', kind: 'manual' },
  { to: '/modules/bdr/historico', label: 'Histórico', icon: 'history' },
  { to: '/modules/bdr/agendamentos', label: 'Agenda', icon: 'calendar' },
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
    phone: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V21c0 .6-.4 1-1 1C10.6 22 2 13.4 2 2.9 2 2.4 2.4 2 3 2h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z"
        />
      </svg>
    ),
    call: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.4-.1-.8 0-1.1.3l-2.2 2.2c-2.8-1.5-5.2-3.8-6.6-6.6L8.7 8.6c.3-.3.4-.7.3-1.1C8.6 6.3 8.4 5 8.4 3.8c0-.6-.4-1-1-1H3.9c-.6 0-1 .4-1 1C2.9 13.4 10.5 21 20 21c.6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1z"
        />
      </svg>
    ),
    history: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M13 3a9 9 0 1 0 8.94 8H19a7 7 0 1 1-2.05-4.95L14 9h7V2l-2.65 2.65A8.96 8.96 0 0 0 13 3zm-1 5v5l4.25 2.52.75-1.23-3.5-2.04V8H12z"
        />
      </svg>
    ),
    calendar: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3V2zm12 8H5v9h14v-9zM5 8h14V6H5v2z"
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

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function isNavActive(item) {
    const path = location.pathname
    const search = location.search
    if (item.kind === 'manual') {
      return path.startsWith('/modules/bdr/discagem') && search.includes('mode=manual')
    }
    if (item.kind === 'auto') {
      return path.startsWith('/modules/bdr/discagem') && !search.includes('mode=manual')
    }
    if (item.end) return path === item.to
    return path.startsWith(item.to.split('?')[0])
  }

  return (
    <div className="dialer-layout">
      <aside className="dialer-layout__sidebar">
        <button
          type="button"
          className="dialer-layout__home"
          title="Voltar aos módulos"
          onClick={() => navigate('/dashboard')}
        >
          IMP
        </button>

        <nav aria-label="Discagem Automática">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              className={() =>
                `dialer-layout__nav-link${isNavActive(item) ? ' dialer-layout__nav-link--active' : ''}`
              }
            >
              <DialerIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="dialer-layout__shell">
        <header className="dialer-layout__header">
          <AttendanceTimer />

          <div className="dialer-layout__header-actions">
            <span className="dialer-layout__role">
              {currentUser?.name || user?.name} · BDR — Prospecção
            </span>
            <button
              type="button"
              className="dialer-layout__modules"
              onClick={() => navigate('/dashboard')}
            >
              Módulos
            </button>
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
