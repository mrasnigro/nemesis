import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import './Layout.css'

export default function Layout({ navItems = [], title, subtitle }) {
  return (
    <div className="app-layout">
      <Sidebar items={navItems} />
      <div className="app-layout__shell">
        <Header title={title} subtitle={subtitle} />
        <main className="app-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
