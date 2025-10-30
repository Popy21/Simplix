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
import logger from './utils/logger';
import path from 'path';

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
app.use('/api/campaigns', campaignsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/payments', paymentsRouter);
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
app.use('/api/upload', uploadRouter);
app.use('/api/showcase', showcaseRouter);
app.use('/api/company-profile', companyProfileRouter);
app.use('/api', pdfRouter);

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
