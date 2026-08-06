import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface Plan {
  id: number;
  name: string;
  description: string | null;
  price: string;
  maxDurationMinutes: number | null;
  maxParticipants: number | null;
  replayStorageDays: number | null;
  features: string | null;
  isActive: number;
  createdAt: Date;
}

export const AdminPlans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    maxDurationMinutes: '',
    maxParticipants: '',
    replayStorageDays: '',
    features: '',
  });

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        console.log('Fetching plans from /admin/plans');
        const response = await api.get('/admin/plans');
        console.log('Plans response:', response.data);
        setPlans(response.data || []);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching plans:', err);
        const errorMsg = err.response?.data?.error || err.message || 'Erro ao carregar planos';
        setError(errorMsg);
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        maxDurationMinutes: parseInt(formData.maxDurationMinutes) || 60,
        maxParticipants: parseInt(formData.maxParticipants) || 100,
        replayStorageDays: parseInt(formData.replayStorageDays) || 30,
      };

      if (editingId) {
        console.log('Updating plan:', editingId, payload);
        await api.put(`/admin/plans/${editingId}`, payload);
        setPlans(
          plans.map((p) => (p.id.toString() === editingId ? { ...p, ...payload } : p))
        );
      } else {
        console.log('Creating new plan:', payload);
        const response = await api.post('/admin/plans', payload);
        console.log('New plan response:', response.data);
        setPlans([...plans, response.data]);
      }

      setFormData({
        name: '',
        description: '',
        price: '',
        maxDurationMinutes: '',
        maxParticipants: '',
        replayStorageDays: '',
        features: '',
      });
      setEditingId(null);
      setShowForm(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar plano');
    }
  };

  const handleDeletePlan = async (planId: number) => {
    if (window.confirm('Tem certeza que deseja deletar este plano?')) {
      try {
        console.log('Deleting plan:', planId);
        await api.delete(`/admin/plans/${planId}`);
        setPlans(plans.filter((p) => p.id !== planId));
      } catch (err: any) {
        setError(err.response?.data?.error || 'Erro ao deletar plano');
      }
    }
  };

  const handleEditPlan = (plan: Plan) => {
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price: plan.price.toString(),
      maxDurationMinutes: (plan.maxDurationMinutes || 60).toString(),
      maxParticipants: (plan.maxParticipants || 100).toString(),
      replayStorageDays: (plan.replayStorageDays || 30).toString(),
      features: plan.features || '',
    });
    setEditingId(plan.id.toString());
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando planos...</p>
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
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({
              name: '',
              description: '',
              price: '',
              maxDurationMinutes: '',
              maxParticipants: '',
              replayStorageDays: '',
              features: '',
            });
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          {showForm ? '✕ Cancelar' : '➕ Novo Plano'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            {editingId ? 'Editar Plano' : 'Novo Plano'}
          </h3>
          <form onSubmit={handleAddPlan} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Plano
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço (R$)
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duração Máx. (minutos)
                </label>
                <input
                  type="number"
                  required
                  value={formData.maxDurationMinutes}
                  onChange={(e) => setFormData({ ...formData, maxDurationMinutes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Máx. Participantes
                </label>
                <input
                  type="number"
                  required
                  value={formData.maxParticipants}
                  onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dias de Armazenamento de Replay
                </label>
                <input
                  type="number"
                  required
                  value={formData.replayStorageDays}
                  onChange={(e) => setFormData({ ...formData, replayStorageDays: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Features (separadas por vírgula)
              </label>
              <textarea
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                {editingId ? 'Atualizar' : 'Criar'} Plano
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">Nenhum plano cadastrado</p>
          </div>
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
              <h3 className="text-lg font-bold text-gray-800 mb-2">{plan.name}</h3>
              <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Preço:</span>
                  <span className="font-bold text-green-600">R$ {parseFloat(plan.price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duração Máx.:</span>
                  <span className="font-bold">{plan.maxDurationMinutes} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Participantes:</span>
                  <span className="font-bold">{plan.maxParticipants}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Replay (dias):</span>
                  <span className="font-bold">{plan.replayStorageDays}</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditPlan(plan)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded text-sm transition-colors"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => handleDeletePlan(plan.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded text-sm transition-colors"
                >
                  🗑️ Deletar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default AdminPlans;
