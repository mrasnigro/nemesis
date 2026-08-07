import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { appPath } from '../lib/appBase';

interface Webinar {
  id: string;
  title: string;
  description: string;
  scheduledAt: string;
  status: string;
  maxParticipants: number;
  currentParticipants: number;
  createdBy: string;
}

export const AdminWebinars: React.FC = () => {
  const navigate = useNavigate();
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWebinar, setSelectedWebinar] = useState<Webinar | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    const fetchWebinars = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/webinars');
        setWebinars(response.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Erro ao carregar webinars');
      } finally {
        setLoading(false);
      }
    };

    fetchWebinars();
  }, []);

  const handleViewWebinar = (webinar: Webinar) => {
    setSelectedWebinar(webinar);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando webinars...</p>
          </div>
        </div>
      
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="mb-6">
        <button 
          onClick={() => navigate(appPath('/admin/webinars/new'))}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          ➕ Novo Webinar
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">Webinars ({webinars.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Título
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Data Agendada
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Participantes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Criador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {webinars.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Nenhum webinar encontrado
                  </td>
                </tr>
              ) : (
                webinars.map((webinar) => (
                  <tr key={webinar.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <div>
                        <p className="font-semibold">{webinar.title}</p>
                        <p className="text-gray-500 text-xs">{webinar.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(webinar.scheduledAt).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(webinar.scheduledAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          webinar.status === 'live'
                            ? 'bg-green-100 text-green-800'
                            : webinar.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {webinar.status === 'live'
                          ? '🔴 Ao Vivo'
                          : webinar.status === 'scheduled'
                          ? '⏰ Agendado'
                          : '✓ Finalizado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${
                                webinar.maxParticipants > 0
                                  ? (webinar.currentParticipants / webinar.maxParticipants) * 100
                                  : 0
                              }%`,
                            }}
                          ></div>
                        </div>
                        <span>
                          {webinar.currentParticipants}/{webinar.maxParticipants}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {webinar.createdBy}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button 
                        onClick={() => handleViewWebinar(webinar)}
                        className="px-3 py-1 rounded text-xs font-medium bg-blue-100 hover:bg-blue-200 text-blue-800 transition-colors"
                      >
                        👁️ Ver
                      </button>
                      {(webinar.status === 'scheduled' || webinar.status === 'live' || webinar.status === 'draft') && (
                        <button 
                          onClick={() => window.open(appPath(`/studio/preview/${webinar.id}`), '_blank')}
                          className="px-3 py-1 rounded text-xs font-medium bg-green-100 hover:bg-green-200 text-green-800 transition-colors"
                        >
                          🎥 Estúdio
                        </button>
                      )}
                      <button className="px-3 py-1 rounded text-xs font-medium bg-purple-100 hover:bg-purple-200 text-purple-800 transition-colors">
                        📊 Stats
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-sm font-bold text-gray-700 mb-2">Webinars Agendados</h4>
          <p className="text-3xl font-bold text-blue-600">
            {webinars.filter((w) => w.status === 'scheduled').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-sm font-bold text-gray-700 mb-2">Webinars Ao Vivo</h4>
          <p className="text-3xl font-bold text-green-600">
            {webinars.filter((w) => w.status === 'live').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-sm font-bold text-gray-700 mb-2">Webinars Finalizados</h4>
          <p className="text-3xl font-bold text-gray-600">
            {webinars.filter((w) => w.status === 'finished').length}
          </p>
        </div>
      </div>

      {/* Modal Detalhes do Webinar */}
      {showDetailModal && selectedWebinar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{selectedWebinar.title}</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-semibold text-gray-600">Descrição</label>
                <p className="text-gray-800 mt-1">{selectedWebinar.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Data Agendada</label>
                  <p className="text-gray-800 mt-1">
                    {new Date(selectedWebinar.scheduledAt).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(selectedWebinar.scheduledAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600">Status</label>
                  <p className="text-gray-800 mt-1">
                    {selectedWebinar.status === 'live'
                      ? '🔴 Ao Vivo'
                      : selectedWebinar.status === 'scheduled'
                      ? '⏰ Agendado'
                      : '✓ Finalizado'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Participantes</label>
                  <p className="text-gray-800 mt-1">
                    {selectedWebinar.currentParticipants} / {selectedWebinar.maxParticipants}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-600">Criador</label>
                  <p className="text-gray-800 mt-1">{selectedWebinar.createdBy}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600">Taxa de Ocupação</label>
                <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                  <div
                    className="bg-blue-600 h-3 rounded-full"
                    style={{
                      width: `${
                        selectedWebinar.maxParticipants > 0
                          ? (selectedWebinar.currentParticipants / selectedWebinar.maxParticipants) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {selectedWebinar.maxParticipants > 0
                    ? ((selectedWebinar.currentParticipants / selectedWebinar.maxParticipants) * 100).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
              {(selectedWebinar.status === 'scheduled' || selectedWebinar.status === 'live' || selectedWebinar.status === 'draft') && (
                <button 
                  onClick={() => window.open(appPath(`/studio/preview/${selectedWebinar.id}`), '_blank')}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Entrar no Estúdio
                </button>
              )}
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Editar
              </button>
            </div>
          </div>
                </div>
      )}
    </>
  );
};
