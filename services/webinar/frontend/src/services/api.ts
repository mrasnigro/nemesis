import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { appPath, getAppBase, loginPath } from '../lib/appBase';

const API_URL = import.meta.env.REACT_APP_API_URL || 'https://s1m0ne.tec.br/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken } = useAuthStore.getState();
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        useAuthStore.setState({ accessToken });

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.setState({
          user: null,
          accessToken: null,
          refreshToken: null,
        });
        
        // Não redirecionar se for uma rota pública ou a página da live
        const isPublicRoute = originalRequest.url?.includes('/public/');
        const livePrefix = appPath('/live/');
        const isLivePage = window.location.pathname.startsWith(livePrefix) ||
          (!getAppBase() && window.location.pathname.startsWith('/live/'));
        
        if (!isPublicRoute && !isLivePage) {
          window.location.href = loginPath();
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
