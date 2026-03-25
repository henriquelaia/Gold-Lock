import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para adicionar token de autenticação
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fintwin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para tratar erros globais
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fintwin_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ── API Services ──

export const authService = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  signup: (data: { email: string; password: string; name: string }) => api.post('/auth/signup', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
}

export const accountsService = {
  list: () => api.get('/accounts'),
  connect: () => api.post('/accounts/connect'),
  disconnect: (id: string) => api.delete(`/accounts/${id}`),
}

export const transactionsService = {
  list: (params?: Record<string, string>) => api.get('/transactions', { params }),
  summary: (month?: string) => api.get('/transactions/summary', { params: { month } }),
  updateCategory: (id: string, categoryId: string) => api.put(`/transactions/${id}/category`, { categoryId }),
  sync: () => api.post('/transactions/sync'),
}

export const budgetsService = {
  list: () => api.get('/budgets'),
  create: (data: { name: string; categoryId: string; amountLimit: number }) => api.post('/budgets', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/budgets/${id}`, data),
  progress: (id: string) => api.get(`/budgets/${id}/progress`),
}

export const irsService = {
  simulate: (data: Record<string, unknown>) => api.post('/irs/simulate', data),
  brackets: () => api.get('/irs/brackets'),
  deductions: () => api.get('/irs/deductions'),
}
