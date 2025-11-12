# 🔌 API PUBLIQUE & WEBHOOKS

## 🎯 Objectif
Créer une API REST publique complète avec authentification, rate limiting, et système de webhooks pour permettre aux utilisateurs d'intégrer Simplix avec des outils tiers.

---

## 📋 Spécifications

### API REST Publique
- **Format**: JSON
- **Authentification**: API Keys + OAuth 2.0
- **Versioning**: `/api/v1/`, `/api/v2/`
- **Rate Limiting**: 1000 requêtes/heure (ajustable par plan)
- **Documentation**: OpenAPI 3.0 (Swagger)
- **Pagination**: Cursor-based
- **Filtrage**: Query params standard
- **Webhooks**: Event-driven notifications

### Endpoints couverts
Tous les objets principaux doivent être accessibles via l'API:
- Customers/Companies
- Contacts
- Invoices
- Quotes
- Products
- Deals
- Tasks
- Payments
- Expenses

---

## 🏗️ Architecture

```
API Gateway
├── Authentication Layer (API Keys / OAuth2)
├── Rate Limiting (Redis-based)
├── Request Validation (JSON Schema)
├── Version Router (/v1, /v2)
├── Controllers
├── Services
└── Response Formatter

Webhooks System
├── Event Publisher (Event Emitter)
├── Webhook Queue (Bull + Redis)
├── Retry Logic (Exponential backoff)
├── Signature Verification (HMAC)
└── Delivery Logs
```

---

## 🗄️ Schéma BDD

```sql
-- ========================================
-- API KEYS & AUTHENTICATION
-- ========================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  key_name VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL, -- Ex: sk_live_, sk_test_
  key_hash VARCHAR(255) NOT NULL, -- Hash SHA256 de la clé
  key_last_4 VARCHAR(4) NOT NULL, -- 4 derniers caractères pour identification

  -- Permissions
  scopes JSONB DEFAULT '["read"]', -- ['read', 'write', 'delete']
  allowed_ips TEXT[], -- Restriction IP optionnelle

  -- Limits
  rate_limit_per_hour INTEGER DEFAULT 1000,
  rate_limit_per_day INTEGER DEFAULT 10000,

  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES users(id),
  revoke_reason TEXT,

  UNIQUE(key_hash)
);

CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- OAuth 2.0 Apps
CREATE TABLE IF NOT EXISTS oauth_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- App info
  app_name VARCHAR(255) NOT NULL,
  app_description TEXT,
  client_id VARCHAR(100) UNIQUE NOT NULL,
  client_secret_hash VARCHAR(255) NOT NULL,

  -- OAuth config
  redirect_uris TEXT[] NOT NULL,
  allowed_scopes TEXT[] DEFAULT ARRAY['read', 'write'],
  grant_types TEXT[] DEFAULT ARRAY['authorization_code', 'refresh_token'],

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OAuth Access Tokens
CREATE TABLE IF NOT EXISTS oauth_access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES oauth_applications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  access_token_hash VARCHAR(255) UNIQUE NOT NULL,
  refresh_token_hash VARCHAR(255) UNIQUE,

  scopes TEXT[],
  expires_at TIMESTAMP NOT NULL,
  refresh_expires_at TIMESTAMP,

  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_oauth_tokens_app ON oauth_access_tokens(application_id);
CREATE INDEX idx_oauth_tokens_user ON oauth_access_tokens(user_id);

-- ========================================
-- API USAGE & ANALYTICS
-- ========================================

CREATE TABLE IF NOT EXISTS api_requests_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,

  -- Request details
  method VARCHAR(10) NOT NULL, -- GET, POST, PUT, DELETE
  endpoint VARCHAR(500) NOT NULL,
  api_version VARCHAR(10) DEFAULT 'v1',

  -- Response
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,

  -- Metadata
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(100),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index partitionné par date pour performance
CREATE INDEX idx_api_log_org_date ON api_requests_log(organization_id, created_at DESC);
CREATE INDEX idx_api_log_key ON api_requests_log(api_key_id, created_at DESC);

-- Table de comptage pour rate limiting (Redis en prod, PG pour backup)
CREATE TABLE IF NOT EXISTS api_rate_limits (
  api_key_id UUID NOT NULL,
  window_start TIMESTAMP NOT NULL,
  window_type VARCHAR(10) NOT NULL, -- 'hour', 'day'
  request_count INTEGER DEFAULT 0,
  PRIMARY KEY (api_key_id, window_start, window_type)
);

-- ========================================
-- WEBHOOKS
-- ========================================

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Endpoint config
  url TEXT NOT NULL,
  description TEXT,
  secret VARCHAR(255) NOT NULL, -- Pour signature HMAC

  -- Events subscribed
  events TEXT[] NOT NULL, -- ['invoice.created', 'payment.received', etc.]

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Stats
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_success_at TIMESTAMP,
  last_failure_at TIMESTAMP,
  last_failure_reason TEXT,

  -- Config
  retry_enabled BOOLEAN DEFAULT true,
  max_retries INTEGER DEFAULT 3,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhooks_org ON webhook_endpoints(organization_id);
CREATE INDEX idx_webhooks_active ON webhook_endpoints(is_active) WHERE is_active = true;

-- Webhook delivery log
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_endpoint_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,

  -- Event
  event_type VARCHAR(100) NOT NULL, -- 'invoice.created'
  event_id UUID NOT NULL, -- ID de l'objet concerné
  payload JSONB NOT NULL,

  -- Delivery
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED, RETRYING
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP,

  -- Response
  http_status_code INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,
  error_message TEXT,

  -- Timing
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP,
  failed_at TIMESTAMP
);

CREATE INDEX idx_webhook_deliveries_endpoint ON webhook_deliveries(webhook_endpoint_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at)
  WHERE status = 'RETRYING' AND next_retry_at IS NOT NULL;

-- ========================================
-- API DOCUMENTATION
-- ========================================

CREATE TABLE IF NOT EXISTS api_changelog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version VARCHAR(20) NOT NULL, -- 'v1.2.0'
  release_date DATE NOT NULL,
  changes JSONB NOT NULL, -- [{type: 'added', description: '...'}]
  breaking_changes BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔧 Implémentation Backend

### 1. **Middleware d'authentification API**

```typescript
// api/src/middleware/apiAuth.ts
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from '../database/db';
import { redisClient } from '../database/redis';

export interface ApiAuthRequest extends Request {
  apiKey?: {
    id: string;
    organizationId: string;
    scopes: string[];
  };
}

export const apiAuth = async (
  req: ApiAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Récupérer la clé API depuis le header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'API key required. Use: Authorization: Bearer YOUR_API_KEY'
      });
    }

    const apiKey = authHeader.substring(7); // Enlever "Bearer "

    // Vérifier le format (sk_live_xxx ou sk_test_xxx)
    if (!apiKey.startsWith('sk_live_') && !apiKey.startsWith('sk_test_')) {
      return res.status(401).json({
        error: 'invalid_api_key',
        message: 'Invalid API key format'
      });
    }

    // Hasher la clé pour comparaison
    const keyHash = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');

    // Chercher dans la BDD (avec cache Redis)
    const cacheKey = `api_key:${keyHash}`;
    let keyData = await redisClient.get(cacheKey);

    if (!keyData) {
      const result = await db.query(
        `SELECT id, organization_id, scopes, rate_limit_per_hour, is_active, expires_at, allowed_ips
         FROM api_keys
         WHERE key_hash = $1`,
        [keyHash]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          error: 'invalid_api_key',
          message: 'API key not found'
        });
      }

      keyData = result.rows[0];

      // Cacher pour 5 minutes
      await redisClient.setex(cacheKey, 300, JSON.stringify(keyData));
    } else {
      keyData = JSON.parse(keyData);
    }

    // Vérifications
    if (!keyData.is_active) {
      return res.status(401).json({
        error: 'api_key_inactive',
        message: 'This API key has been deactivated'
      });
    }

    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return res.status(401).json({
        error: 'api_key_expired',
        message: 'This API key has expired'
      });
    }

    // Vérifier IP si restriction
    if (keyData.allowed_ips && keyData.allowed_ips.length > 0) {
      const clientIp = req.ip || req.connection.remoteAddress;
      if (!keyData.allowed_ips.includes(clientIp)) {
        return res.status(403).json({
          error: 'ip_not_allowed',
          message: 'Your IP address is not allowed to use this API key'
        });
      }
    }

    // Rate limiting
    const isRateLimited = await checkRateLimit(
      keyData.id,
      keyData.rate_limit_per_hour
    );

    if (isRateLimited) {
      return res.status(429).json({
        error: 'rate_limit_exceeded',
        message: `Rate limit exceeded. Maximum ${keyData.rate_limit_per_hour} requests per hour.`,
        retry_after: 3600
      });
    }

    // Incrémenter le compteur d'utilisation
    await incrementUsage(keyData.id);

    // Attacher les infos à la requête
    req.apiKey = {
      id: keyData.id,
      organizationId: keyData.organization_id,
      scopes: keyData.scopes
    };

    next();
  } catch (error) {
    console.error('API Auth error:', error);
    res.status(500).json({
      error: 'internal_error',
      message: 'Authentication failed'
    });
  }
};

async function checkRateLimit(keyId: string, limitPerHour: number): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

  const key = `rate_limit:${keyId}:${windowStart.getTime()}`;

  const current = await redisClient.incr(key);

  if (current === 1) {
    // Premier appel de cette heure, set expiration
    await redisClient.expire(key, 3600);
  }

  return current > limitPerHour;
}

async function incrementUsage(keyId: string): Promise<void> {
  // Async, pas besoin d'attendre
  db.query(
    'UPDATE api_keys SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = $1',
    [keyId]
  ).catch(err => console.error('Failed to increment usage:', err));
}

// Middleware pour vérifier les scopes
export const requireScope = (requiredScope: string) => {
  return (req: ApiAuthRequest, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    if (!req.apiKey.scopes.includes(requiredScope) && !req.apiKey.scopes.includes('admin')) {
      return res.status(403).json({
        error: 'insufficient_permissions',
        message: `This operation requires '${requiredScope}' scope`
      });
    }

    next();
  };
};
```

### 2. **Routes API publique**

```typescript
// api/src/routes/api/v1/index.ts
import express from 'express';
import { apiAuth, requireScope } from '../../../middleware/apiAuth';
import invoicesRouter from './invoices';
import customersRouter from './customers';
import productsRouter from './products';
import paymentsRouter from './payments';
import webhooksRouter from './webhooks';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(apiAuth);

// Routes publiques
router.use('/invoices', invoicesRouter);
router.use('/customers', customersRouter);
router.use('/products', productsRouter);
router.use('/payments', paymentsRouter);
router.use('/webhooks', webhooksRouter);

export default router;
```

```typescript
// api/src/routes/api/v1/invoices.ts
import express from 'express';
import { requireScope } from '../../../middleware/apiAuth';
import { InvoiceService } from '../../../services/invoice.service';
import { ApiResponse } from '../../../utils/api-response';
import { validateRequest } from '../../../middleware/validation';
import { createInvoiceSchema, updateInvoiceSchema } from '../../../schemas/invoice.schema';

const router = express.Router();
const invoiceService = new InvoiceService();

// GET /api/v1/invoices - Liste des factures
router.get('/', requireScope('read'), async (req, res) => {
  try {
    const { cursor, limit = 50, status, customer_id } = req.query;

    const invoices = await invoiceService.list({
      organizationId: req.apiKey!.organizationId,
      cursor: cursor as string,
      limit: Math.min(parseInt(limit as string), 100),
      filters: {
        status: status as string,
        customerId: customer_id as string
      }
    });

    res.json(ApiResponse.success({
      data: invoices.items,
      has_more: invoices.hasMore,
      next_cursor: invoices.nextCursor
    }));
  } catch (error) {
    res.status(500).json(ApiResponse.error(error.message));
  }
});

// GET /api/v1/invoices/:id - Détail d'une facture
router.get('/:id', requireScope('read'), async (req, res) => {
  try {
    const invoice = await invoiceService.getById(
      req.params.id,
      req.apiKey!.organizationId
    );

    if (!invoice) {
      return res.status(404).json(ApiResponse.error('Invoice not found'));
    }

    res.json(ApiResponse.success(invoice));
  } catch (error) {
    res.status(500).json(ApiResponse.error(error.message));
  }
});

// POST /api/v1/invoices - Créer une facture
router.post(
  '/',
  requireScope('write'),
  validateRequest(createInvoiceSchema),
  async (req, res) => {
    try {
      const invoice = await invoiceService.create({
        ...req.body,
        organizationId: req.apiKey!.organizationId
      });

      res.status(201).json(ApiResponse.success(invoice));
    } catch (error) {
      res.status(400).json(ApiResponse.error(error.message));
    }
  }
);

// PUT /api/v1/invoices/:id - Mettre à jour
router.put(
  '/:id',
  requireScope('write'),
  validateRequest(updateInvoiceSchema),
  async (req, res) => {
    try {
      const invoice = await invoiceService.update(
        req.params.id,
        req.apiKey!.organizationId,
        req.body
      );

      if (!invoice) {
        return res.status(404).json(ApiResponse.error('Invoice not found'));
      }

      res.json(ApiResponse.success(invoice));
    } catch (error) {
      res.status(400).json(ApiResponse.error(error.message));
    }
  }
);

// DELETE /api/v1/invoices/:id
router.delete('/:id', requireScope('delete'), async (req, res) => {
  try {
    await invoiceService.delete(req.params.id, req.apiKey!.organizationId);
    res.status(204).send();
  } catch (error) {
    res.status(400).json(ApiResponse.error(error.message));
  }
});

// POST /api/v1/invoices/:id/send - Envoyer par email
router.post('/:id/send', requireScope('write'), async (req, res) => {
  try {
    await invoiceService.sendByEmail(req.params.id, req.apiKey!.organizationId);
    res.json(ApiResponse.success({ message: 'Invoice sent successfully' }));
  } catch (error) {
    res.status(400).json(ApiResponse.error(error.message));
  }
});

// GET /api/v1/invoices/:id/pdf - Télécharger PDF
router.get('/:id/pdf', requireScope('read'), async (req, res) => {
  try {
    const pdf = await invoiceService.generatePDF(
      req.params.id,
      req.apiKey!.organizationId
    );

    res.contentType('application/pdf');
    res.send(pdf);
  } catch (error) {
    res.status(400).json(ApiResponse.error(error.message));
  }
});

export default router;
```

### 3. **Service de Webhooks**

```typescript
// api/src/services/webhook.service.ts
import axios from 'axios';
import crypto from 'crypto';
import { db } from '../database/db';
import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../database/redis';

const webhookQueue = new Queue('webhooks', { connection: redisConnection });

interface WebhookPayload {
  event: string;
  data: any;
  timestamp: number;
  id: string;
}

export class WebhookService {
  // Enregistrer un événement
  async triggerEvent(
    organizationId: string,
    eventType: string,
    eventId: string,
    payload: any
  ): Promise<void> {
    // Récupérer tous les webhooks actifs pour cet événement
    const webhooks = await db.query(
      `SELECT * FROM webhook_endpoints
       WHERE organization_id = $1
         AND is_active = true
         AND $2 = ANY(events)`,
      [organizationId, eventType]
    );

    if (webhooks.rows.length === 0) return;

    // Créer les deliveries
    for (const webhook of webhooks.rows) {
      const deliveryId = await this.createDelivery(
        webhook.id,
        eventType,
        eventId,
        payload
      );

      // Ajouter à la queue
      await webhookQueue.add(
        'deliver',
        {
          deliveryId,
          webhookId: webhook.id,
          url: webhook.url,
          secret: webhook.secret,
          payload: {
            event: eventType,
            data: payload,
            timestamp: Date.now(),
            id: eventId
          }
        },
        {
          attempts: webhook.max_retries || 3,
          backoff: {
            type: 'exponential',
            delay: 1000 // 1s, 2s, 4s, 8s...
          }
        }
      );
    }
  }

  private async createDelivery(
    webhookId: string,
    eventType: string,
    eventId: string,
    payload: any
  ): Promise<string> {
    const result = await db.query(
      `INSERT INTO webhook_deliveries
       (webhook_endpoint_id, event_type, event_id, payload, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING id`,
      [webhookId, eventType, eventId, JSON.stringify(payload)]
    );

    return result.rows[0].id;
  }

  // Worker pour traiter les webhooks
  static startWorker(): Worker {
    return new Worker(
      'webhooks',
      async (job) => {
        const { deliveryId, webhookId, url, secret, payload } = job.data;

        try {
          const startTime = Date.now();

          // Générer la signature HMAC
          const signature = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('hex');

          // Envoyer le webhook
          const response = await axios.post(url, payload, {
            headers: {
              'Content-Type': 'application/json',
              'X-Simplix-Signature': signature,
              'X-Simplix-Event': payload.event,
              'User-Agent': 'Simplix-Webhooks/1.0'
            },
            timeout: 10000 // 10s timeout
          });

          const responseTime = Date.now() - startTime;

          // Marquer comme succès
          await db.query(
            `UPDATE webhook_deliveries
             SET status = 'SUCCESS',
                 http_status_code = $1,
                 response_body = $2,
                 response_time_ms = $3,
                 delivered_at = NOW(),
                 attempts = attempts + 1
             WHERE id = $4`,
            [response.status, response.data, responseTime, deliveryId]
          );

          // Incrémenter success_count
          await db.query(
            `UPDATE webhook_endpoints
             SET success_count = success_count + 1, last_success_at = NOW()
             WHERE id = $1`,
            [webhookId]
          );

          return { success: true };
        } catch (error: any) {
          const isLastAttempt = job.attemptsMade >= (job.opts.attempts || 3);

          await db.query(
            `UPDATE webhook_deliveries
             SET status = $1,
                 http_status_code = $2,
                 error_message = $3,
                 attempts = attempts + 1,
                 ${isLastAttempt ? 'failed_at = NOW()' : 'next_retry_at = NOW() + INTERVAL \'1 minute\''}
             WHERE id = $4`,
            [
              isLastAttempt ? 'FAILED' : 'RETRYING',
              error.response?.status,
              error.message,
              deliveryId
            ]
          );

          if (isLastAttempt) {
            await db.query(
              `UPDATE webhook_endpoints
               SET failure_count = failure_count + 1,
                   last_failure_at = NOW(),
                   last_failure_reason = $1
               WHERE id = $2`,
              [error.message, webhookId]
            );
          }

          throw error; // Pour que Bull retry
        }
      },
      { connection: redisConnection }
    );
  }
}

// Démarrer le worker au lancement de l'app
WebhookService.startWorker();
```

### 4. **Générateur de clés API**

```typescript
// api/src/services/api-key.service.ts
import crypto from 'crypto';
import { db } from '../database/db';

export class ApiKeyService {
  async createKey(
    organizationId: string,
    userId: string,
    name: string,
    options: {
      scopes?: string[];
      rateLimit?: number;
      expiresAt?: Date;
      environment?: 'live' | 'test';
    } = {}
  ): Promise<{ key: string; keyId: string }> {
    // Générer une clé sécurisée
    const randomBytes = crypto.randomBytes(32);
    const keyPrefix = options.environment === 'test' ? 'sk_test_' : 'sk_live_';
    const key = keyPrefix + randomBytes.toString('base64url');

    // Hasher pour stockage
    const keyHash = crypto
      .createHash('sha256')
      .update(key)
      .digest('hex');

    const keyLast4 = key.slice(-4);

    // Stocker dans la BDD
    const result = await db.query(
      `INSERT INTO api_keys
       (organization_id, key_name, key_prefix, key_hash, key_last_4, scopes,
        rate_limit_per_hour, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        organizationId,
        name,
        keyPrefix,
        keyHash,
        keyLast4,
        JSON.stringify(options.scopes || ['read']),
        options.rateLimit || 1000,
        options.expiresAt,
        userId
      ]
    );

    // IMPORTANT: La clé complète n'est retournée qu'une seule fois
    return {
      key, // À afficher à l'utilisateur UNE SEULE FOIS
      keyId: result.rows[0].id
    };
  }

  async revokeKey(keyId: string, userId: string, reason: string): Promise<void> {
    await db.query(
      `UPDATE api_keys
       SET is_active = false, revoked_at = NOW(), revoked_by = $1, revoke_reason = $2
       WHERE id = $3`,
      [userId, reason, keyId]
    );
  }

  async listKeys(organizationId: string): Promise<any[]> {
    const result = await db.query(
      `SELECT id, key_name, key_prefix, key_last_4, scopes, is_active,
              rate_limit_per_hour, usage_count, last_used_at, created_at, expires_at
       FROM api_keys
       WHERE organization_id = $1
       ORDER BY created_at DESC`,
      [organizationId]
    );

    return result.rows;
  }
}
```

---

## 📚 Documentation OpenAPI (Swagger)

```typescript
// api/src/docs/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Simplix API',
      version: '1.0.0',
      description: 'API publique pour intégrer Simplix avec vos applications',
      contact: {
        name: 'Simplix Support',
        email: 'api@simplix.com'
      }
    },
    servers: [
      {
        url: 'https://api.simplix.com/v1',
        description: 'Production'
      },
      {
        url: 'https://api-sandbox.simplix.com/v1',
        description: 'Sandbox'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key',
          description: 'Utilisez votre clé API: Authorization: Bearer sk_live_xxx'
        }
      },
      schemas: {
        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            invoice_number: { type: 'string' },
            customer_id: { type: 'string', format: 'uuid' },
            issue_date: { type: 'string', format: 'date' },
            due_date: { type: 'string', format: 'date' },
            subtotal: { type: 'number', format: 'decimal' },
            tax_amount: { type: 'number', format: 'decimal' },
            total_amount: { type: 'number', format: 'decimal' },
            status: {
              type: 'string',
              enum: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']
            },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    },
    security: [{ ApiKeyAuth: [] }]
  },
  apis: ['./src/routes/api/**/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);
```

---

## 📦 Dépendances

```json
{
  "dependencies": {
    "bullmq": "^5.0.0",
    "ioredis": "^5.3.0",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0"
  }
}
```

---

## ✅ Checklist

### Phase 1: API Foundation (2 semaines)
- [ ] Système d'API keys
- [ ] Middleware d'authentification
- [ ] Rate limiting (Redis)
- [ ] Logging des requêtes
- [ ] Versioning (v1, v2)
- [ ] Pagination cursor-based
- [ ] Documentation Swagger

### Phase 2: Endpoints (2 semaines)
- [ ] Invoices CRUD
- [ ] Customers CRUD
- [ ] Products CRUD
- [ ] Payments CRUD
- [ ] Deals CRUD
- [ ] Tasks CRUD

### Phase 3: Webhooks (1 semaine)
- [ ] Système d'événements
- [ ] Queue de delivery
- [ ] Retry logic
- [ ] Signature HMAC
- [ ] Interface de gestion

### Phase 4: OAuth 2.0 (1 semaine)
- [ ] OAuth apps
- [ ] Authorization flow
- [ ] Token management
- [ ] Refresh tokens

---

## 🎯 KPIs

- ✅ Temps de réponse API < 200ms (p95)
- ✅ Uptime > 99.9%
- ✅ Taux de succès webhooks > 95%
- ✅ Documentation complète
