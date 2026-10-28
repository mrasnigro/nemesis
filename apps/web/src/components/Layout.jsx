import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import { useCompactNav } from './NavToggle'
import './Layout.css'

export default function Layout({
  navItems = [],
  featureItems = [],
  featureTitle,
  title,
  subtitle,
}) {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const compactNav = useCompactNav()

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return undefined
    function onKey(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <div className="app-layout">
      {menuOpen ? (
        <button
          type="button"
          className="nav-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <Sidebar
        open={menuOpen}
        items={navItems}
        featureItems={featureItems}
        featureTitle={featureTitle}
        hidden={compactNav && !menuOpen}
        onNavigate={() => setMenuOpen(false)}
      />
      <div className="app-layout__shell">
        <Header
          title={title}
          subtitle={subtitle}
          menuOpen={menuOpen}
          onMenuToggle={() => setMenuOpen((open) => !open)}
        />
        <main className="app-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
