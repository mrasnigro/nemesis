import { useAuthStore } from '../store/authStore';
import api from '../services/api';

export const useAuth = () => {
  const { user, accessToken, refreshToken, isLoading, error, setUser, setTokens, setLoading, setError, logout } =
    useAuthStore();

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = response.data;
      setUser(user);
      setTokens(accessToken, refreshToken);
      return true;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Erro ao fazer login';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { user, accessToken, refreshToken } = response.data;
      setUser(user);
      setTokens(accessToken, refreshToken);
      return true;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Erro ao registrar';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email });
      return true;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Erro ao solicitar recuperação';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      return true;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Erro ao redefinir senha';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    } finally {
      logout();
    }
  };

  const isAuthenticated = !!accessToken && !!user;

  return {
    user,
    accessToken,
    refreshToken,
    isLoading,
    error,
    isAuthenticated,
    login,
    register,
    forgotPassword,
    resetPassword,
    logout: handleLogout,
  };
};
