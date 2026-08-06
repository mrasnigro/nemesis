import React, { useEffect, useState } from 'react';
import api from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: number;
  createdAt: Date;
}

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [newUserData, setNewUserData] = useState({ name: '', email: '', password: '', role: 'client' });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await api.get('/admin/users');
        setUsers(response.data);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Erro ao carregar usuários');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleToggleStatus = async (userId: string, userRole: string) => {
    if (userRole === 'admin') {
      setError('Não é permitido desativar usuários administradores');
      return;
    }
    try {
      setTogglingId(userId);
      await api.post(`/admin/users/${userId}/toggle`);
      
      setUsers(
        users.map((u) =>
          u.id === parseInt(userId)
            ? { ...u, isActive: u.isActive === 1 ? 0 : 1 }
            : u
        )
      );
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao atualizar usuário');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSaveUser = async () => {
    if (!newUserData.name || !newUserData.email || (!editingUserId && !newUserData.password)) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    try {
      if (editingUserId) {
        const response = await api.put(`/admin/users/${editingUserId}`, newUserData);
        setUsers(users.map(u => u.id === editingUserId ? response.data : u));
      } else {
        const response = await api.post('/admin/users', newUserData);
        setUsers([...users, response.data]);
      }
      setShowNewUserModal(false);
      setEditingUserId(null);
      setNewUserData({ name: '', email: '', password: '', role: 'client' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar usuário');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando usuários...</p>
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">Usuários ({users.length})</h3>
          <button 
            onClick={() => setShowNewUserModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            ➕ Novo Usuário
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Data de Criação
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.isActive === 1
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.isActive === 1 ? '✓ Ativo' : '✗ Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {user.createdAt ? (typeof user.createdAt === 'string' ? new Date(user.createdAt).toLocaleDateString('pt-BR') : user.createdAt.toLocaleDateString('pt-BR')) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {user.role === 'admin' ? (
                        <span className="px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          Administrador
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(user.id.toString(), user.role)}
                          disabled={togglingId === user.id.toString()}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            user.isActive === 1
                              ? 'bg-red-100 hover:bg-red-200 text-red-800'
                              : 'bg-green-100 hover:bg-green-200 text-green-800'
                          } disabled:opacity-50`}
                        >
                          {togglingId === user.id.toString() ? '...' : user.isActive === 1 ? 'Desativar' : 'Ativar'}
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setEditingUserId(user.id);
                          setNewUserData({ name: user.name, email: user.email, password: '', role: user.role });
                          setShowNewUserModal(true);
                        }}
                        className="px-3 py-1 rounded text-xs font-medium bg-blue-100 hover:bg-blue-200 text-blue-800 transition-colors"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Usuário */}
      {showNewUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{editingUserId ? 'Editar Usuário' : 'Novo Usuário'}</h3>
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Nome" 
                value={newUserData.name}
                onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-600"
              />
              <input 
                type="email" 
                placeholder="Email" 
                autoComplete="off"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-600"
              />
              <input 
                type="password" 
                placeholder={editingUserId ? "Senha (deixe em branco para manter)" : "Senha"}
                autoComplete="new-password"
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-600"
              />
              <select 
                value={newUserData.role}
                onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-600"
              >
                <option value="client">Cliente</option>
                <option value="admin">Admin</option>
              </select>
              <div className="flex gap-2 justify-end">
                <button 
                  onClick={() => {
                    setShowNewUserModal(false);
                    setEditingUserId(null);
                    setNewUserData({ name: '', email: '', password: '', role: 'client' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  {editingUserId ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
                </div>
      )}
    </>
  );
};
