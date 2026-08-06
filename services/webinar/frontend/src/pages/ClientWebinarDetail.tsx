import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Users, MessageSquare, Clock, Calendar } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'registered' | 'attended' | 'no-show';
  registeredAt: string;
  attendedAt?: string;
  messageCount: number;
}

interface WebinarDetail {
  id: string;
  title: string;
  description: string;
  date: string;
  instructor: string;
  status: 'live' | 'scheduled' | 'recorded';
  duration: number;
  totalLeads: number;
  attendedLeads: number;
}

const ClientWebinarDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [webinar, setWebinar] = useState<WebinarDetail | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'attended' | 'registered' | 'no-show'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchWebinarDetail = async () => {
      try {
        const res = await api.get(`/client/webinars/${id}`);
        setWebinar(res.data.webinar);
      } catch (error) {
        console.error('Erro ao carregar detalhes do webinar:', error);
        // Mock data
        setWebinar({
          id: id || '1',
          title: 'Estratégias Avançadas de Vendas B2B',
          description: 'Aprenda a fechar negócios complexos com ciclos longos de vendas.',
          date: '2026-06-20T19:00:00Z',
          instructor: 'Márcio Nigro',
          status: 'scheduled',
          duration: 90,
          totalLeads: 45,
          attendedLeads: 32,
        });
      }
    };

    const fetchLeads = async () => {
      try {
        const res = await api.get(`/client/webinars/${id}/leads`);
        setLeads(res.data.leads || []);
        setFilteredLeads(res.data.leads || []);
      } catch (error) {
        console.error('Erro ao carregar leads:', error);
        // Mock data
        const mockLeads: Lead[] = [
          {
            id: '1',
            name: 'João Silva',
            email: 'joao@email.com',
            phone: '11999999999',
            status: 'attended',
            registeredAt: '2026-06-20T18:00:00Z',
            attendedAt: '2026-06-20T19:05:00Z',
            messageCount: 3,
          },
          {
            id: '2',
            name: 'Maria Santos',
            email: 'maria@email.com',
            phone: '11988888888',
            status: 'attended',
            registeredAt: '2026-06-20T18:30:00Z',
            attendedAt: '2026-06-20T19:10:00Z',
            messageCount: 5,
          },
          {
            id: '3',
            name: 'Pedro Costa',
            email: 'pedro@email.com',
            phone: '11977777777',
            status: 'registered',
            registeredAt: '2026-06-20T19:00:00Z',
            messageCount: 0,
          },
          {
            id: '4',
            name: 'Ana Oliveira',
            email: 'ana@email.com',
            phone: '11966666666',
            status: 'no-show',
            registeredAt: '2026-06-20T18:15:00Z',
            messageCount: 0,
          },
        ];
        setLeads(mockLeads);
        setFilteredLeads(mockLeads);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWebinarDetail();
    fetchLeads();
  }, [id]);

  useEffect(() => {
    let result = leads;

    if (activeTab !== 'all') {
      result = result.filter(l => l.status === activeTab);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(term) ||
        l.email.toLowerCase().includes(term) ||
        l.phone.includes(term)
      );
    }

    setFilteredLeads(result);
  }, [activeTab, searchTerm, leads]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'attended':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Participou
          </span>
        );
      case 'registered':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Registrado
          </span>
        );
      case 'no-show':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Não compareceu
          </span>
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

  if (!webinar) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Webinar não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{webinar.title}</h1>
          <p className="text-gray-500 mt-1">{webinar.description}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total de Leads</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{webinar.totalLeads}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Participaram</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{webinar.attendedLeads}</p>
            </div>
            <Users className="w-8 h-8 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Taxa de Presença</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {webinar.totalLeads > 0 ? ((webinar.attendedLeads / webinar.totalLeads) * 100).toFixed(0) : 0}%
              </p>
            </div>
            <MessageSquare className="w-8 h-8 text-purple-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Duração</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{webinar.duration} min</p>
            </div>
            <Clock className="w-8 h-8 text-orange-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Leads Registrados</h3>
            <input
              type="text"
              placeholder="Buscar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-gray-200 -mb-6">
            {[
              { id: 'all', name: 'Todos', count: leads.length },
              { id: 'attended', name: 'Participaram', count: leads.filter(l => l.status === 'attended').length },
              { id: 'registered', name: 'Registrados', count: leads.filter(l => l.status === 'registered').length },
              { id: 'no-show', name: 'Não Compareceram', count: leads.filter(l => l.status === 'no-show').length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.name} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Telefone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Registrado em</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Mensagens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLeads.length > 0 ? (
                filteredLeads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lead.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{lead.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{lead.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(lead.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(lead.registeredAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {lead.messageCount}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Nenhum lead encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClientWebinarDetail;
