import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';

const StudioLayout: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Studio Header */}
      <header className="bg-gray-950 border-b border-gray-800 h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/webinars')}
            className="text-gray-400 hover:text-white transition-colors"
            title="Voltar para Webinars"
          >
            ← Voltar
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <h1 className="font-bold text-lg tracking-wider">ESTÚDIO <span className="text-red-500">PRO</span></h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            Conexão Excelente
          </div>
          <div className="text-gray-400">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </header>

      {/* Studio Content */}
      <main className="flex-1 flex overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default StudioLayout;
