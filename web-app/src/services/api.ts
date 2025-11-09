import axios from 'axios';
import { Customer, Product, Sale, Supplier, Expense } from '../types';
import { storage } from '../utils/storage';
import logger from '../utils/logger';

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
      // Log API request
      logger.apiRequest(config.method?.toUpperCase() || 'GET', config.url || '', config.data);
    } catch (error) {
      console.error('Error retrieving token:', error);
    }
    return config;
  },
  (error) => {
    logger.error('API', 'Request interceptor error', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors with token refresh
api.interceptors.response.use(
  (response) => {
    // Log successful API response
    logger.apiResponse(
      response.config.method?.toUpperCase() || 'GET',
      response.config.url || '',
      response.status,
      response.data
    );
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh once to avoid infinite loops
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        const refreshToken = await storage.getRefreshToken();
        
        if (!refreshToken) {
          // No refresh token available, clear auth and reject
          await storage.clearAuth();
          console.log('No refresh token available, user logged out');
          return Promise.reject(error);
        }

        // Call refresh endpoint
        const response = await authService.refresh(refreshToken);
        const { token, accessToken, refreshToken: newRefreshToken } = response.data;

        // Update stored tokens
        await storage.saveToken(accessToken || token);
        if (newRefreshToken) {
          await storage.saveRefreshToken(newRefreshToken);
        }

        // Update the authorization header with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken || token}`;

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        try {
          await storage.clearAuth();
          console.log('Token refresh failed, user logged out');
        } catch (clearErr) {
          console.error('Error clearing auth:', clearErr);
        }
        return Promise.reject(refreshError);
      }
    }

    // Log API error
    logger.apiError(
      error.config?.method?.toUpperCase() || 'UNKNOWN',
      error.config?.url || '',
      error.response?.data || error.message
    );

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
  getHistory: (id: number) => api.get(`/customers/${id}/history`),
};

// Company API
export const companyService = {
  getAll: () => api.get('/companies'),
  getById: (id: string) => api.get(`/companies/${id}`),
  create: (company: any) => api.post('/companies', company),
  update: (id: string, company: any) => api.put(`/companies/${id}`, company),
  delete: (id: string) => api.delete(`/companies/${id}`),
};

// Contact API
export const contactService = {
  getAll: (params?: { page?: number; limit?: number; type?: string }) => api.get('/contacts', { params }),
  getById: (id: string) => api.get(`/contacts/${id}`),
  create: (contact: any) => api.post('/contacts', contact),
  update: (id: string, contact: any) => api.put(`/contacts/${id}`, contact),
  delete: (id: string) => api.delete(`/contacts/${id}`),
};

// Upload API
export const uploadService = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  uploadImages: (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    return api.post('/upload/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteImage: (filename: string) => api.delete(`/upload/image/${filename}`),
};

// Activities API
export const activitiesService = {
  getAll: (params?: { contact_id?: string; deal_id?: string; type?: string; from_date?: string; to_date?: string; user_id?: string }) =>
    api.get('/activities', { params }),
  getById: (id: string) => api.get(`/activities/${id}`),
  getByContact: (contactId: string) => api.get(`/activities/contact/${contactId}`),
  create: (activity: { type: string; description: string; contact_id?: string; deal_id?: string; activity_date?: string; scheduled_at?: string }) =>
    api.post('/activities', activity),
  createCall: (call: { contact_id: string; deal_id?: string; duration_minutes?: number; notes?: string; status?: string }) =>
    api.post('/activities/call', call),
  createEmail: (email: { contact_id: string; deal_id?: string; subject: string; email_body?: string; recipients?: string; status?: string }) =>
    api.post('/activities/email', email),
  createMeeting: (meeting: { contact_id: string; deal_id?: string; title: string; start_time: string; end_time?: string; location?: string; attendees?: string; notes?: string; status?: string }) =>
    api.post('/activities/meeting', meeting),
  createNote: (note: { contact_id?: string; deal_id?: string; content: string }) =>
    api.post('/activities/note', note),
  update: (id: string, activity: { type?: string; description?: string; status?: string; metadata?: any }) =>
    api.put(`/activities/${id}`, activity),
  delete: (id: string) => api.delete(`/activities/${id}`),
};

// Product API
export const productService = {
  getAll: () => api.get<Product[]>('/products'),
  getById: (id: number) => api.get<Product>(`/products/${id}`),
  create: (product: Product) => api.post<Product>('/products', product),
  update: (id: number, product: Product) => api.put<Product>(`/products/${id}`, product),
  delete: (id: number) => api.delete(`/products/${id}`),
};

// Supplier API
export const supplierService = {
  getAll: (params?: { search?: string; category?: string; page?: number; limit?: number }) =>
    api.get<{ data: Supplier[]; pagination: { page: number; limit: number; total: number; pages: number } }>(
      '/suppliers',
      { params }
    ),
  getById: (id: string) => api.get<Supplier>(`/suppliers/${id}`),
  create: (supplier: Partial<Supplier>) => api.post<Supplier>('/suppliers', supplier),
  update: (id: string, supplier: Partial<Supplier>) => api.put<Supplier>(`/suppliers/${id}`, supplier),
  delete: (id: string) => api.delete(`/suppliers/${id}`),
  getSummary: () => api.get('/suppliers/stats/summary'),
};

// Sale API
export const saleService = {
  getAll: () => api.get<Sale[]>('/sales'),
  getById: (id: number) => api.get<Sale>(`/sales/${id}`),
  create: (sale: Sale) => api.post<Sale>('/sales', sale),
  update: (id: number, sale: Sale) => api.put<Sale>(`/sales/${id}`, sale),
  delete: (id: number) => api.delete(`/sales/${id}`),
};

// Quotes API
export const quotesService = {
  getAll: (params?: { status?: string; customer_id?: string }) => api.get('/quotes', { params }),
  getById: (id: string) => api.get(`/quotes/${id}`),
  create: (quote: any) => api.post('/quotes', quote),
  update: (id: string, quote: any) => api.put(`/quotes/${id}`, quote),
  delete: (id: string) => api.delete(`/quotes/${id}`),
  convertToInvoice: (id: string) => api.post(`/quotes/${id}/convert-to-invoice`),
  sendEmail: (id: string) => api.post(`/quotes/${id}/send-email`),
  markAsPaid: (id: string, data: { amount: number; payment_type: 'deposit' | 'full' }) =>
    api.post(`/quotes/${id}/mark-as-paid`, data),
};

// Invoices API
export const invoicesService = {
  getAll: (params?: { status?: string; customer_id?: string; from_date?: string; to_date?: string; overdue?: boolean }) =>
    api.get('/invoices', { params }),
  getById: (id: string) => api.get(`/invoices/${id}`),
  create: (invoice: any) => api.post('/invoices', invoice),
  update: (id: string, invoice: any) => api.put(`/invoices/${id}`, invoice),
  delete: (id: string) => api.delete(`/invoices/${id}`),
  sendReminder: (id: string) => api.post(`/invoices/${id}/send-reminder`),
  markAsPaid: (id: string, data: { payment_method: string; payment_date: string; amount: number; reference?: string }) =>
    api.post(`/invoices/${id}/mark-as-paid`, data),
  sendEmail: (id: string) => api.post(`/invoices/${id}/send-email`),
  convertToQuote: (id: number) => api.post(`/invoices/${id}/convert-to-quote`),
};

// Payments API
export const paymentsService = {
  getAll: (params?: { invoice_id?: string; from_date?: string; to_date?: string; payment_method?: string }) =>
    api.get('/payments', { params }),
  getById: (id: string) => api.get(`/payments/${id}`),
  create: (payment: { invoice_id: string; amount: number; payment_date: string; payment_method: string; reference?: string; notes?: string }) =>
    api.post('/payments', payment),
  delete: (id: string) => api.delete(`/payments/${id}`),
  processCardPayment: (data: { invoice_id: string; amount: number; card_token: string }) =>
    api.post('/payments/process-card', data),
  processApplePay: (data: { invoice_id: string; amount: number; apple_pay_token: string }) =>
    api.post('/payments/process-apple-pay', data),
  processGooglePay: (data: { invoice_id: string; amount: number; google_pay_token: string }) =>
    api.post('/payments/process-google-pay', data),
  createStripePaymentIntent: (data: { invoice_id: number; amount: number; currency?: string }) =>
    api.post('/payments/stripe/create-payment-intent', data),
};

// Dashboard API
export const dashboardService = {
  getKPIs: (period: 'week' | 'month' | 'quarter' | 'year' = 'month') =>
    api.get('/dashboard/kpis', { params: { period } }),
  getRevenue: (period: 'week' | 'month' | 'quarter' | 'year' = 'month') =>
    api.get('/dashboard/revenue', { params: { period } }),
  getCashFlow: (period: 'week' | 'month' | 'quarter' | 'year' = 'month') =>
    api.get('/dashboard/cashflow', { params: { period } }),
  getInvoicesMetrics: (period: 'week' | 'month' | 'quarter' | 'year' = 'month') =>
    api.get('/dashboard/invoices-metrics', { params: { period } }),
  getCustomerMetrics: (period: 'week' | 'month' | 'quarter' | 'year' = 'month') =>
    api.get('/dashboard/customer-metrics', { params: { period } }),
  getProjections: (period: 'week' | 'month' | 'quarter' | 'year' = 'month') =>
    api.get('/dashboard/projections', { params: { period } }),
  createProjection: (projection: {
    projection_date: string;
    projection_type: string;
    projected_revenue: number;
    projected_costs?: number;
    confidence_level?: number;
  }) => api.post('/dashboard/projections', projection),
};

// Templates API
export const templatesService = {
  getAll: () => api.get('/templates'),
  getById: (id: string) => api.get(`/templates/${id}`),
  getDefault: () => api.get('/templates/default/template'),
  create: (template: any) => api.post('/templates', template),
  update: (id: string, template: any) => api.put(`/templates/${id}`, template),
  delete: (id: string) => api.delete(`/templates/${id}`),
};

// Company Profile API
export const companyProfileService = {
  get: () => api.get('/company-profile'),
  create: (data: any) => api.post('/company-profile', data),
  update: (data: any) => api.put('/company-profile', data),
  delete: () => api.delete('/company-profile'),
};

// Expenses API
export const expenseService = {
  getAll: (params?: {
    status?: string;
    supplierId?: string;
    paymentStatus?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get<{ data: Expense[]; meta: { page: number; limit: number; total: number; pages: number; amount: number } }>(
      '/expenses',
      { params }
    ),
  getById: (id: string) => api.get<Expense>(`/expenses/${id}`),
  create: (expense: Partial<Expense>) => api.post<Expense>('/expenses', expense),
  update: (id: string, expense: Partial<Expense>) => api.put<Expense>(`/expenses/${id}`, expense),
  updateStatus: (id: string, data: { status?: string; payment_status?: string; payment_date?: string }) =>
    api.patch<Expense>(`/expenses/${id}/status`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
  getSummary: () => api.get('/expenses/stats/summary'),
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
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  logout: () =>
    api.post('/auth/logout'),
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
  convertToInvoice: (id: number) => api.post(`/quotes/${id}/convert-to-invoice`),
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
  getPendingQuotes: () => api.get('/analytics/pending-quotes'),
  getTasksToday: () => api.get('/analytics/tasks-today'),
  getTopCustomersEnhanced: (limit: number = 5) => api.get(`/analytics/top-customers-enhanced?limit=${limit}`),
  getConversionFunnel: () => api.get('/analytics/conversion-funnel'),
  getActivitySummary: () => api.get('/analytics/activity-summary'),
  getForecasting: () => api.get('/analytics/forecasting'),
  getQuickStats: () => api.get('/analytics/quick-stats'),
  getLeadScores: (limit: number = 5) => api.get(`/analytics/lead-scores?limit=${limit}`),
  getPipelineStages: () => api.get('/analytics/pipeline-stages'),
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
  getContextual: () => api.get('/notifications/contextual'),
  getContextualCount: () => api.get('/notifications/contextual/count'),
};

// Tasks API
export const tasksService = {
  getAll: (params?: { userId?: number; status?: string; priority?: string }) =>
    api.get('/tasks', { params }),
  getById: (id: string) => api.get(`/tasks/${id}`),
  create: (data: { title: string; description?: string; assigned_to: string; company_id?: string; contact_id?: string; due_date?: string; priority?: string; status?: string }) =>
    api.post('/tasks', data),
  update: (id: string, data: any) => api.put(`/tasks/${id}`, data),
  updateStatus: (id: string, status: string) => api.patch(`/tasks/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  getByUser: (userId: number, status?: string) =>
    api.get(`/tasks/user/${userId}${status ? `?status=${status}` : ''}`),
  getOverdue: () => api.get('/tasks/overdue/all'),
  getRecentlyDeleted: (params?: { limit?: number }) =>
    api.get('/tasks/deleted/recent', { params }),
  restore: (id: string) => api.patch(`/tasks/${id}/restore`),
};

// Pipeline API
export const pipelineService = {
  // Stages
  getStages: () => api.get('/pipeline/stages'),
  getStageById: (id: string | number) => api.get(`/pipeline/stages/${id}`),
  createStage: (data: { name: string; color?: string; position?: number }) =>
    api.post('/pipeline/stages', data),
  updateStage: (id: string | number, data: any) => api.put(`/pipeline/stages/${id}`, data),
  deleteStage: (id: string | number) => api.delete(`/pipeline/stages/${id}`),

  // Opportunities
  getOpportunities: (params?: { stageId?: string | number; userId?: string | number; customerId?: string | number }) =>
    api.get('/pipeline/opportunities', { params }),
  getOpportunityById: (id: string | number) => api.get(`/pipeline/opportunities/${id}`),
  createOpportunity: (data: { name: string; customer_id?: string | number; user_id: string | number; stage_id: string | number; value?: number; probability?: number; expected_close_date?: string; description?: string }) =>
    api.post('/pipeline/opportunities', data),
  updateOpportunity: (id: string | number, data: any) => api.put(`/pipeline/opportunities/${id}`, data),
  moveOpportunity: (id: string | number, stage_id: string | number) =>
    api.patch(`/pipeline/opportunities/${id}/stage`, { stage_id }),
  moveOpportunityToStage: (id: string | number, stage_id: string | number) =>
    api.patch(`/pipeline/opportunities/${id}/stage`, { stage_id }),
  deleteOpportunity: (id: string | number) => api.delete(`/pipeline/opportunities/${id}`),
  getRecentlyDeletedOpportunities: (params?: { limit?: number }) =>
    api.get('/pipeline/opportunities/deleted/recent', { params }),
  restoreOpportunity: (id: string | number) => api.patch(`/pipeline/opportunities/${id}/restore`),

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

// ============================================================================
// NOUVEAUX MODULES v4.0
// ============================================================================

// Bank Accounts API (Comptabilité)
export const bankAccountsService = {
  getAll: () => api.get('/bank-accounts'),
  getOne: (id: string) => api.get(`/bank-accounts/${id}`),
  create: (data: {
    account_name: string;
    bank_name: string;
    iban?: string;
    bic?: string;
    account_type?: string;
    currency?: string;
    opening_balance?: number;
  }) => api.post('/bank-accounts', data),
  update: (id: string, data: any) => api.put(`/bank-accounts/${id}`, data),
  delete: (id: string) => api.delete(`/bank-accounts/${id}`),
  getBalance: (id: string) => api.get(`/bank-accounts/${id}/balance`),
  adjustBalance: (id: string, amount: number, reason: string) =>
    api.post(`/bank-accounts/${id}/adjust-balance`, { amount, reason }),
};

// Bank Transactions API
export const bankTransactionsService = {
  getAll: (params?: { account_id?: string; start_date?: string; end_date?: string }) =>
    api.get('/bank-transactions', { params }),
  getOne: (id: string) => api.get(`/bank-transactions/${id}`),
  create: (data: {
    bank_account_id: string;
    transaction_type: 'credit' | 'debit';
    amount: number;
    description: string;
    transaction_date: string;
    reference?: string;
    category?: string;
  }) => api.post('/bank-transactions', data),
  importFile: (accountId: string, file: any) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('account_id', accountId);
    return api.post('/bank-transactions/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  reconcile: (id: string, invoiceId: string) =>
    api.post(`/bank-transactions/${id}/reconcile`, { invoice_id: invoiceId }),
  autoReconcile: (accountId: string) =>
    api.post('/bank-transactions/auto-reconcile', { account_id: accountId }),
};

// Accounting API
export const accountingService = {
  getEntries: (params?: { start_date?: string; end_date?: string; account?: string }) =>
    api.get('/accounting/entries', { params }),
  createEntry: (data: any) => api.post('/accounting/entries', data),
  validateEntry: (id: string) => api.post(`/accounting/entries/${id}/validate`),
  exportFEC: (fiscalYear: number, startDate: string, endDate: string) =>
    api.post('/accounting/export/fec', { fiscal_year: fiscalYear, start_date: startDate, end_date: endDate }),
  getTrialBalance: (params: { start_date: string; end_date: string }) =>
    api.get('/accounting/trial-balance', { params }),
  getLedger: (account: string, params?: { start_date?: string; end_date?: string }) =>
    api.get(`/accounting/ledger/${account}`, { params }),
  getChartOfAccounts: () => api.get('/accounting/chart-of-accounts'),
};

// Tax Rates API
export const taxRatesService = {
  getAll: () => api.get('/tax-rates'),
  getOne: (id: string) => api.get(`/tax-rates/${id}`),
  create: (data: { name: string; rate_percentage: number; country?: string; is_default?: boolean }) =>
    api.post('/tax-rates', data),
  update: (id: string, data: any) => api.put(`/tax-rates/${id}`, data),
  delete: (id: string) => api.delete(`/tax-rates/${id}`),
};

// Cash Flow API
export const cashFlowService = {
  getForecast: (params: { start_date: string; end_date: string }) =>
    api.get('/cash-flow/forecast', { params }),
  createForecast: (data: any) => api.post('/cash-flow/forecast', data),
  updateForecast: (id: string, data: any) => api.put(`/cash-flow/forecast/${id}`, data),
};

// Recurring Invoices API (Facturation avancée)
export const recurringInvoicesService = {
  getAll: (params?: { status?: string }) => api.get('/recurring-invoices', { params }),
  getOne: (id: string) => api.get(`/recurring-invoices/${id}`),
  create: (data: {
    customer_id: string;
    frequency: 'monthly' | 'quarterly' | 'yearly';
    interval_count?: number;
    start_date: string;
    end_date?: string;
    title: string;
    items: any[];
    subtotal_amount: number;
    tax_amount: number;
    total_amount: number;
    auto_send?: boolean;
  }) => api.post('/recurring-invoices', data),
  update: (id: string, data: any) => api.put(`/recurring-invoices/${id}`, data),
  delete: (id: string) => api.delete(`/recurring-invoices/${id}`),
  pause: (id: string) => api.post(`/recurring-invoices/${id}/pause`),
  resume: (id: string) => api.post(`/recurring-invoices/${id}/resume`),
  processDue: () => api.post('/recurring-invoices/process-due'),
  getHistory: (id: string) => api.get(`/recurring-invoices/${id}/history`),
};

// Credit Notes API
export const creditNotesService = {
  getAll: (params?: { customer_id?: string }) => api.get('/credit-notes', { params }),
  getOne: (id: string) => api.get(`/credit-notes/${id}`),
  create: (data: {
    customer_id: string;
    original_invoice_id?: string;
    credit_type: 'full' | 'partial';
    reason: string;
    items: any[];
    subtotal_amount: number;
    tax_amount: number;
    total_amount: number;
  }) => api.post('/credit-notes', data),
  fromInvoice: (invoiceId: string, data: any) =>
    api.post(`/credit-notes/from-invoice/${invoiceId}`, data),
  apply: (id: string, invoiceId: string, amount: number) =>
    api.post(`/credit-notes/${id}/apply`, { invoice_id: invoiceId, amount }),
  delete: (id: string) => api.delete(`/credit-notes/${id}`),
  downloadPDF: (id: string) => api.get(`/credit-notes/${id}/pdf`, { responseType: 'blob' }),
};

// Projects API (Projets & Temps)
export const projectsService = {
  getAll: (params?: { status?: string; customer_id?: string }) =>
    api.get('/projects', { params }),
  getOne: (id: string) => api.get(`/projects/${id}`),
  create: (data: {
    name: string;
    customer_id?: string;
    project_type: 'time_and_materials' | 'fixed_price' | 'retainer';
    status?: string;
    start_date: string;
    end_date?: string;
    estimated_hours?: number;
    hourly_rate?: number;
    budget_amount?: number;
    description?: string;
  }) => api.post('/projects', data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  getStats: (id: string) => api.get(`/projects/${id}/stats`),
  getTasks: (id: string) => api.get(`/projects/${id}/tasks`),
  getTimeEntries: (id: string) => api.get(`/projects/${id}/time-entries`),
  close: (id: string) => api.post(`/projects/${id}/close`),
};

// Project Tasks API
export const projectTasksService = {
  getAll: (projectId: string) => api.get(`/projects/${projectId}/tasks`),
  getOne: (id: string) => api.get(`/project-tasks/${id}`),
  create: (data: {
    project_id: string;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assigned_to?: string;
    estimated_hours?: number;
    due_date?: string;
  }) => api.post('/project-tasks', data),
  update: (id: string, data: any) => api.put(`/project-tasks/${id}`, data),
  delete: (id: string) => api.delete(`/project-tasks/${id}`),
};

// Time Entries API
export const timeEntriesService = {
  getAll: (params?: { project_id?: string; user_id?: string; start_date?: string; end_date?: string }) =>
    api.get('/time-entries', { params }),
  getOne: (id: string) => api.get(`/time-entries/${id}`),
  create: (data: {
    project_id: string;
    task_id?: string;
    user_id: string;
    description: string;
    duration_hours: number;
    hourly_rate?: number;
    is_billable?: boolean;
    entry_date: string;
  }) => api.post('/time-entries', data),
  update: (id: string, data: any) => api.put(`/time-entries/${id}`, data),
  delete: (id: string) => api.delete(`/time-entries/${id}`),
  startTimer: (data: { project_id: string; task_id?: string; description: string }) =>
    api.post('/time-entries/timer/start', data),
  stopTimer: (id: string) => api.post(`/time-entries/timer/${id}/stop`),
  getSummary: (params: { user_id?: string; start_date: string; end_date: string }) =>
    api.get('/time-entries/summary', { params }),
};

// Employees API (RH)
export const employeesService = {
  getAll: (params?: { status?: string; department?: string }) =>
    api.get('/employees', { params }),
  getOne: (id: string) => api.get(`/employees/${id}`),
  create: (data: {
    first_name: string;
    last_name: string;
    email: string;
    employee_number: string;
    job_title: string;
    department?: string;
    employment_type: string;
    hire_date: string;
    base_salary?: number;
    currency?: string;
  }) => api.post('/employees', data),
  update: (id: string, data: any) => api.put(`/employees/${id}`, data),
  delete: (id: string) => api.delete(`/employees/${id}`),
  terminate: (id: string, terminationDate: string, reason: string) =>
    api.post(`/employees/${id}/terminate`, { termination_date: terminationDate, reason }),
  getDocuments: (id: string) => api.get(`/employees/${id}/documents`),
};

// Employee Leaves API
export const employeeLeavesService = {
  getAll: (params?: { employee_id?: string; status?: string; leave_type?: string }) =>
    api.get('/employee-leaves', { params }),
  getOne: (id: string) => api.get(`/employee-leaves/${id}`),
  request: (data: {
    employee_id: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    half_day?: boolean;
    reason: string;
  }) => api.post('/employee-leaves', data),
  update: (id: string, data: any) => api.put(`/employee-leaves/${id}`, data),
  approve: (id: string, approvedBy: string) =>
    api.post(`/employee-leaves/${id}/approve`, { approved_by: approvedBy }),
  reject: (id: string, rejectedBy: string, reason: string) =>
    api.post(`/employee-leaves/${id}/reject`, { rejected_by: rejectedBy, reason }),
  cancel: (id: string) => api.post(`/employee-leaves/${id}/cancel`),
  getBalance: (employeeId: string) => api.get(`/employees/${employeeId}/leave-balance`),
};

// Time Clockings API
export const timeClockingsService = {
  getAll: (params?: { employee_id?: string; start_date?: string; end_date?: string }) =>
    api.get('/time-clockings', { params }),
  clockIn: (employeeId: string, location?: { latitude: number; longitude: number }) =>
    api.post('/time-clockings/clock-in', { employee_id: employeeId, location }),
  clockOut: (id: string, location?: { latitude: number; longitude: number }) =>
    api.post(`/time-clockings/${id}/clock-out`, { location }),
  getSummary: (employeeId: string, startDate: string, endDate: string) =>
    api.get('/time-clockings/summary', { params: { employee_id: employeeId, start_date: startDate, end_date: endDate } }),
};

// Warehouses API (Stock)
export const warehousesService = {
  getAll: () => api.get('/warehouses'),
  getOne: (id: string) => api.get(`/warehouses/${id}`),
  create: (data: {
    name: string;
    code: string;
    warehouse_type: string;
    address?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  }) => api.post('/warehouses', data),
  update: (id: string, data: any) => api.put(`/warehouses/${id}`, data),
  delete: (id: string) => api.delete(`/warehouses/${id}`),
  getInventory: (id: string) => api.get(`/warehouses/${id}/inventory`),
};

// Inventory Levels API
export const inventoryService = {
  getAll: (params?: { warehouse_id?: string; product_id?: string }) =>
    api.get('/inventory-levels', { params }),
  getOne: (id: string) => api.get(`/inventory-levels/${id}`),
  getLowStock: (warehouseId?: string) =>
    api.get('/inventory-levels/low-stock', { params: { warehouse_id: warehouseId } }),
  update: (id: string, data: any) => api.put(`/inventory-levels/${id}`, data),
};

// Stock Movements API
export const stockMovementsService = {
  getAll: (params?: { warehouse_id?: string; product_id?: string; start_date?: string; end_date?: string }) =>
    api.get('/stock-movements', { params }),
  create: (data: {
    product_id: string;
    warehouse_id: string;
    movement_type: string;
    quantity: number;
    unit_cost?: number;
    reference?: string;
    notes?: string;
  }) => api.post('/stock-movements', data),
  getHistory: (productId: string, warehouseId?: string) =>
    api.get('/stock-movements/history', { params: { product_id: productId, warehouse_id: warehouseId } }),
};
