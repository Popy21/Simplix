-- Update company_profiles table to split address into separate fields
-- Drop the old address field and add separate fields

ALTER TABLE company_profiles
  DROP COLUMN IF EXISTS company_address;

ALTER TABLE company_profiles
  ADD COLUMN company_street TEXT,
  ADD COLUMN company_postal_code VARCHAR(10),
  ADD COLUMN company_city VARCHAR(100),
  ADD COLUMN company_country VARCHAR(100) DEFAULT 'France';

-- Update constraint to require the address fields
ALTER TABLE company_profiles
  ALTER COLUMN company_street SET NOT NULL,
  ALTER COLUMN company_postal_code SET NOT NULL,
  ALTER COLUMN company_city SET NOT NULL;
