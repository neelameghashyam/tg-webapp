import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Separate axios instance for document generation with extended timeout
const docGenerationApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 180000, // 3 minutes for document generation operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token and provider header
const authInterceptor = (config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const authProvider = localStorage.getItem('auth_provider');
  if (authProvider) {
    config.headers['X-Auth-Provider'] = authProvider;
  }
  return config;
};

api.interceptors.request.use(authInterceptor, (error: unknown) => Promise.reject(error));
docGenerationApi.interceptors.request.use(authInterceptor, (error: unknown) => Promise.reject(error));

// Response interceptor - handle errors
const errorInterceptor = async (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    // Don't interfere during token exchange — let the callback handle the error
    const url = error.config?.url || '';
    if (!url.includes('/api/auth/token')) {
      // Dynamic import avoids circular dependency (auth.ts imports api.ts)
      const { useAuthStore } = await import('@/stores/auth');
      const auth = useAuthStore();
      auth.setSessionExpired();
    }
  }
  return Promise.reject(error);
};

api.interceptors.response.use((response) => response, errorInterceptor);
docGenerationApi.interceptors.response.use((response) => response, errorInterceptor);

export default api;
export { docGenerationApi };
