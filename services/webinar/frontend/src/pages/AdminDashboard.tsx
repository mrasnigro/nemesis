import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface Stats {
  totalClients: number;
  totalWebinars: number;
  totalLeads: number;
  totalRevenue: number;
  activeClients: number;
  activeWebinars: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  plan: string;
  createdAt: string;
  subscriptionExpiresAt?: string; // Adicionando a data de vencimento da assinatura
  isTrial?: boolean;
  isTrialVencido?: boolean;
  isRecorrente?: boolean;
  isNaoRenovadoRecorrentes?: boolean;
}

interface Payment {
  id: string;
  clientId: string;
  clientName: string;
  planName?: string; // Adicionando o nome do plano
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  date: string;
  expiresAt?: string; // Adicionando a data de vencimento
  lastPaymentDate?: string; // Adicionando a data do último pagamento
  isTrial?: boolean;
  isTrialVencido?: boolean;
  isRecorrente?: boolean;
  isNaoRenovadoRecorrentes?: boolean;
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    totalWebinars: 0,
    totalLeads: 0,
    totalRevenue: 0,
    activeClients: 0,
    activeWebinars: 0,
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: '', email: '', password: '', plan: 'Trial' });
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [togglingClientId, setTogglingClientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'payments'>('dashboard');
  const [paymentFilter, setPaymentFilter] = useState<'trial' | 'trial_vencido' | 'recorrentes' | 'nao_renovados_recorrentes'>('trial');
  const [plansList, setPlansList] = useState<any[]>([]);
  const [newPaymentData, setNewPaymentData] = useState({
    clientId: '',
    planId: '',
    amount: 0,
    status: 'paid'
  });
  const [showNewPaymentModal, setShowNewPaymentModal] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(false); // Declaração da variável de estado
  const [isLoadingPaymentData, setIsLoadingPaymentData] = useState(true); // New state for loading

  const loadStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      if (response.data) {
        setStats({
          totalClients: response.data.totalUsers || 0,
          totalWebinars: response.data.totalWebinars || 0,
          totalLeads: response.data.totalSubscriptions || 0,
          totalRevenue: response.data.totalRevenue || 0,
          activeClients: response.data.activeUsers || 0,
          activeWebinars: response.data.activeWebinars || 0,
        });
      }
    } catch (err: any) {
      console.error('Erro ao carregar stats:', err);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

    useEffect(() => {
    if (activeTab === 'dashboard') {
      loadStats();
    } else if (activeTab === 'clients') {
      const loadClientsWithPayments = async () => {
        await loadPlans();
        const clientsData = await loadClients();
        await loadPayments(clientsData);
      };
      loadClientsWithPayments();
    } else if (activeTab === 'payments') {
      const loadAllPaymentData = async () => {
        setIsLoadingPaymentData(true);
        try {
          // 1. Carregar planos e clientes PRIMEIRO para garantir que o mapeamento de pagamentos tenha dados
          await loadPlans();
          const clientsData = await loadClients();
          // 2. Carregar e categorizar pagamentos usando os clientes recém-carregados
          await loadPayments(clientsData);
        } catch (error) {
          console.error("Failed to load payment data:", error);
        } finally {
          setIsLoadingPaymentData(false);
        }
      };
      loadAllPaymentData();
    }
  }, [activeTab, paymentFilter]);

  const loadPlans = async () => {
    try {
      const response = await api.get('/admin/plans');
      setPlansList(response.data.plans || response.data || []);
    } catch (err) {
      console.error('Erro ao carregar planos:', err);
    }
  };

  const loadClients = async (paymentsData: Payment[] = []) => {
    try {
      const response = await api.get('/admin/clients');
      const rawClients = response.data.clients || response.data || [];
      const uniqueClients = rawClients.reduce((acc: any[], current: any) => {
        const x = acc.find(item => item.id === current.id);
        if (!x) return acc.concat([current]);
        return acc;
      }, []);

      const mappedClients = uniqueClients.map((c: any) => {
        const categorizedPayment = paymentsData.find(p => p.clientId === c.id);
        return {
          id: c.id,
          name: c.name,
          email: c.email,
          status: c.isActive === 1 ? 'active' : 'inactive',
          plan: c.planName || 'Sem Plano',
          createdAt: c.createdAt,
          subscriptionExpiresAt: c.subscriptionExpiresAt,
          isTrial: categorizedPayment?.isTrial || false,
          isTrialVencido: categorizedPayment?.isTrialVencido || false,
          isRecorrente: categorizedPayment?.isRecorrente || false,
          isNaoRenovadoRecorrentes: categorizedPayment?.isNaoRenovadoRecorrentes || false,
        };
      });

      setClients(mappedClients);
      return mappedClients;
    } catch (err: any) {
      console.error('Erro ao carregar clientes:', err);
      return [];
    }
  };

  const handleSaveClient = async () => {
    if (!newClientData.name || !newClientData.email || (!editingClientId && !newClientData.password)) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingClientId) {
        await api.put(`/admin/clients/${editingClientId}`, newClientData);
      } else {
        await api.post('/admin/clients', newClientData);
      }
      await loadClients();
      setShowNewClientModal(false);
      setEditingClientId(null);
      setNewClientData({ name: '', email: '', password: '', plan: 'Trial' });
    } catch (err: any) {
      console.error('Erro ao salvar cliente:', err);
      alert('Erro ao salvar cliente: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleToggleClientStatus = async (clientId: string) => {
    try {
      setTogglingClientId(clientId);
      await api.post(`/admin/clients/${clientId}/toggle`);
      await loadClients();
    } catch (err) {
      console.error('Erro ao alternar status do cliente:', err);
    } finally {
      setTogglingClientId(null);
    }
  };

  const loadPayments = async (providedClients?: any[]) => {
    try {
      const response = await api.get("/admin/payments");
      const paymentsData = response.data.payments || response.data || [];

      const now = new Date();
      
      // Se não foram passados clientes, usa o estado (pode estar vazio no primeiro load)
      const clientsData = providedClients || clients;
      if (clientsData.length === 0) return paymentsData;

      const allPayments = paymentsData;

      const categorizedClientsPayments = clientsData.map((client: any) => {
        const clientId = client.id;
        const clientCreatedAt = new Date(client.createdAt);
        const currentPlanName = client.planName || client.plan;

        // Filtrar TODOS os pagamentos do cliente (comparação robusta de ID)
        const clientAllPayments = allPayments.filter((p: any) => {
          const pClientId = (p.clientId || p.client_id)?.toString();
          return pClientId === clientId.toString();
        });
        
        // Pagamentos pagos (valor > 0)
        const paidPayments = clientAllPayments.filter((p: any) => {
          const status = (p.status || p.paymentStatus || '').toLowerCase();
          const amount = typeof p.amount === 'string' ? parseFloat(p.amount) : (p.amount || 0);
          return (status === 'paid' || status === 'completed') && amount > 0;
        });
        paidPayments.sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
        const latestPaidPayment = paidPayments.length > 0 ? paidPayments[0] : null;

        // Fatura atual (a mais recente, independente de status)
        clientAllPayments.sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
        const currentInvoice = clientAllPayments.length > 0 ? clientAllPayments[0] : null;

        let category = '';
        let isTrial = false;
        let isTrialVencido = false;
        let isRecorrente = false;
        let isNaoRenovadoRecorrentes = false;

        const now = new Date();
        
        // Novas Regras de Categorização:
        // Consideramos Trial se o cliente tem um registro de plano 'Trial' (independente de status)
        // E tem um registro de plano 'Básico' que está PENDENTE.
        // Função auxiliar para normalizar nomes de planos (remover acentos e minúsculas)
        const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
        const isExpired = (date: any) => {
          if (!date) return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const compareDate = new Date(date);
          compareDate.setHours(0, 0, 0, 0);
          return compareDate < today;
        };

        const hasTrialRecord = clientAllPayments.some(p => normalize(p.planName).includes('trial'));
        const pendingBasicInvoice = clientAllPayments.find(p => 
          normalize(p.planName).includes('basico') && 
          (p.status === 'pending' || p.paymentStatus === 'pending')
        );
        
        const anyPaidCount = clientAllPayments.filter(p => 
          ['paid', 'completed', 'pago', 'sucesso', 'confirmado', 'ativo'].includes(p.status?.toLowerCase()) ||
          ['paid', 'completed', 'pago', 'sucesso', 'confirmado', 'ativo'].includes(p.paymentStatus?.toLowerCase())
        ).length;
        const currentPendingInvoice = clientAllPayments.find(p => p.status === 'pending' || p.status === 'pendente');

        // Nova lógica de categorização estrita conforme solicitado (Ordem: Trial -> Não Renovados Trial -> Recorrentes -> Não Renovados Recorrentes)
        // 1. Trial
        if (anyPaidCount === 1 && hasTrialRecord && pendingBasicInvoice && !isExpired(pendingBasicInvoice.expiresAt)) {
          isTrial = true;
          category = 'trial';
        }
        // 2. Não Renovados Trial
        else if (anyPaidCount === 1 && hasTrialRecord && pendingBasicInvoice && isExpired(pendingBasicInvoice.expiresAt)) {
          isTrialVencido = true;
          category = 'trial_vencido';
        }
        // 3. Recorrentes
        else if (anyPaidCount >= 2 && currentPendingInvoice && !isExpired(currentPendingInvoice.expiresAt)) {
          isRecorrente = true;
          category = 'recorrentes';
        }
        // 4. Não Renovados Recorrentes
        else if (anyPaidCount >= 2 && currentPendingInvoice && isExpired(currentPendingInvoice.expiresAt)) {
          isNaoRenovadoRecorrentes = true;
          category = 'nao_renovados_recorrentes';
        }

        // Para abas Trial e Recorrentes com fatura pendente, queremos mostrar os dados da fatura PENDENTE
        const displayInvoice = (isTrial || isTrialVencido || isRecorrente || isNaoRenovadoRecorrentes) ? currentPendingInvoice : (currentInvoice || latestPaidPayment);
        
        let displayDate = 'N/A';
        const dateToFormat = latestPaidPayment || currentInvoice;
        if (dateToFormat) {
          const d = new Date(dateToFormat.date || dateToFormat.createdAt);
          if (!isNaN(d.getTime())) displayDate = d.toLocaleDateString('pt-BR');
        }

        return {
          id: displayInvoice ? displayInvoice.id : `client-${clientId}-no-payment`,
          clientId: clientId,
          clientName: client.name,
          planName: displayInvoice?.planName || currentPlanName,
          amount: displayInvoice 
            ? (typeof displayInvoice.amount === 'string' ? parseFloat(displayInvoice.amount) : (displayInvoice.amount || 0)) 
            : (plansList.find(p => p.name === currentPlanName)?.price || 0),
          status: displayInvoice ? (displayInvoice.status === 'paid' ? 'completed' : (displayInvoice.status || 'pending')) : 'N/A',
          date: displayDate,
          expiresAt: displayInvoice?.expiresAt || client.subscriptionExpiresAt,
          lastPaymentDate: displayInvoice?.lastPaymentDate || latestPaidPayment?.date,
          isTrial: isTrial,
          isTrialVencido: isTrialVencido,
          isRecorrente: isRecorrente,
          isNaoRenovadoRecorrentes: isNaoRenovadoRecorrentes,
        };
      });

      setPayments(categorizedClientsPayments);
      return categorizedClientsPayments; // Retornar os pagamentos categorizados
    } catch (err: any) {
      console.error("Erro ao carregar pagamentos:", err);
    }
  };

  const filteredPayments = payments.filter(p => {
    if (paymentFilter === 'trial') return p.isTrial;
    if (paymentFilter === 'trial_vencido') return p.isTrialVencido;
    if (paymentFilter === 'recorrentes') return p.isRecorrente;
    if (paymentFilter === 'nao_renovados_recorrentes') return p.isNaoRenovadoRecorrentes;

    return false;
  });


  const handleConfirmPayment = async (paymentId: number, clientId: number, planId: number) => {
    try {
      // 1. Update payment status to completed
      await api.put(`/admin/payments/${paymentId}`, { paymentStatus: 'paid' });
      
      // 2. Update client subscription plan if needed (conversion)
      // If converting from Trial, the planId passed will be the new plan
      await api.put(`/admin/clients/${clientId}`, { planId });
      
      alert('Pagamento confirmado e cliente atualizado com sucesso!');
      await loadPayments();
      await loadClients();
    } catch (err: any) {
      console.error('Erro ao confirmar pagamento:', err);
      alert('Erro ao confirmar pagamento: ' + (err.response?.data?.error || err.message));
    }
  };

  const cards = [
    {
      title: 'Total de Clientes',
      value: stats?.totalClients || 0,
      subtext: `${stats?.activeClients || 0} ativos`,
      color: 'bg-blue-50',
      icon: '👥',
    },
    {
      title: 'Total de Webinars',
      value: stats?.totalWebinars || 0,
      subtext: `${stats?.activeWebinars || 0} ao vivo`,
      color: 'bg-green-50',
      icon: '🎥',
    },
    {
      title: 'Total de Leads',
      value: stats?.totalLeads || 0,
      subtext: 'Participantes registrados',
      color: 'bg-purple-50',
      icon: '📊',
    },
    {
      title: 'Receita Total',
      value: `R$ ${stats?.totalRevenue || 0}`,
      subtext: 'Este mês',
      color: 'bg-orange-50',
      icon: '💰',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 font-medium ${activeTab === 'dashboard' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`px-4 py-2 font-medium ${activeTab === 'clients' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
        >
          Clientes
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 font-medium ${activeTab === 'payments' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
        >
          Pagamentos
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card, index) => (
              <div
                key={index}
                className={`${card.color} rounded-lg shadow p-6 border-l-4 border-blue-600`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">{card.title}</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{card.value}</p>
                    <p className="text-gray-500 text-xs mt-2">{card.subtext}</p>
                  </div>
                  <div className="text-4xl">{card.icon}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Resumo do Sistema</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-gray-600">Taxa de Ativação de Clientes</span>
                  <span className="font-bold text-blue-600">
                    {stats?.totalClients ? ((stats.activeClients / stats.totalClients) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-gray-600">Webinars em Transmissão</span>
                  <span className="font-bold text-green-600">{stats?.activeWebinars || 0}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-gray-600">Total de Leads</span>
                  <span className="font-bold text-purple-600">{stats?.totalLeads || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Receita Total</span>
                  <span className="font-bold text-orange-600">R$ {stats?.totalRevenue || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Ações Rápidas</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setEditingClientId(null);
                    setNewClientData({ name: '', email: '', password: '', plan: 'Trial' });
                    setShowNewClientModal(true);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  ➕ Novo Cliente
                </button>
                <button 
                  onClick={() => navigate('/admin/webinars/new')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  ➕ Novo Webinar
                </button>
        <button 
          onClick={async () => {
            setNewPaymentData({ clientId: '', planId: '', amount: 0, status: 'paid' });
            setIsEditingPayment(false);
            // Garantir que os dados estejam carregados ao abrir o modal
            await loadPlans();
            const clientsData = await loadClients();
            await loadPayments(clientsData);
            setShowNewPaymentModal(true);
          }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  ➕ Novo Pagamento
                </button>
                <button 
                  onClick={() => setActiveTab('clients')}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  📊 Gerenciar Clientes
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Clients Tab */}
      {activeTab === 'clients' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">Clientes ({clients.length})</h3>
            <button 
              onClick={() => {
                setEditingClientId(null);
                setNewClientData({ name: '', email: '', password: '', plan: 'Trial' });
                setShowNewClientModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              ➕ Novo Cliente
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Plano</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Data de Ativação</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Nenhum cliente encontrado</td>
                  </tr>
                ) : (
                  clients.map(client => {
                    // Lógica para determinar o nome do plano exibido: Pega exatamente o último plano atual do cliente
                    const clientPayments = [...payments].filter(p => (p.clientId || p.client_id)?.toString() === client.id.toString());
                    
                    // Ordenar por data de expiração ou criação para garantir que pegamos o mais recente
                    clientPayments.sort((a, b) => {
                      const dateA = new Date(a.expiresAt || a.date || 0).getTime();
                      const dateB = new Date(b.expiresAt || b.date || 0).getTime();
                      return dateB - dateA;
                    });

                    const latestPayment = clientPayments[0];
                    const displayPlan = latestPayment?.planName || client.planName || 'Sem Plano';

                    return (
                      <tr key={client.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{client.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {displayPlan}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {client.status === 'active' ? '✓ Ativo' : '✗ Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {client.createdAt ? new Date(client.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={() => handleToggleClientStatus(client.id.toString())}
                            disabled={togglingClientId === client.id.toString()}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              client.status === 'active'
                                ? 'bg-red-100 hover:bg-red-200 text-red-800'
                                : 'bg-green-100 hover:bg-green-200 text-green-800'
                            } disabled:opacity-50`}
                          >
                            {togglingClientId === client.id.toString() ? '...' : client.status === 'active' ? 'Desativar' : 'Ativar'}
                          </button>
                          <button 
                            onClick={() => {
                              console.log('Editing client:', client);
                              setNewClientData({ 
                                name: client.name, 
                                email: client.email, 
                                password: '', 
                                plan: client.plan 
                              });
                              setEditingClientId(client.id);
                              setShowNewClientModal(true);
                            }}
                            className="px-3 py-1 rounded text-xs font-medium bg-blue-100 hover:bg-blue-200 text-blue-800 transition-colors"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">Gerenciar Pagamentos</h3>
              <button 
                onClick={async () => {
                  setNewPaymentData({ clientId: '', planId: '', amount: 0, status: 'paid' });
                  setIsEditingPayment(false);
                  // Garantir que os dados estejam carregados ao abrir o modal
                  await loadPlans();
                  const clientsData = await loadClients();
                  await loadPayments(clientsData);
                  setShowNewPaymentModal(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                ➕ Novo Pagamento
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">

              <button 
                onClick={() => setPaymentFilter('trial')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all border ${
                  paymentFilter === 'trial' 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Trial
              </button>
              <button 
                onClick={() => setPaymentFilter('trial_vencido')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all border ${
                  paymentFilter === 'trial_vencido' 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Não Renovados Trial
              </button>
              <button 
                onClick={() => setPaymentFilter('recorrentes')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all border ${
                  paymentFilter === 'recorrentes' 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Recorrentes
              </button>
              <button 
                onClick={() => setPaymentFilter("nao_renovados_recorrentes")}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all border ${
                  paymentFilter === 'nao_renovados_recorrentes' 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Não Renovados Recorrentes
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Plano</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Data de Vencimento</th>
                  {(paymentFilter === 'recorrentes' || paymentFilter === 'nao_renovados_recorrentes') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Data Último Pagamento</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={(paymentFilter === 'recorrentes' || paymentFilter === 'nao_renovados_recorrentes') ? 6 : 5} className="px-6 py-4 text-center text-gray-500">Nenhum registro encontrado</td>
                  </tr>
                ) : (
                  filteredPayments.map(payment => {
                    const client = clients.find(c => c.id === payment.clientId);
                    return (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.clientName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{payment.planName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">R$ {payment.amount.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {payment.expiresAt && !isNaN(new Date(payment.expiresAt).getTime()) 
                            ? new Date(payment.expiresAt).toLocaleDateString('pt-BR') 
                            : 'N/A'}
                        </td>
                        {(paymentFilter === 'recorrentes' || paymentFilter === 'nao_renovados_recorrentes') && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {payment.lastPaymentDate && !isNaN(new Date(payment.lastPaymentDate).getTime())
                              ? new Date(payment.lastPaymentDate).toLocaleDateString("pt-BR")
                              : "N/A"}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">

                          {(paymentFilter === 'trial' || paymentFilter === 'trial_vencido' || paymentFilter === 'recorrentes' || paymentFilter === 'nao_renovados_recorrentes') && (
                            <button 
                              onClick={() => {
                                // Encontrar o ID do plano atual do cliente para pré-selecionar
                                const clientPlan = plansList.find(p => p.name === payment.planName);
                                const paymentId = typeof payment.id === 'string' && payment.id.startsWith('client-') ? null : payment.id;
                                
                                setNewPaymentData({ 
                                  clientId: payment.clientId.toString(), 
                                  planId: clientPlan ? clientPlan.id.toString() : '',
                                  amount: clientPlan ? parseFloat(clientPlan.price) : 0, 
                                  status: 'paid' 
                                });
                                setEditingPaymentId(paymentId);
                                // Forçar isEditingPayment como true para mostrar o cliente fixo no modal
                                setIsEditingPayment(true);
                                setShowNewPaymentModal(true);
                              }}
                              className="px-3 py-1 rounded text-xs font-medium bg-blue-100 hover:bg-blue-200 text-blue-800 transition-colors"
                            >
                              Editar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Novo Cliente */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{editingClientId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Nome" 
                value={newClientData.name}
                onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2" 
              />
              <input 
                type="email" 
                placeholder="Email" 
                autoComplete="off"
                value={newClientData.email}
                onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2" 
              />
              <input 
                type="password" 
                placeholder="Senha" 
                autoComplete="new-password"
                value={newClientData.password}
                onChange={(e) => setNewClientData({ ...newClientData, password: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2" 
              />
              {/* Plano fixo como Trial, removido da seleção */}
              <input type="hidden" value="Trial" />
              <div className="flex gap-2 justify-end">
                <button 
                  onClick={() => {
                    setShowNewClientModal(false);
                    setEditingClientId(null);
                    setNewClientData({ name: '', email: '', password: '', plan: 'Trial' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveClient}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingClientId ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Pagamento */}
      {showNewPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{isEditingPayment ? 'Confirmar Pagamento' : 'Novo Pagamento'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <select 
                  value={newPaymentData.clientId || ''}
                  onChange={(e) => {
                    const selectedClientId = e.target.value;
                    // Ao selecionar o cliente, buscar a fatura pendente e pré-selecionar o plano/valor
                    const clientPayments = payments.filter(p => (p.clientId || p.client_id)?.toString() === selectedClientId.toString());
                    const pendingInvoice = clientPayments.find(p => p.status === 'pending');
                    
                    if (pendingInvoice) {
                      const plan = plansList.find(p => p.name === pendingInvoice.planName);
                      setNewPaymentData({ 
                        ...newPaymentData, 
                        clientId: selectedClientId,
                        planId: plan ? plan.id.toString() : '',
                        amount: pendingInvoice.amount || (plan ? parseFloat(plan.price) : 0)
                      });
                      // Se for uma fatura real no banco, marcar o ID para atualização
                      const realId = typeof pendingInvoice.id === 'number' ? pendingInvoice.id : 
                                    (typeof pendingInvoice.id === 'string' && !pendingInvoice.id.startsWith('client-') ? parseInt(pendingInvoice.id) : null);
                      setEditingPaymentId(realId);
                      setIsEditingPayment(!!realId);
                    } else {
                      setNewPaymentData({ ...newPaymentData, clientId: selectedClientId, planId: '', amount: 0 });
                      setEditingPaymentId(null);
                      setIsEditingPayment(false);
                    }
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">Selecione um cliente</option>
                  {clients.filter(c => {
                    // Relacionar todos os clientes que possuem pagamentos pendentes
                    const clientPayments = payments.filter(p => (p.clientId || p.client_id)?.toString() === c.id.toString());
                    return clientPayments.some(p => p.status === 'pending');
                  }).map(client => (
                    <option key={client.id} value={client.id}>{client.name} ({client.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plano / Valor</label>
                <select 
                    value={newPaymentData.planId || ''}
                    onChange={(e) => {
                      const plan = plansList.find(p => p.id.toString() === e.target.value);
                      setNewPaymentData({ 
                        ...newPaymentData, 
                        planId: e.target.value,
                        amount: plan ? parseFloat(plan.price) : 0
                      });
                    }}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    {plansList
                      .filter(plan => plan.name !== 'Trial') // Remove a opção Trial
                      .map(plan => (
                        <option key={plan.id} value={plan.id}>{plan.name} - R$ {parseFloat(plan.price).toFixed(2)}</option>
                      ))
                    }
                  </select>
              </div>

              <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
                <p><strong>Data:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
                <p><strong>Status:</strong> Concluído (Automático)</p>
                <p className="mt-2 text-lg font-bold text-gray-900">Total: R$ {newPaymentData.amount.toFixed(2)}</p>
              </div>

              <div className="flex gap-2 justify-end">
                <button 
                  onClick={() => setShowNewPaymentModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    if (!newPaymentData.clientId || !newPaymentData.planId) {
                      alert('Selecione o cliente e o plano');
                      return;
                    }
                    setIsSavingPayment(true);
                    try {
                      if (isEditingPayment && editingPaymentId) {
                        // Confirmar pagamento existente e atualizar plano se alterado
                        await api.put(`/admin/payments/${editingPaymentId}`, {
                          paymentStatus: 'paid',
                          planId: newPaymentData.planId
                        });
                      } else {
                        // Criar novo pagamento já como pago
                        // Buscar a data de vencimento atual do cliente para projetar a próxima
                        const client = clients.find(c => c.id.toString() === newPaymentData.clientId);
                        const baseDate = client?.subscriptionExpiresAt ? new Date(client.subscriptionExpiresAt) : new Date();
                        
                        await api.post('/admin/payments', {
                          clientId: newPaymentData.clientId,
                          planId: newPaymentData.planId,
                          paymentStatus: 'paid',
                          amount: newPaymentData.amount,
                          expiresAt: baseDate.toISOString()
                        });
                      }
                      await loadPayments();
                      setShowNewPaymentModal(false);
                    } catch (err) {
                      console.error('Erro ao criar pagamento:', err);
                      alert('Erro ao criar pagamento');
                    } finally {
                      setIsSavingPayment(false);
                    }
                  }}
                  disabled={isSavingPayment}
                  className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ${isSavingPayment ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSavingPayment ? 'Processando...' : 'Confirmar Pagamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
