import React, { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { appPath, loginPath } from '../lib/appBase';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate(loginPath());
  };

  const menuItems = [
    { label: 'Dashboard', path: appPath('/admin/dashboard'), icon: '📊' },
    { label: 'Usuários', path: appPath('/admin/users'), icon: '👥' },
    { label: 'Planos', path: appPath('/admin/plans'), icon: '💳' },
    { label: 'Webinars', path: appPath('/admin/webinars'), icon: '🎥' },
  ];

  return (
    <div className="flex h-dvh bg-gray-100">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } ${
          mobileOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
        } max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-64 bg-gray-900 text-white transition-transform duration-300 flex flex-col`}
      >
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          {(sidebarOpen || mobileOpen) && <h1 className="text-xl font-bold">S1m0ne</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-gray-800 rounded"
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                setMobileOpen(false);
                navigate(item.path);
              }}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded hover:bg-gray-800 transition-colors text-left"
            >
              <span className="text-xl">{item.icon}</span>
              {(sidebarOpen || mobileOpen) && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded hover:bg-red-600 transition-colors text-left"
          >
            <span className="text-xl">🚪</span>
            {(sidebarOpen || mobileOpen) && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 max-md:min-h-0">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="flex justify-between items-center min-h-16 h-auto gap-3 px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                className="md:hidden inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-200"
                aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((open) => !open)}
              >
                <span className="flex w-4 flex-col gap-1" aria-hidden="true">
                  <span className="block h-0.5 rounded bg-gray-800" />
                  <span className="block h-0.5 rounded bg-gray-800" />
                  <span className="block h-0.5 rounded bg-gray-800" />
                </span>
              </button>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">Painel Administrativo</h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0 min-w-0">
              <span className="text-gray-700 truncate max-w-[7rem] sm:max-w-none">{user?.name}</span>
              <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                Admin
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
