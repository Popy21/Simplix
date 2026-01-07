-- Migration 028: Ajout SIRET/TVA aux entreprises clientes
-- Description: Champs obligatoires pour la facturation B2B en France
-- Author: Claude Code
-- Date: 2025-01-06

-- ============================================================================
-- AJOUT DES CHAMPS SIRET/TVA AUX ENTREPRISES
-- ============================================================================

-- Champs pour la conformité française B2B
ALTER TABLE companies ADD COLUMN IF NOT EXISTS siret VARCHAR(14);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tva_number VARCHAR(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_professional BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15, 2);

-- Adresses séparées facturation/livraison
ALTER TABLE companies ADD COLUMN IF NOT EXISTS billing_address JSONB;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS shipping_address JSONB;

-- Code APE/NAF (optionnel mais utile)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ape_code VARCHAR(10);

-- Commentaires
COMMENT ON COLUMN companies.siret IS 'Numéro SIRET (14 chiffres) - obligatoire pour facturation B2B';
COMMENT ON COLUMN companies.tva_number IS 'Numéro de TVA intracommunautaire (ex: FR12345678901)';
COMMENT ON COLUMN companies.is_professional IS 'Client professionnel (B2B) ou particulier (B2C)';
COMMENT ON COLUMN companies.payment_terms_days IS 'Délai de paiement en jours (défaut 30)';
COMMENT ON COLUMN companies.credit_limit IS 'Plafond de crédit autorisé';
COMMENT ON COLUMN companies.billing_address IS 'Adresse de facturation (si différente)';
COMMENT ON COLUMN companies.shipping_address IS 'Adresse de livraison (si différente)';
COMMENT ON COLUMN companies.ape_code IS 'Code APE/NAF de l''activité';

-- Index pour recherche par SIRET
CREATE INDEX IF NOT EXISTS idx_companies_siret ON companies(siret) WHERE siret IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_tva ON companies(tva_number) WHERE tva_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_professional ON companies(is_professional);

-- ============================================================================
-- AJOUT DES MÊMES CHAMPS À LA TABLE CUSTOMERS (legacy)
-- ============================================================================

-- Vérifier si la table customers existe avant d'ajouter les colonnes
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'customers') THEN
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS siret VARCHAR(14);
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS tva_number VARCHAR(20);
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_professional BOOLEAN DEFAULT false;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address TEXT;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS shipping_address TEXT;
    END IF;
END $$;

-- ============================================================================
-- VALIDATION DU FORMAT SIRET (trigger optionnel)
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_siret()
RETURNS TRIGGER AS $$
BEGIN
    -- Si SIRET fourni, vérifier qu'il fait 14 caractères numériques
    IF NEW.siret IS NOT NULL AND NEW.siret != '' THEN
        IF NOT (NEW.siret ~ '^[0-9]{14}$') THEN
            RAISE EXCEPTION 'Le SIRET doit contenir exactement 14 chiffres';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur companies
DROP TRIGGER IF EXISTS trigger_validate_company_siret ON companies;
CREATE TRIGGER trigger_validate_company_siret
    BEFORE INSERT OR UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION validate_siret();

-- ============================================================================
-- VALIDATION DU FORMAT TVA INTRACOMMUNAUTAIRE
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_tva_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Si TVA fourni, vérifier le format (2 lettres + chiffres)
    IF NEW.tva_number IS NOT NULL AND NEW.tva_number != '' THEN
        IF NOT (NEW.tva_number ~ '^[A-Z]{2}[0-9A-Z]{2,13}$') THEN
            RAISE EXCEPTION 'Le numéro de TVA doit commencer par 2 lettres de pays suivies de chiffres (ex: FR12345678901)';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur companies
DROP TRIGGER IF EXISTS trigger_validate_company_tva ON companies;
CREATE TRIGGER trigger_validate_company_tva
    BEFORE INSERT OR UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION validate_tva_number();
