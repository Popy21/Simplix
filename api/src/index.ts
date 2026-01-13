import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import customersRouter from './routes/customers';
import companiesRouter from './routes/companies';
import contactsRouter from './routes/contacts';
import productsRouter from './routes/products';
import salesRouter from './routes/sales';
import authRouter from './routes/auth';
import teamsRouter from './routes/teams';
import quotesRouter from './routes/quotes';
import analyticsRouter from './routes/analytics';
import searchRouter from './routes/search';
import bulkRouter from './routes/bulk';
import reportsRouter from './routes/reports';
import notificationsRouter from './routes/notifications';
import tasksRouter from './routes/tasks';
import pipelineRouter from './routes/pipeline';
import campaignsRouter from './routes/campaigns';
import invoicesRouter from './routes/invoices';
import paymentsRouter from './routes/payments';
import dealsRouter from './routes/deals';
import leadsRouter from './routes/leads';
import activitiesRouter from './routes/activities';
import documentsRouter from './routes/documents';
import permissionsRouter from './routes/permissions';
import deduplicationRouter from './routes/deduplication';
import workflowsRouter from './routes/workflows';
import emailsRouter from './routes/emails';
import suppliersRouter from './routes/suppliers';
import expensesRouter from './routes/expenses';
import logsRouter from './routes/logs';
import dashboardRouter from './routes/dashboard';
import templatesRouter from './routes/templates';
import uploadRouter from './routes/upload';
import showcaseRouter from './routes/showcase';
import pdfRouter from './routes/pdf';
import companyProfileRouter from './routes/company-profile';
import stripeRouter from './routes/stripe';
import webhooksRouter from './routes/webhooks';
import auth2faRouter from './routes/auth-2fa';
import emailCampaignsRouter from './routes/email-campaigns';
import settingsRouter from './routes/settings';
import creditNotesRouter from './routes/credit-notes';
import exportsRouter from './routes/exports';
import recurringInvoicesRouter from './routes/recurring-invoices';
import remindersRouter from './routes/reminders';
import quoteSignaturesRouter from './routes/quote-signatures';
import numberingRouter from './routes/numbering';
import agedBalanceRouter from './routes/aged-balance';
import depositsRouter from './routes/deposits';
import revenueDashboardRouter from './routes/revenue-dashboard';
import legalSettingsRouter from './routes/legal-settings';
import bankReconciliationRouter from './routes/bank-reconciliation';
import purchaseOrdersRouter from './routes/purchase-orders';
import deliveryNotesRouter from './routes/delivery-notes';
import proformaRouter from './routes/proforma';
import quoteVersionsRouter from './routes/quote-versions';
import stockRouter from './routes/stock';
import expenseNotesRouter from './routes/expense-notes';
import shippingRouter from './routes/shipping';
import importRouter from './routes/import';
import cashflowRouter from './routes/cashflow';
import accountingRouter from './routes/accounting';
import qrcodeRouter from './routes/qrcode';
import facturxRouter from './routes/facturx';
import categoriesRouter from './routes/categories';
import pricingRouter from './routes/pricing';
import paymentSchedulesRouter from './routes/payment-schedules';
import returnOrdersRouter from './routes/return-orders';
import vatRouter from './routes/vat';
import catalogRouter from './routes/catalog';
import logger from './utils/logger';
import path from 'path';
import { setupSwagger } from './config/swagger';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Logger middleware
app.use(logger.httpMiddleware());

// Setup Swagger documentation
setupSwagger(app);

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Simplix Sales CRM API',
    version: '4.0.0',
    endpoints: {
      auth: '/api/auth',
      customers: '/api/customers',
      products: '/api/products',
      sales: '/api/sales',
      teams: '/api/teams',
      quotes: '/api/quotes',
      analytics: '/api/analytics',
      search: '/api/search',
      bulk: '/api/bulk',
      reports: '/api/reports',
      notifications: '/api/notifications',
      tasks: '/api/tasks',
      pipeline: '/api/pipeline',
      campaigns: '/api/campaigns',
      invoices: '/api/invoices',
      payments: '/api/payments',
      suppliers: '/api/suppliers',
      expenses: '/api/expenses',
      dashboard: '/api/dashboard',
      templates: '/api/templates',
      showcase: '/api/showcase'
    }
  });
});

app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/search', searchRouter);
app.use('/api/bulk', bulkRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/pipeline', pipelineRouter);
app.use('/api/pipelines', pipelineRouter); // Alias for /api/pipeline
app.use('/api/campaigns', campaignsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/pay', paymentsRouter); // Payment pages for quotes (Stripe, Apple Pay)
app.use('/api/deals', dealsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/permissions', permissionsRouter);
app.use('/api/contacts/deduplicate', deduplicationRouter);
app.use('/api/workflows', workflowsRouter);
app.use('/api/emails', emailsRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/logs', logsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/email-templates', templatesRouter); // Alias for email templates
app.use('/api/invoice-templates', templatesRouter); // Alias for invoice templates
app.use('/api/upload', uploadRouter);
app.use('/api/showcase', showcaseRouter);
app.use('/api/company-profile', companyProfileRouter);
app.use('/api', pdfRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/auth', auth2faRouter);
app.use('/api/email-campaigns', emailCampaignsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/credit-notes', creditNotesRouter);
app.use('/api/exports', exportsRouter);
app.use('/api/recurring-invoices', recurringInvoicesRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/quote-signatures', quoteSignaturesRouter);
app.use('/sign', quoteSignaturesRouter); // Public route for signature links
app.use('/api/numbering', numberingRouter);
app.use('/api/aged-balance', agedBalanceRouter);
app.use('/api/deposits', depositsRouter);
app.use('/api/revenue', revenueDashboardRouter);
app.use('/api/legal-settings', legalSettingsRouter);
app.use('/api/bank', bankReconciliationRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/delivery-notes', deliveryNotesRouter);
app.use('/api/proforma', proformaRouter);
app.use('/api/quotes', quoteVersionsRouter); // Versioning endpoints under /api/quotes/:id/versions
app.use('/api/stock', stockRouter);
app.use('/api/expense-notes', expenseNotesRouter);
app.use('/api/shipping', shippingRouter);
app.use('/api/import', importRouter);
app.use('/api/cashflow', cashflowRouter);
app.use('/api/accounting', accountingRouter);
app.use('/api/qrcode', qrcodeRouter);
app.use('/api/facturx', facturxRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/payment-schedules', paymentSchedulesRouter);
app.use('/api/return-orders', returnOrdersRouter);
app.use('/api/vat', vatRouter);
app.use('/api/catalog', catalogRouter);

// Additional API endpoints (inline handlers)
import { authenticateToken } from './middleware/auth';
import { pool } from './database/db';

// GET /api/users - List all users in organization
app.get('/api/users', authenticateToken, async (req: any, res: Response) => {
  try {
    const organizationId = req.user?.organization_id;
    const result = await pool.query(`
      SELECT id, email, first_name, last_name, status, avatar_url, created_at
      FROM users
      WHERE organization_id = $1 AND deleted_at IS NULL
      ORDER BY last_name, first_name
    `, [organizationId]);
    res.json({ users: result.rows, total: result.rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/organizations - Get current organization
app.get('/api/organizations', authenticateToken, async (req: any, res: Response) => {
  try {
    const organizationId = req.user?.organization_id;
    const result = await pool.query(`
      SELECT id, name, slug, website, settings, created_at, updated_at
      FROM organizations
      WHERE id = $1
    `, [organizationId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/email-logs - Get email logs
app.get('/api/email-logs', authenticateToken, async (req: any, res: Response) => {
  try {
    const organizationId = req.user?.organization_id;
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'email_logs'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      return res.json({ logs: [], total: 0 });
    }

    const result = await pool.query(`
      SELECT id, recipient, subject, status, sent_at, error_message, template_id
      FROM email_logs
      WHERE organization_id = $1
      ORDER BY sent_at DESC
      LIMIT $2 OFFSET $3
    `, [organizationId, limit, offset]);

    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM email_logs WHERE organization_id = $1
    `, [organizationId]);

    res.json({
      logs: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / Number(limit))
      }
    });
  } catch (err: any) {
    res.json({ logs: [], total: 0 });
  }
});

// GET /api/email-settings - Get email settings (alias)
app.get('/api/email-settings', authenticateToken, async (req: any, res: Response) => {
  try {
    const organizationId = req.user?.organization_id;

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'email_settings'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      return res.json({
        configured: false,
        settings: { smtp_host: '', smtp_port: 587, from_name: '', from_email: '' }
      });
    }

    const result = await pool.query(`
      SELECT smtp_host, smtp_port, smtp_secure, smtp_user, from_name, from_email, reply_to
      FROM email_settings WHERE organization_id = $1
    `, [organizationId]);

    res.json({
      configured: result.rows.length > 0,
      settings: result.rows[0] || { smtp_host: '', smtp_port: 587, from_name: '', from_email: '' }
    });
  } catch (err: any) {
    res.json({ configured: false, settings: {} });
  }
});

// GET /api/integrations - List integrations
app.get('/api/integrations', authenticateToken, async (req: any, res: Response) => {
  try {
    const organizationId = req.user?.organization_id;

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'integrations'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      return res.json({
        integrations: [
          { id: 1, name: 'Stripe', type: 'payment', status: 'available', connected: false },
          { id: 2, name: 'Mailchimp', type: 'email', status: 'available', connected: false },
          { id: 3, name: 'Slack', type: 'notification', status: 'available', connected: false },
          { id: 4, name: 'Google Calendar', type: 'calendar', status: 'available', connected: false },
          { id: 5, name: 'Zapier', type: 'automation', status: 'available', connected: false }
        ],
        total: 5
      });
    }

    const result = await pool.query(`
      SELECT id, name, type, status, config, created_at
      FROM integrations WHERE organization_id = $1
    `, [organizationId]);

    res.json({ integrations: result.rows, total: result.rows.length });
  } catch (err: any) {
    res.json({ integrations: [], total: 0 });
  }
});

// GET /api/api-keys - List API keys
app.get('/api/api-keys', authenticateToken, async (req: any, res: Response) => {
  try {
    const organizationId = req.user?.organization_id;

    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'api_keys'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      return res.json({ keys: [], total: 0 });
    }

    const result = await pool.query(`
      SELECT id, name, key_prefix, permissions, last_used_at, expires_at, is_active, created_at
      FROM api_keys
      WHERE organization_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `, [organizationId]);

    res.json({ keys: result.rows, total: result.rows.length });
  } catch (err: any) {
    res.json({ keys: [], total: 0 });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
  // Always log the full stack on the server
  console.error(err.stack);

  // In development, expose the error message and stack to help debugging.
  // In production, return a generic message to avoid leaking internals.
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    res.status(500).json({ error: err.message || 'Internal Server Error', stack: err.stack });
  } else {
    res.status(500).json({ error: 'Something went wrong!' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

export default app;
