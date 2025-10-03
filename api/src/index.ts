import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import customersRouter from './routes/customers';
import productsRouter from './routes/products';
import salesRouter from './routes/sales';

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
    version: '1.0.0',
    endpoints: {
      customers: '/api/customers',
      products: '/api/products',
      sales: '/api/sales'
    }
  });
});

app.use('/api/customers', customersRouter);
app.use('/api/products', productsRouter);
app.use('/api/sales', salesRouter);

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
