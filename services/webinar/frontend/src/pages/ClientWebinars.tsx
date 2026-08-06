import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Calendar, 
  UserCircle,
  Search,
  Filter
} from 'lucide-react';

interface Webinar {
  id: string;
  title: string;
  description: string;
  scheduledDate: string;
  presenterName: string;
  status: 'live' | 'scheduled' | 'recorded' | 'draft';
  durationMinutes: number;
  maxParticipants: number;
  currentParticipants: number;
}

const ClientWebinars: React.FC = () => {
  const navigate = useNavigate();
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [filteredWebinars, setFilteredWebinars] = useState<Webinar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'scheduled' | 'recorded'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchWebinars = async () => {
      try {
        const res = await api.get('/client/webinars');
        const formattedWebinars = res.data.map((w: any) => ({
          id: String(w.id),
          title: w.title,
          description: w.description || '',
          scheduledDate: w.scheduledDate,
          presenterName: w.presenterName || 'N/A',
          status: w.status || 'draft',
          durationMinutes: w.durationMinutes || 60,
          maxParticipants: w.maxParticipants || 0,
          currentParticipants: w.currentParticipants || 0,
        }));
        setWebinars(formattedWebinars);
        setFilteredWebinars(formattedWebinars);
      } catch (error) {
        console.error('Erro ao carregar webinars:', error);
        // Fallback
        const mockData: Webinar[] = [
          {
            id: '1',
            title: 'Estratégias Avançadas de Vendas B2B',
            description: 'Aprenda a fechar negócios complexos com ciclos longos de vendas.',
            scheduledDate: '2026-06-20T19:00:00Z',
            presenterName: 'Márcio Nigro',
            status: 'scheduled',
            durationMinutes: 90,
            maxParticipants: 100,
            currentParticipants: 25
          },
          {
            id: '3',
            title: 'Sessão de Mentoria ao Vivo',
            description: 'Tire suas dúvidas sobre estruturação de funis de venda.',
            scheduledDate: '2026-06-17T18:00:00Z',
            presenterName: 'Márcio Nigro',
            status: 'live',
            durationMinutes: 60,
            maxParticipants: 50,
            currentParticipants: 10
          },
          {
            id: '4',
            title: 'Fundamentos de Copywriting',
            description: 'Textos que vendem: a base da persuasão escrita.',
            scheduledDate: '2026-05-10T19:00:00Z',
            presenterName: 'Carlos Mendes',
            status: 'recorded',
            durationMinutes: 90,
            maxParticipants: 200,
            currentParticipants: 150
          }
        ];
        setWebinars(mockData);
        setFilteredWebinars(mockData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWebinars();
  }, []);

  useEffect(() => {
    let result = webinars;
    
    if (activeTab !== 'all') {
      result = result.filter(w => w.status === activeTab);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(w => 
        w.title.toLowerCase().includes(term) || 
        w.description.toLowerCase().includes(term) ||
        w.presenterName.toLowerCase().includes(term)
      );
    }
    
    setFilteredWebinars(result);
  }, [activeTab, searchTerm, webinars]);

  const getStatusBadge = (status: string) => {
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          status === 'live'
            ? 'bg-green-100 text-green-800'
            : status === 'scheduled'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        {status === 'live'
          ? '🔴 Ao Vivo'
          : status === 'scheduled'
          ? '⏰ Agendado'
          : '✓ Finalizado'}
      </span>
    );
  };

  const getActionButton = (status: string, id: string) => {
    switch (status) {
      case 'live':
        return (
          <button 
            onClick={() => navigate(`/studio/preview/${id}`)}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
          >
            <Play className="w-4 h-4 mr-2" />
            Acessar Sala
          </button>
        );
      case 'scheduled':
        return (
          <button className="w-full flex items-center justify-center px-4 py-2 border border-indigo-600 rounded-md shadow-sm text-sm font-medium text-indigo-600 bg-white hover:bg-indigo-50">
            <Calendar className="w-4 h-4 mr-2" />
            Agendar Lembrete
          </button>
        );
      case 'draft':
        return (
          <button 
            onClick={() => navigate(`/dashboard/webinars/${id}`)}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Editar Rascunho
          </button>
        );
      case 'recorded':
        return (
          <button className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
            <Play className="w-4 h-4 mr-2" />
            Assistir Gravação
          </button>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Webinars</h1>
          <p className="mt-1 text-sm text-gray-500">Acesse todo o conteúdo disponível na sua assinatura.</p>
        </div>
        <button 
          onClick={() => navigate("/dashboard/webinars/new")}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          ➕ Novo Webinar
        </button>
      </div>
      
      <div className="relative w-full sm:w-64">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Buscar webinars..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {[
            { id: 'all', name: 'Todos' },
            { id: 'live', name: 'Ao Vivo' },
            { id: 'scheduled', name: 'Próximos' },
            { id: 'recorded', name: 'Gravações' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Webinar Grid */}
      {filteredWebinars.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWebinars.map((webinar) => (
            <div key={webinar.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              {/* Thumbnail Placeholder */}
              <div className="h-48 bg-gray-200 relative">
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <Play className="w-12 h-12 opacity-50" />
                </div>
                <div className="absolute top-4 left-4">
                  {getStatusBadge(webinar.status)}
                </div>
                <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {webinar.durationMinutes} min
                </div>
                {webinar.maxParticipants > 0 && (
                  <div className="absolute bottom-4 left-4 flex items-center text-white text-xs px-2 py-1 rounded bg-black/70">
                    👥 {webinar.currentParticipants}/{webinar.maxParticipants}
                  </div>
                )}
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 mb-2">
                  {webinar.title}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">
                  {webinar.description}
                </p>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    {new Date(webinar.scheduledDate).toLocaleString('pt-BR', {
                      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <UserCircle className="w-4 h-4 mr-2 text-gray-400" />
                    {webinar.presenterName}
                  </div>
                  {webinar.maxParticipants > 0 && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">👥</span>
                      {webinar.currentParticipants} / {webinar.maxParticipants} participantes
                    </div>
                  )}
                </div>
                
                <div className="mt-auto space-y-2">
                  <button
                    onClick={() => navigate(`/dashboard/webinars/${webinar.id}`)}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Ver Detalhes
                  </button>
                  {getActionButton(webinar.status, webinar.id)}
                  {(webinar.status === 'draft' || webinar.status === 'scheduled') && (
                    <button 
                      onClick={() => navigate(`/studio/preview/${webinar.id}`)}
                      className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                    >
                      🎥 Estúdio
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Filter className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum webinar encontrado</h3>
          <p className="mt-1 text-sm text-gray-500">
            Tente ajustar os filtros ou o termo de busca.
          </p>
          <div className="mt-6">
            <button
              onClick={() => {
                setActiveTab('all');
                setSearchTerm('');
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientWebinars;
