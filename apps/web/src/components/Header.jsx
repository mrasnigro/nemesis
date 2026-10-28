import { useAuth } from '../auth/AuthContext'
import NavToggle from './NavToggle'
import './Header.css'

export default function Header({ title, subtitle, menuOpen = false, onMenuToggle }) {
  const { user, logout } = useAuth()

  return (
    <header className="app-header">
      <div className="app-header__lead">
        <NavToggle open={menuOpen} controls="app-sidebar" onClick={onMenuToggle} />
        <div className="app-header__titles">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>

      <div className="app-header__actions">
        <label className="app-header__search">
          <span className="app-header__search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
              />
            </svg>
          </span>
          <input type="search" placeholder="Buscar..." aria-label="Buscar" />
        </label>

        <div className="app-header__user">
          <div className="app-header__user-meta">
            <strong>{user?.name}</strong>
            <span>{user?.role === 'admin' ? 'Administrador' : 'Usuário IMP'}</span>
          </div>
          <span className="app-header__avatar">{user?.name?.charAt(0) ?? '?'}</span>
          <button type="button" className="app-header__logout" onClick={logout}>
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}
