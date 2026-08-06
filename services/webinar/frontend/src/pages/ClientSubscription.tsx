import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { 
  CreditCard, 
  Check, 
  AlertCircle,
  Calendar,
  ShieldCheck
} from 'lucide-react';

interface Subscription {
  id: string;
  planName: string;
  price: number;
  status: string;
  billingCycle: string;
  currentPeriodEnd: string;
  features: string[];
}

const ClientSubscription: React.FC = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await api.get('/client/subscription');
        setSubscription(res.data);
      } catch (error) {
        console.error('Erro ao carregar assinatura:', error);
        // Fallback
        setSubscription({
          id: 'sub_123',
          planName: 'Plano Pro',
          price: 97.00,
          status: 'active',
          billingCycle: 'monthly',
          currentPeriodEnd: '2026-07-17T00:00:00Z',
          features: [
            'Acesso a todos os webinars ao vivo',
            'Acesso à biblioteca de gravações',
            'Material de apoio em PDF',
            'Certificado de participação'
          ]
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Minha Assinatura</h1>
        <p className="mt-1 text-sm text-gray-500">Gerencie seu plano e detalhes de cobrança.</p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <ShieldCheck className="w-5 h-5 mr-2 text-indigo-600" />
            Plano Atual
          </h2>
          {subscription?.status === 'active' ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Ativo
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Inativo
            </span>
          )}
        </div>
        
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{subscription?.planName}</h3>
              <div className="mt-2 flex items-baseline text-4xl font-extrabold text-indigo-600">
                R$ {subscription?.price.toFixed(2).replace('.', ',')}
                <span className="ml-1 text-xl font-medium text-gray-500">/{subscription?.billingCycle === 'monthly' ? 'mês' : 'ano'}</span>
              </div>
              <p className="mt-4 text-sm text-gray-500 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Próxima cobrança em {new Date(subscription?.currentPeriodEnd || '').toLocaleDateString('pt-BR')}
              </p>
            </div>
            
            <div className="flex flex-col space-y-3 w-full md:w-auto">
              <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                Fazer Upgrade de Plano
              </button>
              <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                Atualizar Cartão
              </button>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 tracking-wide uppercase">O que está incluído</h4>
            <ul className="mt-4 space-y-3">
              {subscription?.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0">
                    <Check className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="ml-3 text-sm text-gray-700">{feature}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Payment History (Placeholder) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-gray-500" />
            Histórico de Faturas
          </h2>
        </div>
        <div className="p-6 text-center text-gray-500">
          <p className="text-sm">O histórico de faturas estará disponível em breve.</p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-8">
        <div className="bg-red-50 rounded-lg p-6 border border-red-100">
          <h3 className="text-sm font-medium text-red-800 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            Cancelar Assinatura
          </h3>
          <p className="mt-2 text-sm text-red-700">
            Ao cancelar sua assinatura, você perderá acesso aos webinars e materiais ao final do ciclo atual.
          </p>
          <button className="mt-4 inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50">
            Cancelar Assinatura
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientSubscription;
