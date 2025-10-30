-- Create company_profile table to store business information
CREATE TABLE IF NOT EXISTS company_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Informations légales obligatoires
  company_name VARCHAR(255) NOT NULL,
  company_legal_form VARCHAR(100), -- SARL, SAS, EURL, Auto-entrepreneur, etc.
  company_address TEXT NOT NULL,
  company_phone VARCHAR(50),
  company_email VARCHAR(255),
  company_siret VARCHAR(14) NOT NULL, -- 14 chiffres obligatoires
  company_tva VARCHAR(50), -- TVA intracommunautaire
  company_rcs VARCHAR(255), -- RCS + Ville
  company_capital VARCHAR(100), -- Capital social
  is_micro_entreprise BOOLEAN DEFAULT false,

  -- Coordonnées bancaires
  bank_iban VARCHAR(100),
  bank_bic VARCHAR(50),
  bank_name VARCHAR(255),

  -- Logo
  logo_url TEXT,

  -- Mentions légales par défaut
  late_payment_penalty TEXT DEFAULT 'En cas de retard de paiement, une pénalité de retard de 3 fois le taux d''intérêt légal (actuellement 10,52% pour l''année 2024) sera exigible le jour suivant la date de paiement figurant sur la facture. Cette pénalité est calculée sur le montant TTC de la somme restant due et court à compter de la date d''échéance du prix, sans qu''aucune mise en demeure préalable ne soit nécessaire.',
  recovery_indemnity TEXT DEFAULT 'En sus des pénalités de retard, toute somme non payée à sa date d''exigibilité produira de plein droit le paiement d''une indemnité forfaitaire de 40 euros due au titre des frais de recouvrement (Art. L441-6 du Code de commerce et D. 441-5).',
  payment_terms TEXT DEFAULT 'Paiement à réception de facture par virement bancaire. Date d''échéance : 30 jours fin de mois à compter de la date d''émission. Escompte pour paiement anticipé : néant.',

  -- Personnalisation
  invoice_number_prefix VARCHAR(50) DEFAULT '',
  footer_text TEXT DEFAULT 'Merci pour votre confiance. Cette facture est à régler selon les conditions de paiement indiquées ci-dessus.',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Contrainte: un seul profil par utilisateur
  UNIQUE(user_id)
);

-- Index pour recherche rapide
CREATE INDEX idx_company_profiles_user_id ON company_profiles(user_id);
CREATE INDEX idx_company_profiles_organization_id ON company_profiles(organization_id);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_company_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER trigger_update_company_profile_updated_at
BEFORE UPDATE ON company_profiles
FOR EACH ROW
EXECUTE FUNCTION update_company_profile_updated_at();
