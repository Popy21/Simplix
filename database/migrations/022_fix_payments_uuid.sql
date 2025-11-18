-- Migration: Fix payments table to use UUID
-- This fixes the INTEGER/UUID conflict that breaks the payments module

-- Step 1: Drop existing payments table and related constraints
DROP TABLE IF EXISTS payments CASCADE;

-- Step 2: Recreate payments table with UUID
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('card', 'apple_pay', 'google_pay', 'bank_transfer', 'cash', 'check', 'stripe', 'paypal', 'other')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  reference VARCHAR(255),
  transaction_id VARCHAR(255),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at);

-- Step 4: Create trigger for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Grant permissions
GRANT ALL PRIVILEGES ON payments TO postgres;

-- Step 6: Add some initial test data
INSERT INTO payments (invoice_id, organization_id, amount, payment_method, status, created_by)
SELECT
  i.id,
  '00000000-0000-0000-0000-000000000001'::uuid,
  i.total_amount,
  'stripe',
  'completed',
  (SELECT id FROM users WHERE email = 'admin@admin.com' LIMIT 1)
FROM invoices i
WHERE i.status = 'paid'
LIMIT 5;

COMMENT ON TABLE payments IS 'Payment transactions linked to invoices with Stripe integration';
COMMENT ON COLUMN payments.stripe_payment_intent_id IS 'Stripe PaymentIntent ID for tracking';
COMMENT ON COLUMN payments.stripe_charge_id IS 'Stripe Charge ID after successful payment';
