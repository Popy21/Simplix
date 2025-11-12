# 💰 MODULE COMPTABILITÉ & TRÉSORERIE

## 🎯 Objectif
Créer un module complet de comptabilité et gestion de trésorerie pour permettre aux utilisateurs de gérer leurs finances sans logiciel externe, avec rapprochement bancaire, prévisions de trésorerie et exports comptables.

---

## 📋 Fonctionnalités principales

### 1. **Comptabilité générale**
- Plan comptable configurable (défaut: PCG français)
- Écritures comptables automatiques
- Grand livre
- Balance comptable
- Compte de résultat
- Bilan comptable

### 2. **Rapprochement bancaire**
- Import relevés bancaires (CSV, OFX, QIF)
- Matching automatique avec écritures
- Règles de rapprochement
- Validation manuelle

### 3. **Trésorerie**
- Prévisions de trésorerie multi-scénarios
- Budget vs Réalisé
- Tableau de flux de trésorerie
- Alertes de trésorerie négative
- Visualisation graphique

### 4. **Exports comptables**
- Format FEC (Fichier des Écritures Comptables)
- Format CSV personnalisable
- Export vers Cegid, Sage, EBP, Pennylane
- API pour intégration directe

### 5. **Portail expert-comptable**
- Accès en lecture seule pour l'expert-comptable
- Export mensuel/trimestriel automatique
- Commentaires et validation
- Génération liasse fiscale

---

## 🏗️ Architecture technique

### Stack technologique
```
Backend:
├── Plan comptable: PostgreSQL avec table accounts
├── Écritures: Double-entry bookkeeping
├── Import bancaire: csv-parse, ofx-parser
├── Matching: Algorithme de similarité (Levenshtein)
├── Prévisions: Calculs basés sur historique + ajustements manuels
└── Export FEC: Génération fichier texte selon norme DGFiP

Frontend:
├── Tableaux de bord trésorerie: Charts.js / Victory Native
├── Import/Export fichiers: react-native-document-picker
└── Rapprochement bancaire: Interface drag & drop
```

---

## 🗄️ Schéma de base de données

```sql
-- ========================================
-- COMPTABILITÉ
-- ========================================

-- Plan comptable
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  account_number VARCHAR(20) NOT NULL, -- Ex: 411000
  account_name VARCHAR(255) NOT NULL, -- Ex: Clients
  account_type VARCHAR(50) NOT NULL, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  parent_account_id UUID REFERENCES chart_of_accounts(id),
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false, -- Comptes système non modifiables
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, account_number)
);

CREATE INDEX idx_coa_org ON chart_of_accounts(organization_id);
CREATE INDEX idx_coa_number ON chart_of_accounts(account_number);
CREATE INDEX idx_coa_type ON chart_of_accounts(account_type);

-- Écritures comptables (double entry)
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  entry_number VARCHAR(50) UNIQUE NOT NULL, -- Auto-incrémenté: JE-2025-0001
  entry_date DATE NOT NULL,
  description TEXT,
  reference VARCHAR(100), -- Référence document (invoice_number, etc.)
  reference_type VARCHAR(50), -- INVOICE, PAYMENT, EXPENSE, MANUAL, etc.
  reference_id UUID, -- ID du document source
  status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, POSTED, REVERSED
  posted_at TIMESTAMP,
  posted_by UUID REFERENCES users(id),
  reversed_at TIMESTAMP,
  reversed_by UUID REFERENCES users(id),
  reversal_entry_id UUID REFERENCES journal_entries(id),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_je_org ON journal_entries(organization_id);
CREATE INDEX idx_je_date ON journal_entries(entry_date);
CREATE INDEX idx_je_status ON journal_entries(status);
CREATE INDEX idx_je_reference ON journal_entries(reference_type, reference_id);

-- Lignes d'écritures (détail débit/crédit)
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID REFERENCES chart_of_accounts(id),
  description TEXT,
  debit DECIMAL(15, 2) DEFAULT 0,
  credit DECIMAL(15, 2) DEFAULT 0,
  line_number INTEGER, -- Ordre des lignes
  tax_code VARCHAR(20),
  tax_amount DECIMAL(15, 2),
  analytic_code VARCHAR(50), -- Code analytique optionnel
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_debit_or_credit CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0)
  )
);

CREATE INDEX idx_jel_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_jel_account ON journal_entry_lines(account_id);

-- Validation: Total débit = Total crédit
CREATE OR REPLACE FUNCTION validate_journal_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
  total_debit DECIMAL(15, 2);
  total_credit DECIMAL(15, 2);
BEGIN
  SELECT SUM(debit), SUM(credit) INTO total_debit, total_credit
  FROM journal_entry_lines
  WHERE journal_entry_id = NEW.journal_entry_id;

  IF total_debit != total_credit THEN
    RAISE EXCEPTION 'Journal entry not balanced: debit=%, credit=%', total_debit, total_credit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_je_balance
AFTER INSERT OR UPDATE ON journal_entry_lines
FOR EACH ROW
EXECUTE FUNCTION validate_journal_entry_balance();

-- ========================================
-- BANQUE & TRÉSORERIE
-- ========================================

-- Comptes bancaires
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  account_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50),
  iban VARCHAR(34),
  bic VARCHAR(11),
  bank_name VARCHAR(255),
  currency VARCHAR(3) DEFAULT 'EUR',
  opening_balance DECIMAL(15, 2) DEFAULT 0,
  current_balance DECIMAL(15, 2) DEFAULT 0,
  chart_account_id UUID REFERENCES chart_of_accounts(id), -- Lien avec compte 512xxx
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bank_accounts_org ON bank_accounts(organization_id);

-- Transactions bancaires importées
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  value_date DATE,
  description TEXT,
  reference VARCHAR(100),
  amount DECIMAL(15, 2) NOT NULL, -- Négatif = débit, Positif = crédit
  balance_after DECIMAL(15, 2),
  category VARCHAR(100),
  imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  import_batch_id UUID, -- Pour grouper les imports
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_with_id UUID REFERENCES journal_entries(id),
  reconciled_at TIMESTAMP,
  reconciled_by UUID REFERENCES users(id),
  notes TEXT,
  raw_data JSONB, -- Données brutes du fichier importé
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bank_trans_account ON bank_transactions(bank_account_id);
CREATE INDEX idx_bank_trans_date ON bank_transactions(transaction_date);
CREATE INDEX idx_bank_trans_reconciled ON bank_transactions(is_reconciled);

-- Règles de rapprochement automatique
CREATE TABLE IF NOT EXISTS reconciliation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  match_type VARCHAR(50) NOT NULL, -- CONTAINS, EXACT, STARTS_WITH, REGEX
  match_pattern VARCHAR(255) NOT NULL, -- Ex: "STRIPE", "PAYPAL", etc.
  account_id UUID REFERENCES chart_of_accounts(id),
  category VARCHAR(100),
  auto_reconcile BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0, -- Ordre d'application
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recon_rules_org ON reconciliation_rules(organization_id);

-- ========================================
-- TRÉSORERIE & PRÉVISIONS
-- ========================================

-- Scénarios de trésorerie
CREATE TABLE IF NOT EXISTS cash_flow_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, -- "Optimiste", "Pessimiste", "Réaliste"
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  assumptions JSONB, -- Hypothèses du scénario
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prévisions de trésorerie
CREATE TABLE IF NOT EXISTS cash_flow_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES cash_flow_scenarios(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type VARCHAR(20) DEFAULT 'MONTH', -- WEEK, MONTH, QUARTER

  -- Encaissements prévus
  expected_revenue DECIMAL(15, 2) DEFAULT 0,
  expected_payments_received DECIMAL(15, 2) DEFAULT 0,
  other_income DECIMAL(15, 2) DEFAULT 0,

  -- Décaissements prévus
  expected_expenses DECIMAL(15, 2) DEFAULT 0,
  expected_payments_made DECIMAL(15, 2) DEFAULT 0,
  payroll DECIMAL(15, 2) DEFAULT 0,
  taxes DECIMAL(15, 2) DEFAULT 0,
  other_expenses DECIMAL(15, 2) DEFAULT 0,

  -- Soldes
  opening_balance DECIMAL(15, 2) DEFAULT 0,
  net_cash_flow DECIMAL(15, 2) GENERATED ALWAYS AS (
    expected_revenue + expected_payments_received + other_income -
    expected_expenses - expected_payments_made - payroll - taxes - other_expenses
  ) STORED,
  closing_balance DECIMAL(15, 2) GENERATED ALWAYS AS (
    opening_balance +
    expected_revenue + expected_payments_received + other_income -
    expected_expenses - expected_payments_made - payroll - taxes - other_expenses
  ) STORED,

  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, scenario_id, period_start)
);

CREATE INDEX idx_cf_forecasts_org ON cash_flow_forecasts(organization_id);
CREATE INDEX idx_cf_forecasts_period ON cash_flow_forecasts(period_start, period_end);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  fiscal_year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, ACTIVE, CLOSED
  total_budget DECIMAL(15, 2),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lignes budgétaires (par compte comptable)
CREATE TABLE IF NOT EXISTS budget_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  account_id UUID REFERENCES chart_of_accounts(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  budgeted_amount DECIMAL(15, 2) NOT NULL,
  actual_amount DECIMAL(15, 2) DEFAULT 0,
  variance DECIMAL(15, 2) GENERATED ALWAYS AS (actual_amount - budgeted_amount) STORED,
  variance_percent DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN budgeted_amount != 0 THEN ((actual_amount - budgeted_amount) / budgeted_amount * 100) ELSE 0 END
  ) STORED,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_budget_lines_budget ON budget_lines(budget_id);
CREATE INDEX idx_budget_lines_account ON budget_lines(account_id);

-- ========================================
-- EXPORTS COMPTABLES
-- ========================================

-- Historique des exports
CREATE TABLE IF NOT EXISTS accounting_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  export_type VARCHAR(50) NOT NULL, -- FEC, CSV, SAGE, CEGID, PENNYLANE
  export_format VARCHAR(50),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  file_name VARCHAR(255),
  file_path VARCHAR(500),
  file_size INTEGER,
  entry_count INTEGER,
  exported_by UUID REFERENCES users(id),
  exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP,
  notes TEXT
);

CREATE INDEX idx_exports_org ON accounting_exports(organization_id);
CREATE INDEX idx_exports_date ON accounting_exports(exported_at);

-- ========================================
-- PORTAIL EXPERT-COMPTABLE
-- ========================================

-- Accès expert-comptable
CREATE TABLE IF NOT EXISTS accountant_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  accountant_email VARCHAR(255) NOT NULL,
  accountant_name VARCHAR(255),
  accountant_firm VARCHAR(255),
  access_token VARCHAR(255) UNIQUE,
  access_granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  access_expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{"read_entries": true, "read_reports": true, "export": true, "comment": true}',
  last_access_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Commentaires de l'expert-comptable
CREATE TABLE IF NOT EXISTS accountant_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  accountant_id UUID REFERENCES accountant_access(id),
  reference_type VARCHAR(50), -- JOURNAL_ENTRY, PERIOD, GENERAL
  reference_id UUID,
  comment TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, RESOLVED
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔧 Services Backend

### 1. **Service d'écritures comptables**
```typescript
// api/src/services/accounting/journal-entry.service.ts
import { db } from '../../database/db';
import { v4 as uuidv4 } from 'uuid';

interface JournalEntryLine {
  accountId: string;
  description: string;
  debit: number;
  credit: number;
  taxCode?: string;
  taxAmount?: number;
}

interface CreateJournalEntryInput {
  organizationId: string;
  entryDate: Date;
  description: string;
  referenceType?: string;
  referenceId?: string;
  reference?: string;
  lines: JournalEntryLine[];
  userId: string;
}

export class JournalEntryService {
  async createEntry(input: CreateJournalEntryInput): Promise<string> {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Vérifier que la balance est équilibrée
      const totalDebit = input.lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = input.lines.reduce((sum, line) => sum + line.credit, 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Entry not balanced: debit=${totalDebit}, credit=${totalCredit}`);
      }

      // Générer le numéro d'écriture
      const entryNumber = await this.generateEntryNumber(input.organizationId, input.entryDate);

      // Créer l'écriture
      const entryResult = await client.query(
        `INSERT INTO journal_entries
         (id, organization_id, entry_number, entry_date, description, reference_type, reference_id, reference, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DRAFT', $9)
         RETURNING id`,
        [
          uuidv4(),
          input.organizationId,
          entryNumber,
          input.entryDate,
          input.description,
          input.referenceType,
          input.referenceId,
          input.reference,
          input.userId
        ]
      );

      const entryId = entryResult.rows[0].id;

      // Créer les lignes
      for (let i = 0; i < input.lines.length; i++) {
        const line = input.lines[i];
        await client.query(
          `INSERT INTO journal_entry_lines
           (id, journal_entry_id, account_id, description, debit, credit, line_number, tax_code, tax_amount)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            uuidv4(),
            entryId,
            line.accountId,
            line.description,
            line.debit,
            line.credit,
            i + 1,
            line.taxCode,
            line.taxAmount
          ]
        );
      }

      await client.query('COMMIT');
      return entryId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async postEntry(entryId: string, userId: string): Promise<void> {
    await db.query(
      `UPDATE journal_entries
       SET status = 'POSTED', posted_at = NOW(), posted_by = $1
       WHERE id = $2 AND status = 'DRAFT'`,
      [userId, entryId]
    );
  }

  async reverseEntry(entryId: string, userId: string, reason: string): Promise<string> {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Récupérer l'écriture originale
      const original = await client.query(
        'SELECT * FROM journal_entries WHERE id = $1 AND status = \'POSTED\'',
        [entryId]
      );

      if (original.rows.length === 0) {
        throw new Error('Entry not found or not posted');
      }

      // Récupérer les lignes
      const lines = await client.query(
        'SELECT * FROM journal_entry_lines WHERE journal_entry_id = $1 ORDER BY line_number',
        [entryId]
      );

      // Créer l'écriture d'extourne (inverser débit/crédit)
      const reversalLines = lines.rows.map(line => ({
        accountId: line.account_id,
        description: `EXTOURNE: ${line.description}`,
        debit: line.credit, // Inverser
        credit: line.debit, // Inverser
        taxCode: line.tax_code,
        taxAmount: line.tax_amount ? -line.tax_amount : null
      }));

      const reversalId = await this.createEntry({
        organizationId: original.rows[0].organization_id,
        entryDate: new Date(),
        description: `EXTOURNE: ${original.rows[0].description} - ${reason}`,
        referenceType: 'REVERSAL',
        referenceId: entryId,
        lines: reversalLines,
        userId
      });

      // Marquer l'écriture originale comme extournée
      await client.query(
        `UPDATE journal_entries
         SET reversed_at = NOW(), reversed_by = $1, reversal_entry_id = $2
         WHERE id = $3`,
        [userId, reversalId, entryId]
      );

      // Poster automatiquement l'extourne
      await this.postEntry(reversalId, userId);

      await client.query('COMMIT');
      return reversalId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async generateEntryNumber(organizationId: string, date: Date): Promise<string> {
    const year = date.getFullYear();
    const result = await db.query(
      `SELECT COUNT(*) as count
       FROM journal_entries
       WHERE organization_id = $1 AND EXTRACT(YEAR FROM entry_date) = $2`,
      [organizationId, year]
    );

    const count = parseInt(result.rows[0].count) + 1;
    return `JE-${year}-${count.toString().padStart(4, '0')}`;
  }

  // Génération automatique d'écritures depuis factures
  async createEntryFromInvoice(invoiceId: string, userId: string): Promise<string> {
    const invoice = await db.query(
      `SELECT i.*, c.name as customer_name, o.id as organization_id
       FROM invoices i
       JOIN companies c ON i.customer_id = c.id
       JOIN organizations o ON i.organization_id = o.id
       WHERE i.id = $1`,
      [invoiceId]
    );

    if (invoice.rows.length === 0) {
      throw new Error('Invoice not found');
    }

    const inv = invoice.rows[0];

    // Récupérer les comptes configurés
    const accounts = await this.getDefaultAccounts(inv.organization_id);

    const lines: JournalEntryLine[] = [
      {
        accountId: accounts.receivable, // 411000 - Clients
        description: `Facture ${inv.invoice_number} - ${inv.customer_name}`,
        debit: inv.total_amount,
        credit: 0
      },
      {
        accountId: accounts.sales, // 707000 - Ventes
        description: `Facture ${inv.invoice_number}`,
        debit: 0,
        credit: inv.subtotal
      },
      {
        accountId: accounts.taxCollected, // 445710 - TVA collectée
        description: `TVA Facture ${inv.invoice_number}`,
        debit: 0,
        credit: inv.tax_amount
      }
    ];

    return await this.createEntry({
      organizationId: inv.organization_id,
      entryDate: new Date(inv.issue_date),
      description: `Facture ${inv.invoice_number} - ${inv.customer_name}`,
      referenceType: 'INVOICE',
      referenceId: invoiceId,
      reference: inv.invoice_number,
      lines,
      userId
    });
  }

  private async getDefaultAccounts(organizationId: string) {
    const result = await db.query(
      `SELECT account_number, id FROM chart_of_accounts
       WHERE organization_id = $1 AND account_number IN ('411000', '707000', '445710')`,
      [organizationId]
    );

    return {
      receivable: result.rows.find(r => r.account_number === '411000')?.id,
      sales: result.rows.find(r => r.account_number === '707000')?.id,
      taxCollected: result.rows.find(r => r.account_number === '445710')?.id
    };
  }
}
```

### 2. **Service de rapprochement bancaire**
```typescript
// api/src/services/accounting/bank-reconciliation.service.ts
import Fuse from 'fuse.js';
import { db } from '../../database/db';

export class BankReconciliationService {
  async importBankStatement(
    bankAccountId: string,
    file: Buffer,
    format: 'CSV' | 'OFX' | 'QIF'
  ): Promise<number> {
    let transactions;

    switch (format) {
      case 'CSV':
        transactions = await this.parseCSV(file);
        break;
      case 'OFX':
        transactions = await this.parseOFX(file);
        break;
      case 'QIF':
        transactions = await this.parseQIF(file);
        break;
    }

    const batchId = uuidv4();
    let importedCount = 0;

    for (const trans of transactions) {
      await db.query(
        `INSERT INTO bank_transactions
         (id, bank_account_id, transaction_date, description, amount, balance_after, import_batch_id, raw_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [
          uuidv4(),
          bankAccountId,
          trans.date,
          trans.description,
          trans.amount,
          trans.balance,
          batchId,
          JSON.stringify(trans.raw)
        ]
      );
      importedCount++;
    }

    // Lancer le matching automatique
    await this.autoMatch(bankAccountId, batchId);

    return importedCount;
  }

  private async parseCSV(buffer: Buffer): Promise<any[]> {
    const csv = require('csv-parse/sync');
    const content = buffer.toString('utf-8');
    const records = csv.parse(content, {
      columns: true,
      skip_empty_lines: true
    });

    return records.map(r => ({
      date: new Date(r.Date || r.date),
      description: r.Description || r.description || r.Label,
      amount: parseFloat(r.Amount || r.amount || r.Montant),
      balance: parseFloat(r.Balance || r.balance || r.Solde),
      raw: r
    }));
  }

  async autoMatch(bankAccountId: string, batchId?: string): Promise<void> {
    // Récupérer les transactions non rapprochées
    const query = batchId
      ? 'SELECT * FROM bank_transactions WHERE bank_account_id = $1 AND import_batch_id = $2 AND is_reconciled = false'
      : 'SELECT * FROM bank_transactions WHERE bank_account_id = $1 AND is_reconciled = false';

    const params = batchId ? [bankAccountId, batchId] : [bankAccountId];
    const transactions = await db.query(query, params);

    // Récupérer les écritures non rapprochées
    const entries = await db.query(
      `SELECT je.*, jel.debit, jel.credit, jel.description as line_description
       FROM journal_entries je
       JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
       WHERE je.organization_id = (SELECT organization_id FROM bank_accounts WHERE id = $1)
         AND je.status = 'POSTED'
         AND je.id NOT IN (SELECT reconciled_with_id FROM bank_transactions WHERE reconciled_with_id IS NOT NULL)`,
      [bankAccountId]
    );

    // Règles de matching
    const rules = await db.query(
      'SELECT * FROM reconciliation_rules WHERE organization_id = (SELECT organization_id FROM bank_accounts WHERE id = $1) AND is_active = true ORDER BY priority DESC',
      [bankAccountId]
    );

    for (const trans of transactions.rows) {
      // Essayer les règles
      for (const rule of rules.rows) {
        if (this.matchesRule(trans, rule)) {
          // Match trouvé via règle
          // Chercher l'écriture correspondante
          const matchingEntry = entries.rows.find(e =>
            Math.abs(e.debit - Math.abs(trans.amount)) < 0.01 ||
            Math.abs(e.credit - Math.abs(trans.amount)) < 0.01
          );

          if (matchingEntry && rule.auto_reconcile) {
            await this.reconcile(trans.id, matchingEntry.id, 'AUTO_RULE');
            break;
          }
        }
      }

      // Si pas de match par règle, essayer par montant exact + date proche
      if (!trans.is_reconciled) {
        const matchingEntry = entries.rows.find(e => {
          const amountMatch =
            Math.abs(e.debit - Math.abs(trans.amount)) < 0.01 ||
            Math.abs(e.credit - Math.abs(trans.amount)) < 0.01;

          const dateMatch =
            Math.abs(new Date(e.entry_date).getTime() - new Date(trans.transaction_date).getTime()) < 7 * 24 * 60 * 60 * 1000; // 7 jours

          return amountMatch && dateMatch;
        });

        if (matchingEntry) {
          await this.reconcile(trans.id, matchingEntry.id, 'AUTO_AMOUNT_DATE');
        }
      }
    }
  }

  private matchesRule(transaction: any, rule: any): boolean {
    const description = transaction.description.toLowerCase();
    const pattern = rule.match_pattern.toLowerCase();

    switch (rule.match_type) {
      case 'CONTAINS':
        return description.includes(pattern);
      case 'EXACT':
        return description === pattern;
      case 'STARTS_WITH':
        return description.startsWith(pattern);
      case 'REGEX':
        return new RegExp(pattern).test(description);
      default:
        return false;
    }
  }

  async reconcile(transactionId: string, entryId: string, method: string): Promise<void> {
    await db.query(
      `UPDATE bank_transactions
       SET is_reconciled = true, reconciled_with_id = $1, reconciled_at = NOW(), notes = $2
       WHERE id = $3`,
      [entryId, `Auto-matched via ${method}`, transactionId]
    );
  }

  async getSuggestions(transactionId: string): Promise<any[]> {
    const trans = await db.query(
      'SELECT * FROM bank_transactions WHERE id = $1',
      [transactionId]
    );

    if (trans.rows.length === 0) return [];

    const transaction = trans.rows[0];

    // Recherche fuzzy sur les écritures
    const entries = await db.query(
      `SELECT je.*, jel.debit, jel.credit, jel.description as line_description
       FROM journal_entries je
       JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
       WHERE je.organization_id = (SELECT organization_id FROM bank_accounts WHERE bank_account_id = $1)
         AND je.status = 'POSTED'
         AND ABS(jel.debit - $2) < 100 OR ABS(jel.credit - $2) < 100
       ORDER BY je.entry_date DESC
       LIMIT 50`,
      [transaction.bank_account_id, Math.abs(transaction.amount)]
    );

    // Calculer un score de similarité
    const fuse = new Fuse(entries.rows, {
      keys: ['description', 'line_description', 'reference'],
      threshold: 0.4
    });

    const results = fuse.search(transaction.description);

    return results.map(r => ({
      ...r.item,
      score: r.score,
      amountMatch: Math.abs(r.item.debit - Math.abs(transaction.amount)) < 0.01
    }));
  }
}
```

### 3. **Service de prévisions de trésorerie**
```typescript
// api/src/services/accounting/cash-flow-forecast.service.ts
export class CashFlowForecastService {
  async generateForecast(
    organizationId: string,
    scenarioId: string,
    startDate: Date,
    endDate: Date,
    periodType: 'WEEK' | 'MONTH' | 'QUARTER'
  ): Promise<void> {
    const periods = this.generatePeriods(startDate, endDate, periodType);

    for (const period of periods) {
      // Calculer les encaissements prévus
      const expectedRevenue = await this.calculateExpectedRevenue(
        organizationId,
        period.start,
        period.end
      );

      // Calculer les décaissements prévus
      const expectedExpenses = await this.calculateExpectedExpenses(
        organizationId,
        period.start,
        period.end
      );

      // Créer/mettre à jour la prévision
      await db.query(
        `INSERT INTO cash_flow_forecasts
         (organization_id, scenario_id, period_start, period_end, period_type,
          expected_revenue, expected_payments_received, expected_expenses, expected_payments_made,
          opening_balance)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (organization_id, scenario_id, period_start)
         DO UPDATE SET
           expected_revenue = EXCLUDED.expected_revenue,
           expected_payments_received = EXCLUDED.expected_payments_received,
           expected_expenses = EXCLUDED.expected_expenses,
           expected_payments_made = EXCLUDED.expected_payments_made,
           updated_at = NOW()`,
        [
          organizationId,
          scenarioId,
          period.start,
          period.end,
          periodType,
          expectedRevenue.total,
          expectedRevenue.paymentsReceived,
          expectedExpenses.total,
          expectedExpenses.paymentsMade,
          await this.getOpeningBalance(organizationId, period.start)
        ]
      );
    }
  }

  private async calculateExpectedRevenue(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{total: number, paymentsReceived: number}> {
    // Factures à échéance dans la période
    const invoices = await db.query(
      `SELECT SUM(amount_due) as total
       FROM invoices
       WHERE organization_id = $1
         AND due_date BETWEEN $2 AND $3
         AND status != 'PAID'`,
      [organizationId, startDate, endDate]
    );

    // Paiements déjà reçus dans la période
    const payments = await db.query(
      `SELECT SUM(amount) as total
       FROM payments
       WHERE organization_id = $1
         AND payment_date BETWEEN $2 AND $3`,
      [organizationId, startDate, endDate]
    );

    return {
      total: invoices.rows[0].total || 0,
      paymentsReceived: payments.rows[0].total || 0
    };
  }

  private async calculateExpectedExpenses(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{total: number, paymentsMade: number}> {
    // Dépenses prévues
    const expenses = await db.query(
      `SELECT SUM(amount) as total
       FROM expenses
       WHERE organization_id = $1
         AND expense_date BETWEEN $2 AND $3`,
      [organizationId, startDate, endDate]
    );

    return {
      total: expenses.rows[0].total || 0,
      paymentsMade: expenses.rows[0].total || 0
    };
  }

  private generatePeriods(startDate: Date, endDate: Date, type: string): any[] {
    const periods = [];
    let current = new Date(startDate);

    while (current < endDate) {
      let periodEnd = new Date(current);

      switch (type) {
        case 'WEEK':
          periodEnd.setDate(periodEnd.getDate() + 7);
          break;
        case 'MONTH':
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          break;
        case 'QUARTER':
          periodEnd.setMonth(periodEnd.getMonth() + 3);
          break;
      }

      if (periodEnd > endDate) periodEnd = endDate;

      periods.push({
        start: new Date(current),
        end: periodEnd
      });

      current = new Date(periodEnd);
      current.setDate(current.getDate() + 1);
    }

    return periods;
  }
}
```

### 4. **Service d'export FEC**
```typescript
// api/src/services/accounting/fec-export.service.ts
export class FECExportService {
  async generateFEC(
    organizationId: string,
    fiscalYear: number
  ): Promise<Buffer> {
    // Format FEC : fichier texte avec séparateur pipe |
    // Voir spécification technique DGFiP

    const startDate = new Date(fiscalYear, 0, 1);
    const endDate = new Date(fiscalYear, 11, 31);

    const entries = await db.query(
      `SELECT
         je.entry_number as JournalCode,
         je.entry_number as JournalLib,
         je.entry_number as EcritureNum,
         TO_CHAR(je.entry_date, 'YYYYMMDD') as EcritureDate,
         coa.account_number as CompteNum,
         coa.account_name as CompteLib,
         '' as CompAuxNum,
         '' as CompAuxLib,
         je.reference as PieceRef,
         TO_CHAR(je.entry_date, 'YYYYMMDD') as PieceDate,
         jel.description as EcritureLib,
         CASE WHEN jel.debit > 0 THEN REPLACE(jel.debit::text, '.', ',') ELSE '0,00' END as Debit,
         CASE WHEN jel.credit > 0 THEN REPLACE(jel.credit::text, '.', ',') ELSE '0,00' END as Credit,
         '' as EcritureLet,
         '' as DateLet,
         TO_CHAR(je.created_at, 'YYYYMMDD') as ValidDate,
         CASE WHEN jel.debit > 0 THEN REPLACE(jel.debit::text, '.', ',') ELSE REPLACE((-jel.credit)::text, '.', ',') END as Montantdevise,
         '' as Idevise
       FROM journal_entries je
       JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
       JOIN chart_of_accounts coa ON jel.account_id = coa.id
       WHERE je.organization_id = $1
         AND je.entry_date BETWEEN $2 AND $3
         AND je.status = 'POSTED'
       ORDER BY je.entry_date, je.entry_number, jel.line_number`,
      [organizationId, startDate, endDate]
    );

    // Construire le fichier FEC
    const header = 'JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|CompAuxNum|CompAuxLib|PieceRef|PieceDate|EcritureLib|Debit|Credit|EcritureLet|DateLet|ValidDate|Montantdevise|Idevise\n';

    const lines = entries.rows.map(row =>
      Object.values(row).join('|')
    ).join('\n');

    const content = header + lines;

    // Enregistrer l'export
    const filename = `FEC_${fiscalYear}_${organizationId}.txt`;
    const filepath = `./exports/${filename}`;

    await fs.writeFile(filepath, content, 'utf-8');

    await db.query(
      `INSERT INTO accounting_exports
       (organization_id, export_type, export_format, period_start, period_end, file_name, file_path, entry_count)
       VALUES ($1, 'FEC', 'TXT', $2, $3, $4, $5, $6)`,
      [organizationId, startDate, endDate, filename, filepath, entries.rows.length]
    );

    return Buffer.from(content, 'utf-8');
  }
}
```

---

## 📦 Dépendances

```json
{
  "dependencies": {
    "csv-parse": "^5.5.0",
    "ofx-parser": "^1.2.1",
    "fuse.js": "^7.0.0",
    "decimal.js": "^10.4.3"
  }
}
```

---

## ✅ Checklist d'implémentation

### Phase 1: Fondations (2 semaines)
- [ ] Créer schéma BDD complet
- [ ] Implémenter plan comptable par défaut (PCG)
- [ ] Service d'écritures comptables
- [ ] Validation équilibre débit/crédit
- [ ] Génération automatique depuis factures
- [ ] Tests unitaires

### Phase 2: Rapprochement bancaire (2 semaines)
- [ ] Import CSV/OFX/QIF
- [ ] Parsing et normalisation
- [ ] Règles de rapprochement
- [ ] Algorithme de matching automatique
- [ ] Interface de rapprochement manuel
- [ ] Tests avec vrais fichiers bancaires

### Phase 3: Trésorerie (2 semaines)
- [ ] Scénarios de trésorerie
- [ ] Calcul prévisions
- [ ] Budgets
- [ ] Graphiques et tableaux de bord
- [ ] Alertes trésorerie négative

### Phase 4: Exports (1 semaine)
- [ ] Export FEC (France)
- [ ] Export CSV personnalisable
- [ ] Connecteurs Sage/Cegid/Pennylane

### Phase 5: Portail comptable (1 semaine)
- [ ] Accès sécurisé expert-comptable
- [ ] Commentaires et validation
- [ ] Exports automatiques

---

## 🎯 KPIs

- ✅ Temps de génération d'écriture < 100ms
- ✅ Taux de rapprochement automatique > 70%
- ✅ Export FEC conforme DGFiP
- ✅ Prévisions de trésorerie à 90 jours
