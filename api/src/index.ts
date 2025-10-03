import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import customersRouter from './routes/customers';
import productsRouter from './routes/products';
import salesRouter from './routes/sales';
import authRouter from './routes/auth';
import teamsRouter from './routes/teams';
import quotesRouter from './routes/quotes';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Simplix Sales CRM API',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      customers: '/api/customers',
      products: '/api/products',
      sales: '/api/sales',
      teams: '/api/teams',
      quotes: '/api/quotes'
    }
  });
});

app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/quotes', quotesRouter);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

export default app;
