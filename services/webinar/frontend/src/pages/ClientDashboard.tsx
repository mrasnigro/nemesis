import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { 
  PlayCircle, 
  Calendar, 
  CheckCircle, 
  ArrowRight,
  Clock,
  Star,
  UserCircle
} from 'lucide-react';

interface ClientStats {
  activePlan: string;
  status: string;
  nextRenewal: string;
  availableWebinars: number;
  watchedWebinars: number;
  upcomingWebinars: number;
}

interface Webinar {
  id: string;
  title: string;
  description: string;
  date: string;
  instructor: string;
  status: string;
  duration: number;
}

const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [upcomingWebinars, setUpcomingWebinars] = useState<Webinar[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, webinarsRes] = await Promise.all([
          api.get('/client/stats'),
          api.get('/client/webinars')
        ]);
        
        setStats(statsRes.data);
        
        // Filter only upcoming or live webinars and take top 2
        const upcoming = webinarsRes.data
          .filter((w: Webinar) => w.status === 'scheduled' || w.status === 'live')
          .slice(0, 2);
          
        setUpcomingWebinars(upcoming);
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        // Fallback para mock local caso a API falhe
        setStats({
          activePlan: 'Plano Pro',
          status: 'Ativo',
          nextRenewal: '2026-07-17',
          availableWebinars: 12,
          watchedWebinars: 4,
          upcomingWebinars: 3
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header/Greeting */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">
          Bem-vindo de volta, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="mt-1 text-gray-500">
          Aqui está o resumo da sua conta e seus próximos conteúdos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Stats & Subscription */}
        <div className="md:col-span-1 space-y-6">
          {/* Subscription Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Star className="w-5 h-5 mr-2 text-yellow-500" />
                Sua Assinatura
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Plano Atual</p>
                <p className="text-xl font-bold text-indigo-600">{stats?.activePlan}</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                    {stats?.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Renovação</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {new Date(stats?.nextRenewal || '').toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <Link 
                  to="/dashboard/subscription" 
                  className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center justify-center"
                >
                  Gerenciar assinatura
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">Seu Progresso</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-700">
                  <PlayCircle className="w-5 h-5 mr-2 text-indigo-500" />
                  <span>Webinars Disponíveis</span>
                </div>
                <span className="font-semibold">{stats?.availableWebinars}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                  <span>Assistidos</span>
                </div>
                <span className="font-semibold">{stats?.watchedWebinars}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Webinars */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-indigo-500" />
                Próximos Webinars
              </h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate('/dashboard/webinars/new')}
                  className="text-sm bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-1 rounded"
                >
                  + Novo
                </button>
                <Link to="/dashboard/webinars" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                  Ver todos
                </Link>
              </div>
            </div>
            
            <div className="p-0">
              {upcomingWebinars.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {upcomingWebinars.map((webinar) => (
                    <li key={webinar.id} className="p-5 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {webinar.status === 'live' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <span className="w-2 h-2 mr-1 bg-red-500 rounded-full animate-pulse"></span>
                                AO VIVO AGORA
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Agendado
                              </span>
                            )}
                            <span className="text-xs text-gray-500 flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {webinar.duration} min
                            </span>
                          </div>
                          <h3 className="text-base font-semibold text-gray-900">{webinar.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">{webinar.description}</p>
                          <div className="mt-2 text-sm text-gray-600 flex items-center gap-4">
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                              {new Date(webinar.date).toLocaleString('pt-BR', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                            <span className="flex items-center">
                              <UserCircle className="w-4 h-4 mr-1 text-gray-400" />
                              {webinar.instructor}
                            </span>
                          </div>
                        </div>
                        <div className="sm:ml-4 flex-shrink-0">
                          <button 
                            onClick={() => webinar.status === 'live' && navigate(`/live/${webinar.id}`)}
                            className={`w-full sm:w-auto px-4 py-2 rounded-md text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              webinar.status === 'live' 
                                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 cursor-pointer' 
                                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 cursor-pointer'
                            }`}>
                            {webinar.status === 'live' ? 'Acessar Sala' : 'Agendar Lembrete'}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p>Nenhum webinar agendado para os próximos dias.</p>
                  <Link to="/dashboard/webinars" className="text-indigo-600 hover:text-indigo-800 mt-2 inline-block">
                    Acesse a biblioteca de gravações
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
