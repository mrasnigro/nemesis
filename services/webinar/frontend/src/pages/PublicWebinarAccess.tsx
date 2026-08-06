import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

interface LeadData {
  name: string;
  email: string;
  phone: string;
}

export const PublicWebinarAccess: React.FC = () => {
  const { clientId, accessCodeId } = useParams<{ clientId: string; accessCodeId: string }>();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [leadData, setLeadData] = useState<LeadData>({
    name: '',
    email: '',
    phone: '',
  });

  // Registrar lead e redirecionar
  const handleRegisterLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!leadData.name || !leadData.email || !leadData.phone) {
      setError('Por favor, preencha todos os campos');
      setLoading(false);
      return;
    }

    try {
      console.log('Enviando dados:', { accessCodeId, clientId, ...leadData });

      // 1. Primeiro validamos o código para pegar o webinarId real
      const validateRes = await axios.post('/api/public/leads/validate-access-code', {
        code: accessCodeId
      });
      
      const realWebinarId = validateRes.data.webinar.id;
      const realClientId = validateRes.data.webinar.client_id;

      // 2. Registrar lead no banco com o ID correto
      const response = await axios.post('/api/public/leads/register-lead', {
        accessCodeId: accessCodeId,
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        webinarId: realWebinarId,
        clientId: realClientId,
      });

      console.log('Resposta do servidor:', response.data);
      
      // Armazenar IDs no localStorage para o chat e rastreamento
      if (response.data.leadId) {
        localStorage.setItem('currentLeadId', response.data.leadId.toString());
        localStorage.setItem('currentWebinarId', realWebinarId.toString());
        localStorage.setItem('currentAccessCodeId', accessCodeId || '');
        localStorage.setItem('leadName', leadData.name);
        localStorage.setItem('leadAccessTime', new Date().toISOString());
      }
      
      setSuccess('Registrado com sucesso! Redirecionando para o webinar...');

      // Redirecionar para a live com o ID REAL
      setTimeout(() => {
        window.location.href = `/live/${realWebinarId}`;
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao registrar:', err);
      setError(err.response?.data?.error || 'Erro ao registrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Webinar ao Vivo</h1>
          <p className="text-gray-600">Plataforma de Transmissão de Webinars</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6">
            Preencha seus dados para acessar o webinar
          </h3>

          <form onSubmit={handleRegisterLead}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                value={leadData.name}
                onChange={(e) =>
                  setLeadData({ ...leadData, name: e.target.value })
                }
                placeholder="Seu nome completo"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={leadData.email}
                onChange={(e) =>
                  setLeadData({ ...leadData, email: e.target.value })
                }
                placeholder="seu@email.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone *
              </label>
              <input
                type="tel"
                value={leadData.phone}
                onChange={(e) =>
                  setLeadData({ ...leadData, phone: e.target.value })
                }
                placeholder="(11) 99999-9999"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 text-lg"
            >
              {loading ? 'Processando...' : 'Acessar Webinar'}
            </button>
          </form>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Seus dados serão utilizados apenas para registro de participação
          </p>
        </div>
      </div>
    </div>
  );
};
