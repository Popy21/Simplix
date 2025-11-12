# 💱 MULTI-DEVISES & MULTI-SOCIÉTÉS

## 🎯 Objectif
Support complet multi-devises avec taux de change automatiques et gestion multi-sociétés.

## 📋 Fonctionnalités

### 1. Multi-Devises
- Support 150+ devises
- Taux de change automatiques (API)
- Historique des taux
- Conversion automatique
- Factures multi-devises
- Reporting consolidé

### 2. Multi-Sociétés
- Gestion de plusieurs entités légales
- Comptabilité séparée
- Consolidation groupe
- Permissions par société
- Facturation inter-sociétés

## 🗄️ Schéma BDD

```sql
CREATE TABLE IF NOT EXISTS currencies (
  code VARCHAR(3) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10),
  decimal_places INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  from_currency VARCHAR(3) REFERENCES currencies(code),
  to_currency VARCHAR(3) REFERENCES currencies(code),
  rate DECIMAL(20, 10) NOT NULL,
  
  effective_date DATE NOT NULL,
  source VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(from_currency, to_currency, effective_date)
);

CREATE TABLE IF NOT EXISTS organization_currencies (
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  currency_code VARCHAR(3) REFERENCES currencies(code),
  is_default BOOLEAN DEFAULT false,
  
  PRIMARY KEY (organization_id, currency_code)
);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(20, 10) DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'EUR';

CREATE TABLE IF NOT EXISTS legal_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  entity_name VARCHAR(255) NOT NULL,
  legal_form VARCHAR(100),
  registration_number VARCHAR(100),
  tax_id VARCHAR(100),
  
  default_currency VARCHAR(3) DEFAULT 'EUR',
  
  address TEXT,
  city VARCHAR(255),
  country VARCHAR(255),
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Exchange Rate Service

```typescript
import axios from 'axios';

class ExchangeRateService {
  async updateRates(): Promise<void> {
    const response = await axios.get('https://api.exchangerate.host/latest?base=EUR');
    
    for (const [currency, rate] of Object.entries(response.data.rates)) {
      await db.query(
        `INSERT INTO exchange_rates (from_currency, to_currency, rate, effective_date, source)
         VALUES ('EUR', $1, $2, CURRENT_DATE, 'exchangerate.host')
         ON CONFLICT (from_currency, to_currency, effective_date)
         DO UPDATE SET rate = EXCLUDED.rate`,
        [currency, rate]
      );
    }
  }
  
  async convert(amount: number, from: string, to: string, date?: Date): Promise<number> {
    if (from === to) return amount;
    
    const rate = await db.query(
      `SELECT rate FROM exchange_rates
       WHERE from_currency = $1 AND to_currency = $2
         AND effective_date = COALESCE($3, CURRENT_DATE)
       ORDER BY effective_date DESC
       LIMIT 1`,
      [from, to, date]
    );
    
    if (!rate.rows[0]) throw new Error(`No exchange rate found for ${from} to ${to}`);
    
    return amount * rate.rows[0].rate;
  }
}
```

## ✅ Checklist
- [ ] Gestion devises
- [ ] API taux de change
- [ ] Conversion automatique
- [ ] Factures multi-devises
- [ ] Reporting consolidé
- [ ] Multi-sociétés
