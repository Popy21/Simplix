# 🛒 INTÉGRATIONS E-COMMERCE

## 🎯 Objectif
Intégrer Simplix avec les principales plateformes e-commerce (Shopify, WooCommerce, PrestaShop) et créer un marketplace d'intégrations style Zapier.

---

## 📋 Plateformes supportées

1. **Shopify** - API REST + Webhooks
2. **WooCommerce** - REST API + WooCommerce Webhooks
3. **PrestaShop** - Webservice API
4. **Stripe** - Déjà intégré, améliorer
5. **PayPal** - Commerce Platform
6. **Square** - eCommerce API

---

## 🏗️ Architecture

```
Integration Framework
├── Connector Interface (Abstract)
├── OAuth Flow Manager
├── Webhook Receiver
├── Sync Engine (Bi-directional)
├── Rate Limiter per Platform
└── Error Handler & Retry Logic

Connectors:
├── ShopifyConnector
├── WooCommerceConnector
├── PrestaShopConnector
├── StripeConnector (enhanced)
└── CustomWebhookConnector
```

---

## 🗄️ Schéma BDD

```sql
-- ========================================
-- INTEGRATIONS
-- ========================================

CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Platform
  platform VARCHAR(50) NOT NULL, -- SHOPIFY, WOOCOMMERCE, PRESTASHOP, etc.
  integration_name VARCHAR(255) NOT NULL,

  -- Auth
  auth_type VARCHAR(50), -- OAUTH2, API_KEY, BASIC
  credentials JSONB NOT NULL, -- Encrypted credentials

  -- Config
  config JSONB DEFAULT '{}', -- Platform-specific config
  sync_settings JSONB DEFAULT '{}', -- What to sync, how often

  -- Status
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, PAUSED, ERROR, DISCONNECTED
  is_active BOOLEAN DEFAULT true,

  -- Stats
  last_sync_at TIMESTAMP,
  last_success_at TIMESTAMP,
  last_error_at TIMESTAMP,
  last_error_message TEXT,
  sync_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,

  -- Metadata
  connected_by UUID REFERENCES users(id),
  connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_integrations_org ON integrations(organization_id);
CREATE INDEX idx_integrations_platform ON integrations(platform);

-- Sync logs
CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,

  sync_type VARCHAR(50) NOT NULL, -- FULL, INCREMENTAL, WEBHOOK
  direction VARCHAR(20) NOT NULL, -- IMPORT, EXPORT, BIDIRECTIONAL

  -- Stats
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(20) DEFAULT 'RUNNING', -- RUNNING, COMPLETED, FAILED, PARTIAL
  error_details JSONB,

  -- Timing
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER
);

CREATE INDEX idx_sync_logs_integration ON integration_sync_logs(integration_id);
CREATE INDEX idx_sync_logs_status ON integration_sync_logs(status);

-- Mapping records (track what's synced)
CREATE TABLE IF NOT EXISTS integration_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,

  -- Internal record
  entity_type VARCHAR(50) NOT NULL, -- CUSTOMER, PRODUCT, ORDER, INVOICE
  internal_id UUID NOT NULL,

  -- External record
  external_id VARCHAR(255) NOT NULL,
  external_data JSONB, -- Cache of external data

  -- Sync info
  last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_direction VARCHAR(20), -- TO_EXTERNAL, FROM_EXTERNAL, BIDIRECTIONAL

  UNIQUE(integration_id, entity_type, internal_id),
  UNIQUE(integration_id, entity_type, external_id)
);

CREATE INDEX idx_mappings_integration ON integration_mappings(integration_id);
CREATE INDEX idx_mappings_internal ON integration_mappings(entity_type, internal_id);
CREATE INDEX idx_mappings_external ON integration_mappings(external_id);

-- Webhook events
CREATE TABLE IF NOT EXISTS integration_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,

  -- Event
  event_type VARCHAR(100) NOT NULL, -- order/created, product/updated, etc.
  payload JSONB NOT NULL,

  -- Processing
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PROCESSED, FAILED
  processed_at TIMESTAMP,
  error_message TEXT,

  -- Request info
  ip_address INET,
  signature VARCHAR(255), -- For validation

  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_events_integration ON integration_webhook_events(integration_id);
CREATE INDEX idx_webhook_events_status ON integration_webhook_events(status);

-- ========================================
-- SHOPIFY SPECIFIC
-- ========================================

CREATE TABLE IF NOT EXISTS shopify_shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE UNIQUE,

  shop_domain VARCHAR(255) NOT NULL UNIQUE,
  shop_name VARCHAR(255),
  shop_email VARCHAR(255),

  -- Auth
  access_token TEXT NOT NULL,
  scopes TEXT[],

  -- Shop info
  currency VARCHAR(3),
  timezone VARCHAR(100),
  plan_name VARCHAR(100),

  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- WOOCOMMERCE SPECIFIC
-- ========================================

CREATE TABLE IF NOT EXISTS woocommerce_stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE UNIQUE,

  store_url TEXT NOT NULL,
  consumer_key TEXT NOT NULL,
  consumer_secret TEXT NOT NULL,

  wc_version VARCHAR(20),
  wp_version VARCHAR(20),

  connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 Connector Interface

```typescript
// api/src/services/integrations/connector.interface.ts
export interface IConnector {
  platform: string;

  // Authentication
  authenticate(credentials: any): Promise<boolean>;
  refreshAuth(): Promise<void>;

  // Sync operations
  syncCustomers(direction: 'import' | 'export' | 'bidirectional'): Promise<SyncResult>;
  syncProducts(direction: 'import' | 'export' | 'bidirectional'): Promise<SyncResult>;
  syncOrders(direction: 'import' | 'export' | 'bidirectional'): Promise<SyncResult>;

  // Webhooks
  setupWebhooks(): Promise<void>;
  handleWebhook(event: WebhookEvent): Promise<void>;

  // Health check
  testConnection(): Promise<boolean>;
}

export interface SyncResult {
  processed: number;
  created: number;
  updated: number;
  failed: number;
  errors: any[];
}

export interface WebhookEvent {
  type: string;
  data: any;
  timestamp: number;
}
```

---

## 🛍️ Shopify Connector

```typescript
// api/src/services/integrations/shopify.connector.ts
import Shopify from '@shopify/shopify-api';
import { IConnector, SyncResult } from './connector.interface';

export class ShopifyConnector implements IConnector {
  platform = 'SHOPIFY';
  private client: any;

  constructor(
    private integrationId: string,
    private shopDomain: string,
    private accessToken: string
  ) {
    this.client = new Shopify.Clients.Rest(shopDomain, accessToken);
  }

  async authenticate(credentials: any): Promise<boolean> {
    try {
      const shop = await this.client.get({ path: 'shop' });
      return !!shop.body.shop;
    } catch {
      return false;
    }
  }

  async syncCustomers(direction: 'import' | 'export'): Promise<SyncResult> {
    if (direction === 'import') {
      return await this.importCustomers();
    } else {
      return await this.exportCustomers();
    }
  }

  private async importCustomers(): Promise<SyncResult> {
    const result: SyncResult = { processed: 0, created: 0, updated: 0, failed: 0, errors: [] };

    let hasNextPage = true;
    let pageInfo = null;

    while (hasNextPage) {
      const response = await this.client.get({
        path: 'customers',
        query: { limit: 250, page_info: pageInfo }
      });

      const customers = response.body.customers;

      for (const shopifyCustomer of customers) {
        try {
          // Vérifier si déjà mappé
          const existing = await db.query(
            `SELECT internal_id FROM integration_mappings
             WHERE integration_id = $1 AND entity_type = 'CUSTOMER' AND external_id = $2`,
            [this.integrationId, shopifyCustomer.id.toString()]
          );

          if (existing.rows.length > 0) {
            // Update
            await this.updateCustomer(existing.rows[0].internal_id, shopifyCustomer);
            result.updated++;
          } else {
            // Create
            const customerId = await this.createCustomer(shopifyCustomer);

            // Create mapping
            await db.query(
              `INSERT INTO integration_mappings
               (integration_id, entity_type, internal_id, external_id, external_data)
               VALUES ($1, 'CUSTOMER', $2, $3, $4)`,
              [this.integrationId, customerId, shopifyCustomer.id.toString(), JSON.stringify(shopifyCustomer)]
            );

            result.created++;
          }

          result.processed++;
        } catch (error) {
          result.failed++;
          result.errors.push({ customer: shopifyCustomer.id, error: error.message });
        }
      }

      // Pagination
      hasNextPage = response.headers.link && response.headers.link.includes('rel="next"');
      if (hasNextPage) {
        pageInfo = this.extractPageInfo(response.headers.link);
      }
    }

    return result;
  }

  private async createCustomer(shopifyCustomer: any): Promise<string> {
    const result = await db.query(
      `INSERT INTO companies
       (organization_id, name, email, phone, address, city, country, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id`,
      [
        await this.getOrganizationId(),
        `${shopifyCustomer.first_name} ${shopifyCustomer.last_name}`,
        shopifyCustomer.email,
        shopifyCustomer.phone,
        shopifyCustomer.default_address?.address1,
        shopifyCustomer.default_address?.city,
        shopifyCustomer.default_address?.country
      ]
    );

    return result.rows[0].id;
  }

  private async updateCustomer(customerId: string, shopifyCustomer: any): Promise<void> {
    await db.query(
      `UPDATE companies
       SET name = $1, email = $2, phone = $3, updated_at = NOW()
       WHERE id = $4`,
      [
        `${shopifyCustomer.first_name} ${shopifyCustomer.last_name}`,
        shopifyCustomer.email,
        shopifyCustomer.phone,
        customerId
      ]
    );
  }

  async syncProducts(direction: 'import' | 'export'): Promise<SyncResult> {
    const result: SyncResult = { processed: 0, created: 0, updated: 0, failed: 0, errors: [] };

    const response = await this.client.get({
      path: 'products',
      query: { limit: 250 }
    });

    for (const product of response.body.products) {
      try {
        const existing = await db.query(
          `SELECT internal_id FROM integration_mappings
           WHERE integration_id = $1 AND entity_type = 'PRODUCT' AND external_id = $2`,
          [this.integrationId, product.id.toString()]
        );

        if (existing.rows.length > 0) {
          await this.updateProduct(existing.rows[0].internal_id, product);
          result.updated++;
        } else {
          const productId = await this.createProduct(product);

          await db.query(
            `INSERT INTO integration_mappings
             (integration_id, entity_type, internal_id, external_id, external_data)
             VALUES ($1, 'PRODUCT', $2, $3, $4)`,
            [this.integrationId, productId, product.id.toString(), JSON.stringify(product)]
          );

          result.created++;
        }

        result.processed++;
      } catch (error) {
        result.failed++;
        result.errors.push({ product: product.id, error: error.message });
      }
    }

    return result;
  }

  private async createProduct(shopifyProduct: any): Promise<string> {
    const result = await db.query(
      `INSERT INTO products
       (organization_id, name, description, price, sku, stock_quantity, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id`,
      [
        await this.getOrganizationId(),
        shopifyProduct.title,
        shopifyProduct.body_html,
        shopifyProduct.variants[0]?.price || 0,
        shopifyProduct.variants[0]?.sku,
        shopifyProduct.variants[0]?.inventory_quantity || 0
      ]
    );

    return result.rows[0].id;
  }

  async syncOrders(direction: 'import'): Promise<SyncResult> {
    const result: SyncResult = { processed: 0, created: 0, updated: 0, failed: 0, errors: [] };

    const response = await this.client.get({
      path: 'orders',
      query: { status: 'any', limit: 250 }
    });

    for (const order of response.body.orders) {
      try {
        // Créer une facture depuis la commande
        const invoiceId = await this.createInvoiceFromOrder(order);

        await db.query(
          `INSERT INTO integration_mappings
           (integration_id, entity_type, internal_id, external_id, external_data)
           VALUES ($1, 'ORDER', $2, $3, $4)`,
          [this.integrationId, invoiceId, order.id.toString(), JSON.stringify(order)]
        );

        result.created++;
        result.processed++;
      } catch (error) {
        result.failed++;
        result.errors.push({ order: order.id, error: error.message });
      }
    }

    return result;
  }

  async setupWebhooks(): Promise<void> {
    const webhookTopics = [
      'orders/create',
      'orders/updated',
      'customers/create',
      'customers/update',
      'products/create',
      'products/update'
    ];

    const callbackUrl = `${process.env.APP_URL}/api/webhooks/shopify/${this.integrationId}`;

    for (const topic of webhookTopics) {
      await this.client.post({
        path: 'webhooks',
        data: {
          webhook: {
            topic,
            address: callbackUrl,
            format: 'json'
          }
        }
      });
    }
  }

  async handleWebhook(event: WebhookEvent): Promise<void> {
    switch (event.type) {
      case 'orders/create':
        await this.createInvoiceFromOrder(event.data);
        break;
      case 'customers/create':
        await this.createCustomer(event.data);
        break;
      case 'products/create':
        await this.createProduct(event.data);
        break;
      // ... autres cas
    }
  }

  async testConnection(): Promise<boolean> {
    return await this.authenticate({});
  }

  private async getOrganizationId(): Promise<string> {
    const result = await db.query(
      'SELECT organization_id FROM integrations WHERE id = $1',
      [this.integrationId]
    );
    return result.rows[0].organization_id;
  }

  private extractPageInfo(linkHeader: string): string {
    const match = linkHeader.match(/page_info=([^&>]+)/);
    return match ? match[1] : null;
  }

  private async createInvoiceFromOrder(order: any): Promise<string> {
    // Implementation...
    return ''; // placeholder
  }

  private async updateProduct(productId: string, product: any): Promise<void> {
    // Implementation...
  }
}
```

---

## 🔄 WooCommerce Connector

```typescript
// api/src/services/integrations/woocommerce.connector.ts
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

export class WooCommerceConnector implements IConnector {
  platform = 'WOOCOMMERCE';
  private client: WooCommerceRestApi;

  constructor(
    private integrationId: string,
    private storeUrl: string,
    private consumerKey: string,
    private consumerSecret: string
  ) {
    this.client = new WooCommerceRestApi({
      url: storeUrl,
      consumerKey,
      consumerSecret,
      version: 'wc/v3'
    });
  }

  async authenticate(): Promise<boolean> {
    try {
      const response = await this.client.get('system_status');
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async syncProducts(direction: 'import'): Promise<SyncResult> {
    const result: SyncResult = { processed: 0, created: 0, updated: 0, failed: 0, errors: [] };

    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.client.get('products', {
        per_page: 100,
        page
      });

      const products = response.data;

      for (const product of products) {
        try {
          const existing = await db.query(
            `SELECT internal_id FROM integration_mappings
             WHERE integration_id = $1 AND entity_type = 'PRODUCT' AND external_id = $2`,
            [this.integrationId, product.id.toString()]
          );

          if (existing.rows.length > 0) {
            // Update existing
            await this.updateProduct(existing.rows[0].internal_id, product);
            result.updated++;
          } else {
            // Create new
            const productId = await this.createProduct(product);

            await db.query(
              `INSERT INTO integration_mappings
               (integration_id, entity_type, internal_id, external_id)
               VALUES ($1, 'PRODUCT', $2, $3)`,
              [this.integrationId, productId, product.id.toString()]
            );

            result.created++;
          }

          result.processed++;
        } catch (error) {
          result.failed++;
          result.errors.push({ product: product.id, error: error.message });
        }
      }

      hasMore = products.length === 100;
      page++;
    }

    return result;
  }

  // Similar methods for customers, orders...
  async syncCustomers(direction: string): Promise<SyncResult> { /* ... */ return {} as SyncResult; }
  async syncOrders(direction: string): Promise<SyncResult> { /* ... */ return {} as SyncResult; }
  async setupWebhooks(): Promise<void> { /* ... */ }
  async handleWebhook(event: WebhookEvent): Promise<void> { /* ... */ }
  async testConnection(): Promise<boolean> { return await this.authenticate(); }
  async refreshAuth(): Promise<void> { /* ... */ }

  private async createProduct(wcProduct: any): Promise<string> {
    const result = await db.query(
      `INSERT INTO products (organization_id, name, description, price, sku, stock_quantity)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        await this.getOrganizationId(),
        wcProduct.name,
        wcProduct.description,
        wcProduct.price,
        wcProduct.sku,
        wcProduct.stock_quantity
      ]
    );
    return result.rows[0].id;
  }

  private async updateProduct(productId: string, wcProduct: any): Promise<void> {
    await db.query(
      `UPDATE products SET name = $1, description = $2, price = $3, sku = $4, stock_quantity = $5, updated_at = NOW()
       WHERE id = $6`,
      [wcProduct.name, wcProduct.description, wcProduct.price, wcProduct.sku, wcProduct.stock_quantity, productId]
    );
  }

  private async getOrganizationId(): Promise<string> {
    const result = await db.query('SELECT organization_id FROM integrations WHERE id = $1', [this.integrationId]);
    return result.rows[0].organization_id;
  }
}
```

---

## 📦 Dépendances

```json
{
  "dependencies": {
    "@shopify/shopify-api": "^7.5.0",
    "@woocommerce/woocommerce-rest-api": "^1.0.1",
    "prestashop-api-client": "^1.0.0"
  }
}
```

---

## ✅ Checklist

- [ ] Shopify connector
- [ ] WooCommerce connector
- [ ] PrestaShop connector
- [ ] OAuth flows
- [ ] Webhook handlers
- [ ] Sync engine
- [ ] Mapping system
- [ ] Error handling
- [ ] Rate limiting
- [ ] UI for managing integrations

## 🎯 KPIs

- ✅ Sync success rate > 98%
- ✅ Webhook processing < 1s
- ✅ Zero data loss
