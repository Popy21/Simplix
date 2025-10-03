import axios from 'axios';
import { Customer, Product, Sale } from '../types';

const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  me: (token: string) =>
    api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
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
