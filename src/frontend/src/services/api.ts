/**
 * api.ts — Gold Lock
 * ==================
 * Cliente Axios central. Todos os serviços importam daqui.
 * Interceptor de request injeta Bearer token do authStore.
 * Interceptor de response tenta refresh automático em 401 antes de redirecionar.
 */

import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request: injeta access token ───────────────────────────────────────────

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response: refresh automático em 401 ───────────────────────────────────

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original._retry = true; // previne loop infinito se o token refreshed também der 401
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    const refreshToken = useAuthStore.getState().refreshToken;

    if (!refreshToken) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
      const { accessToken, refreshToken: newRefresh } = data.data;

      useAuthStore.getState().setTokens({ accessToken, refreshToken: newRefresh });
      processQueue(null, accessToken);

      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError);
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ── Service objects ────────────────────────────────────────────────────────

export const authApi = {
  register:            (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login:               (data: { email: string; password: string; totpCode?: string }) =>
    api.post('/auth/login', data),
  logout:              (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  me:                  () => api.get('/auth/me'),
  verifyEmail:         (token: string) =>
    api.get('/auth/verify-email', { params: { token } }),
  resendVerification:  (email: string) =>
    api.post('/auth/resend-verification', { email }),
  forgotPassword:      (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword:       (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
  updateProfile:       (data: { name?: string; avatarUrl?: string }) =>
    api.put('/auth/profile', data),
  setup2fa:            () => api.post('/auth/2fa/setup'),
  enable2fa:           (code: string) => api.post('/auth/2fa/enable', { code }),
  disable2fa:          (password: string) => api.post('/auth/2fa/disable', { password }),
  changePassword:      (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

export const accountsApi = {
  list:       () => api.get('/accounts'),
  connect:    (returnTo?: string) => api.post('/accounts/connect', returnTo ? { return_to: returnTo } : {}),
  balance:    (id: string) => api.get(`/accounts/${id}/balance`),
  disconnect: (id: string) => api.delete(`/accounts/${id}`),
  syncAll:    () => api.post('/accounts/sync'),
};

export const transactionsApi = {
  list:           (params?: Record<string, string | number>) =>
    api.get('/transactions', { params }),
  summary:        (month?: string) =>
    api.get('/transactions/summary', { params: { month } }),
  updateCategory: (id: string, categoryId: string) =>
    api.put(`/transactions/${id}/category`, { categoryId }),
  sync:           () => api.post('/transactions/sync'),
};

export const budgetsApi = {
  list:     () => api.get('/budgets'),
  create:   (data: Record<string, unknown>) => api.post('/budgets', data),
  update:   (id: string, data: Record<string, unknown>) => api.put(`/budgets/${id}`, data),
  remove:   (id: string) => api.delete(`/budgets/${id}`),
  progress: (id: string) => api.get(`/budgets/${id}/progress`),
};

export const goalsApi = {
  list:    () => api.get('/goals'),
  create:  (data: Record<string, unknown>) => api.post('/goals', data),
  update:  (id: string, data: Record<string, unknown>) => api.put(`/goals/${id}`, data),
  remove:  (id: string) => api.delete(`/goals/${id}`),
  deposit: (id: string, amount: number) => api.put(`/goals/${id}/deposit`, { amount }),
};

export const categoriesApi = {
  list:   () => api.get('/categories'),
  create: (data: {
    name: string;
    namePt: string;
    icon?: string;
    color?: string;
    parentId?: string;
    isExpense?: boolean;
    irsDeductionCategory?: string;
  }) => api.post('/categories', data),
};

export const irsApi = {
  simulate:         (data: Record<string, unknown>) => api.post('/irs/simulate', data),
  brackets:         () => api.get('/irs/brackets'),
  deductions:       () => api.get('/irs/deductions'),
  deductionAlerts:  () => api.get('/irs/deduction-alerts'),
  confirmAlert:     (id: string, confirmedType: string) =>
    api.put(`/irs/deduction-alerts/${id}/confirm`, { confirmedType }),
  optimize:         (data: Record<string, unknown>) => api.post('/irs/optimize', data),
};

export const fiscalProfileApi = {
  get:    () => api.get('/fiscal-profile'),
  upsert: (data: Record<string, unknown>) => api.put('/fiscal-profile', data),
};

export const investmentsApi = {
  list:   () => api.get('/investments'),
  create: (data: Record<string, unknown>) => api.post('/investments', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/investments/${id}`, data),
  remove: (id: string) => api.delete(`/investments/${id}`),
};

export const marketApi = {
  quote:   (ticker: string, type?: string) =>
    api.get(`/market/quote/${encodeURIComponent(ticker)}`, { params: type ? { type } : {} }),
  search:  (q: string, type?: string) =>
    api.get('/market/search', { params: { q, ...(type ? { type } : {}) } }),
  history: (ticker: string, period: '30d' | '1y' = '30d', type?: string) =>
    api.get(`/market/history/${encodeURIComponent(ticker)}`, { params: { period, ...(type ? { type } : {}) } }),
};
