import axios from 'axios';
import { Customer, Product, Sale } from '../types';
import { storage } from '../utils/storage';

const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token to all requests
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error retrieving token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        // Clear stored auth data
        await storage.clearAuth();
        // Optionally redirect to login or emit an event
        console.log('Token expired or invalid, user logged out');
      } catch (err) {
        console.error('Error clearing auth:', err);
      }
    }
    return Promise.reject(error);
  }
);

// Customer API
export const customerService = {
  getAll: () => api.get<Customer[]>('/customers'),
  getById: (id: number) => api.get<Customer>(`/customers/${id}`),
  create: (customer: Customer) => api.post<Customer>('/customers', customer),
  update: (id: number, customer: Customer) => api.put<Customer>(`/customers/${id}`, customer),
  delete: (id: number) => api.delete(`/customers/${id}`),
};

// Product API
export const productService = {
  getAll: () => api.get<Product[]>('/products'),
  getById: (id: number) => api.get<Product>(`/products/${id}`),
  create: (product: Product) => api.post<Product>('/products', product),
  update: (id: number, product: Product) => api.put<Product>(`/products/${id}`, product),
  delete: (id: number) => api.delete(`/products/${id}`),
};

// Sale API
export const saleService = {
  getAll: () => api.get<Sale[]>('/sales'),
  getById: (id: number) => api.get<Sale>(`/sales/${id}`),
  create: (sale: Sale) => api.post<Sale>('/sales', sale),
  update: (id: number, sale: Sale) => api.put<Sale>(`/sales/${id}`, sale),
  delete: (id: number) => api.delete(`/sales/${id}`),
};

// Auth API
export const authService = {
  register: (data: { email: string; password: string; name: string; role?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  me: () =>
    api.get('/auth/me'),
  validatePassword: (password: string) =>
    api.post('/auth/validate-password', { password }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
};

// Team API
export const teamService = {
  getAll: () => api.get('/teams'),
  getById: (id: number) => api.get(`/teams/${id}`),
  create: (team: { name: string; description?: string; owner_id: number }) =>
    api.post('/teams', team),
  update: (id: number, team: { name: string; description?: string }) =>
    api.put(`/teams/${id}`, team),
  delete: (id: number) => api.delete(`/teams/${id}`),
  addMember: (teamId: number, data: { user_id: number; role?: string }) =>
    api.post(`/teams/${teamId}/members`, data),
  removeMember: (teamId: number, memberId: number) =>
    api.delete(`/teams/${teamId}/members/${memberId}`),
  updateMemberRole: (teamId: number, memberId: number, role: string) =>
    api.put(`/teams/${teamId}/members/${memberId}`, { role }),
};

// Quote API
export const quoteService = {
  getAll: () => api.get('/quotes'),
  getById: (id: number) => api.get(`/quotes/${id}`),
  create: (quote: any) => api.post('/quotes', quote),
  update: (id: number, quote: any) => api.put(`/quotes/${id}`, quote),
  delete: (id: number) => api.delete(`/quotes/${id}`),
  updateStatus: (id: number, status: string) => api.patch(`/quotes/${id}/status`, { status }),
};

// Analytics API
export const analyticsService = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getSalesByPeriod: (period: 'day' | 'month' | 'year' = 'month') =>
    api.get(`/analytics/sales-by-period?period=${period}`),
  getTopCustomers: (limit: number = 10) => api.get(`/analytics/top-customers?limit=${limit}`),
  getTopProducts: (limit: number = 10) => api.get(`/analytics/top-products?limit=${limit}`),
  getQuotesConversion: () => api.get('/analytics/quotes-conversion'),
  getRecentActivity: (limit: number = 20) => api.get(`/analytics/recent-activity?limit=${limit}`),
  getLowStock: (threshold: number = 10) => api.get(`/analytics/low-stock?threshold=${threshold}`),
};

// Search API
export const searchService = {
  global: (q: string) => api.get(`/search?q=${encodeURIComponent(q)}`),
  customers: (params: { q?: string; company?: string; email?: string }) =>
    api.get('/search/customers', { params }),
  products: (params: { q?: string; minPrice?: number; maxPrice?: number; inStock?: boolean }) =>
    api.get('/search/products', { params }),
  sales: (params: { customerId?: number; productId?: number; status?: string; startDate?: string; endDate?: string }) =>
    api.get('/search/sales', { params }),
  quotes: (params: { customerId?: number; userId?: number; status?: string; startDate?: string; endDate?: string }) =>
    api.get('/search/quotes', { params }),
};

// Bulk Operations API
export const bulkService = {
  createCustomers: (customers: any[]) => api.post('/bulk/customers', { customers }),
  createProducts: (products: any[]) => api.post('/bulk/products', { products }),
  deleteCustomers: (ids: number[]) => api.delete('/bulk/customers', { data: { ids } }),
  deleteProducts: (ids: number[]) => api.delete('/bulk/products', { data: { ids } }),
  deleteSales: (ids: number[]) => api.delete('/bulk/sales', { data: { ids } }),
  updateProductStock: (updates: Array<{ id: number; stock: number }>) =>
    api.patch('/bulk/products/stock', { updates }),
  updateSalesStatus: (ids: number[], status: string) =>
    api.patch('/bulk/sales/status', { ids, status }),
  updateQuotesStatus: (ids: number[], status: string) =>
    api.patch('/bulk/quotes/status', { ids, status }),
};

// Reports API
export const reportsService = {
  sales: (params: { startDate: string; endDate: string; groupBy?: 'day' | 'month' | 'year' }) =>
    api.get('/reports/sales', { params }),
  customers: () => api.get('/reports/customers'),
  products: () => api.get('/reports/products'),
  quotes: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/reports/quotes', { params }),
  teams: () => api.get('/reports/teams'),
  users: () => api.get('/reports/users'),
  revenue: (params: { startDate?: string; endDate?: string; groupBy?: 'day' | 'month' | 'year' }) =>
    api.get('/reports/revenue', { params }),
  inventory: () => api.get('/reports/inventory'),
};

// Notifications API
export const notificationsService = {
  getByUser: (userId: number, unreadOnly?: boolean) =>
    api.get(`/notifications/user/${userId}${unreadOnly ? '?unreadOnly=true' : ''}`),
  getById: (id: number) => api.get(`/notifications/${id}`),
  create: (data: { user_id: number; title: string; message: string; type?: string; link?: string }) =>
    api.post('/notifications', data),
  markAsRead: (id: number) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: (userId: number) => api.patch(`/notifications/user/${userId}/read-all`),
  delete: (id: number) => api.delete(`/notifications/${id}`),
  getUnreadCount: (userId: number) => api.get(`/notifications/user/${userId}/unread-count`),
};

// Tasks API
export const tasksService = {
  getAll: (params?: { userId?: number; status?: string; priority?: string }) =>
    api.get('/tasks', { params }),
  getById: (id: number) => api.get(`/tasks/${id}`),
  create: (data: { title: string; description?: string; assigned_to: number; customer_id?: number; due_date?: string; priority?: string; status?: string }) =>
    api.post('/tasks', data),
  update: (id: number, data: any) => api.put(`/tasks/${id}`, data),
  updateStatus: (id: number, status: string) => api.patch(`/tasks/${id}/status`, { status }),
  delete: (id: number) => api.delete(`/tasks/${id}`),
  getByUser: (userId: number, status?: string) =>
    api.get(`/tasks/user/${userId}${status ? `?status=${status}` : ''}`),
  getOverdue: () => api.get('/tasks/overdue/all'),
};

// Pipeline API
export const pipelineService = {
  // Stages
  getStages: () => api.get('/pipeline/stages'),
  getStageById: (id: number) => api.get(`/pipeline/stages/${id}`),
  createStage: (data: { name: string; color?: string; position?: number }) =>
    api.post('/pipeline/stages', data),
  updateStage: (id: number, data: any) => api.put(`/pipeline/stages/${id}`, data),
  deleteStage: (id: number) => api.delete(`/pipeline/stages/${id}`),
  
  // Opportunities
  getOpportunities: (params?: { stageId?: number; userId?: number; customerId?: number }) =>
    api.get('/pipeline/opportunities', { params }),
  getOpportunityById: (id: number) => api.get(`/pipeline/opportunities/${id}`),
  createOpportunity: (data: { name: string; customer_id: number; user_id: number; stage_id: number; value?: number; probability?: number; expected_close_date?: string; description?: string }) =>
    api.post('/pipeline/opportunities', data),
  updateOpportunity: (id: number, data: any) => api.put(`/pipeline/opportunities/${id}`, data),
  moveOpportunity: (id: number, stage_id: number) =>
    api.patch(`/pipeline/opportunities/${id}/stage`, { stage_id }),
  deleteOpportunity: (id: number) => api.delete(`/pipeline/opportunities/${id}`),
  
  // Summary
  getSummary: () => api.get('/pipeline/summary'),
};

// Campaigns API
export const campaignsService = {
  getAll: (status?: string) => api.get('/campaigns', { params: { status } }),
  getById: (id: number) => api.get(`/campaigns/${id}`),
  create: (data: { name: string; subject: string; content: string; status?: string; scheduled_date?: string }) =>
    api.post('/campaigns', data),
  update: (id: number, data: any) => api.put(`/campaigns/${id}`, data),
  updateStatus: (id: number, status: string) =>
    api.patch(`/campaigns/${id}/status`, { status }),
  delete: (id: number) => api.delete(`/campaigns/${id}`),
  
  // Recipients
  getRecipients: (id: number) => api.get(`/campaigns/${id}/recipients`),
  addRecipients: (id: number, customer_ids: number[]) =>
    api.post(`/campaigns/${id}/recipients`, { customer_ids }),
  
  // Send & Track
  send: (id: number) => api.post(`/campaigns/${id}/send`),
  track: (id: number, action: 'open' | 'click', customer_id: number) =>
    api.post(`/campaigns/${id}/track/${action}`, { customer_id }),
  getStats: (id: number) => api.get(`/campaigns/${id}/stats`),
};

