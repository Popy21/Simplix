import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configuration de la connexion PostgreSQL
const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'simplix_crm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Création du pool de connexions
export const pool = new Pool(poolConfig);

// Test de connexion au démarrage
pool.on('connect', () => {
  console.log('✓ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Fonction helper pour exécuter des requêtes
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      console.log('⚠️ Slow query detected', { text, duration, rows: res.rowCount });
    }

    return res;
  } catch (error) {
    console.error('❌ Database query error:', { text, error });
    throw error;
  }
};

// Fonction pour obtenir un client pour les transactions
export const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);

  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);

  // Monkey patch the query method to keep track of the last query executed
  client.query = (...args: any[]) => {
    // @ts-ignore
    client.lastQuery = args;
    // @ts-ignore
    return query(...args);
  };

  client.release = () => {
    clearTimeout(timeout);
    // Set the methods back to their old un-monkey-patched version
    client.query = query;
    client.release = release;
    return release();
  };

  return client;
};

// Fonction pour fermer le pool (à appeler lors de l'arrêt de l'application)
export const closePool = async () => {
  await pool.end();
  console.log('✓ Database pool closed');
};

// Export par défaut pour compatibilité
export default pool;
