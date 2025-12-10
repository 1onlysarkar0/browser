import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (email: string, password: string) =>
    api.post('/api/auth/register', { email, password }),
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  verify2FA: (userId: string, code: string) =>
    api.post('/api/auth/2fa/verify', { userId, code }),
  setup2FA: () => api.post('/api/auth/2fa/setup'),
  enable2FA: (code: string) => api.post('/api/auth/2fa/enable', { code }),
  disable2FA: (code: string) => api.post('/api/auth/2fa/disable', { code }),
  getBackupCodes: () => api.get('/api/auth/2fa/backup-codes'),
  logout: () => api.post('/api/auth/logout'),
  getMe: () => api.get('/api/auth/me'),
};

export const urlApi = {
  getAll: () => api.get('/api/urls'),
  getById: (id: string) => api.get(`/api/urls/${id}`),
  create: (data: any) => api.post('/api/urls', data),
  update: (id: string, data: any) => api.put(`/api/urls/${id}`, data),
  delete: (id: string) => api.delete(`/api/urls/${id}`),
  toggleStatus: (id: string) => api.patch(`/api/urls/${id}/status`),
  run: (id: string) => api.post(`/api/urls/${id}/run`),
  captureScreenshot: (id: string) => api.post(`/api/urls/${id}/screenshot`),
};

export const screenshotApi = {
  getAll: (limit?: number, offset?: number) =>
    api.get('/api/screenshots', { params: { limit, offset } }),
  getByUrl: (urlId: string, limit?: number, offset?: number) =>
    api.get(`/api/screenshots/url/${urlId}`, { params: { limit, offset } }),
  getById: (id: string) => api.get(`/api/screenshots/${id}`),
  delete: (id: string) => api.delete(`/api/screenshots/${id}`),
  deleteAll: () => api.delete('/api/screenshots'),
  getFileUrl: (id: string) => `${API_URL}/api/screenshots/${id}/file`,
};

export const systemApi = {
  getStatus: () => api.get('/api/system/status'),
  getMetrics: () => api.get('/api/system/metrics'),
  getHistory: (limit?: number, offset?: number) =>
    api.get('/api/system/history', { params: { limit, offset } }),
  health: () => api.get('/api/health'),
};

export default api;
