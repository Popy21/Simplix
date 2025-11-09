-- Migration 023: Module Ressources Humaines (RH)
-- Employés, Congés, Absences, Pointages, Documents RH, Paie simplifiée

-- ============================================
-- 1. EMPLOYÉS
-- ============================================
CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contractor', 'intern', 'temporary');
CREATE TYPE employment_status AS ENUM ('active', 'on_leave', 'terminated', 'retired');

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- Lien vers compte utilisateur si applicable

    -- Informations personnelles
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    date_of_birth DATE,
    social_security_number VARCHAR(50),

    -- Emploi
    employee_number VARCHAR(50) UNIQUE,
    job_title VARCHAR(255),
    department VARCHAR(100),
    manager_id UUID REFERENCES employees(id),
    employment_type employment_type NOT NULL,
    employment_status employment_status DEFAULT 'active',

    -- Dates
    hire_date DATE NOT NULL,
    termination_date DATE,
    probation_end_date DATE,

    -- Salaire
    salary_amount DECIMAL(15,2),
    salary_currency VARCHAR(3) DEFAULT 'EUR',
    salary_period VARCHAR(20) DEFAULT 'monthly', -- 'hourly', 'daily', 'monthly', 'annual'

    -- Congés
    annual_leave_days DECIMAL(5,2) DEFAULT 25, -- Jours congés payés/an
    remaining_leave_days DECIMAL(5,2),
    sick_leave_days_taken DECIMAL(5,2) DEFAULT 0,

    -- Coordonnées
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'France',

    -- Urgence
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),

    -- Métadonnées
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_employees_org ON employees(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_status ON employees(employment_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_employees_user ON employees(user_id);

-- Trigger: Générer numéro employé
CREATE OR REPLACE FUNCTION generate_employee_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(employee_number FROM 'EMP-([0-9]+)') AS INT)), 0) + 1
    INTO next_number
    FROM employees
    WHERE organization_id = NEW.organization_id;

    NEW.employee_number := 'EMP-' || LPAD(next_number::TEXT, 5, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_employee_number
BEFORE INSERT ON employees
FOR EACH ROW
WHEN (NEW.employee_number IS NULL OR NEW.employee_number = '')
EXECUTE FUNCTION generate_employee_number();

-- ============================================
-- 2. CONGÉS ET ABSENCES
-- ============================================
CREATE TYPE leave_type AS ENUM (
    'annual_leave',      -- Congés payés
    'sick_leave',        -- Arrêt maladie
    'unpaid_leave',      -- Congés sans solde
    'maternity_leave',   -- Congé maternité
    'paternity_leave',   -- Congé paternité
    'parental_leave',    -- Congé parental
    'bereavement',       -- Congé décès
    'marriage',          -- Congé mariage
    'training',          -- Formation
    'remote_work',       -- Télétravail
    'other'
);

CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TABLE IF NOT EXISTS employee_leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

    -- Demande
    leave_type leave_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    half_day BOOLEAN DEFAULT false, -- Demi-journée (matin/après-midi)
    total_days DECIMAL(5,2), -- Calculé automatiquement

    -- Statut
    status leave_status DEFAULT 'pending',

    -- Approbation
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,

    -- Détails
    reason TEXT,
    notes TEXT,
    attachments TEXT[], -- URLs documents justificatifs

    -- Métadonnées
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_leaves_org ON employee_leaves(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leaves_employee ON employee_leaves(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leaves_status ON employee_leaves(status);
CREATE INDEX idx_leaves_dates ON employee_leaves(start_date, end_date);

-- Trigger: Calculer nombre jours
CREATE OR REPLACE FUNCTION calculate_leave_days()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcul simple : différence de jours (peut être amélioré pour exclure weekends/fériés)
    NEW.total_days := (NEW.end_date - NEW.start_date) + 1;

    IF NEW.half_day THEN
        NEW.total_days := 0.5;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_leave_days
BEFORE INSERT OR UPDATE ON employee_leaves
FOR EACH ROW
EXECUTE FUNCTION calculate_leave_days();

-- Trigger: Mettre à jour solde congés employé
CREATE OR REPLACE FUNCTION update_employee_leave_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.leave_type = 'annual_leave' THEN
        UPDATE employees SET
            remaining_leave_days = remaining_leave_days - NEW.total_days,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.employee_id;
    ELSIF NEW.status = 'cancelled' AND OLD.status = 'approved' AND NEW.leave_type = 'annual_leave' THEN
        -- Rembourser les jours
        UPDATE employees SET
            remaining_leave_days = remaining_leave_days + NEW.total_days,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.employee_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leave_balance
AFTER UPDATE ON employee_leaves
FOR EACH ROW
EXECUTE FUNCTION update_employee_leave_balance();

-- ============================================
-- 3. POINTAGES / TEMPS DE TRAVAIL
-- ============================================
CREATE TABLE IF NOT EXISTS time_clockings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

    -- Pointage
    clock_in TIMESTAMP NOT NULL,
    clock_out TIMESTAMP,
    date DATE NOT NULL,

    -- Durée
    duration_hours DECIMAL(10,2), -- Calculé automatiquement
    break_duration_hours DECIMAL(10,2) DEFAULT 0,
    effective_hours DECIMAL(10,2), -- duration - break

    -- Lieu
    location VARCHAR(255), -- Nom du site/bureau
    is_remote BOOLEAN DEFAULT false,

    -- Validation
    is_validated BOOLEAN DEFAULT false,
    validated_by UUID REFERENCES users(id),
    validated_at TIMESTAMP,

    -- Géolocalisation (optionnel)
    clock_in_latitude DECIMAL(10,8),
    clock_in_longitude DECIMAL(11,8),
    clock_out_latitude DECIMAL(10,8),
    clock_out_longitude DECIMAL(11,8),

    -- Métadonnées
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_clockings_org ON time_clockings(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clockings_employee ON time_clockings(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_clockings_date ON time_clockings(date);

-- Trigger: Calculer durée travail
CREATE OR REPLACE FUNCTION calculate_clocking_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.clock_out IS NOT NULL AND NEW.clock_in IS NOT NULL THEN
        NEW.duration_hours := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600.0;
        NEW.effective_hours := NEW.duration_hours - COALESCE(NEW.break_duration_hours, 0);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_clocking_duration
BEFORE INSERT OR UPDATE ON time_clockings
FOR EACH ROW
EXECUTE FUNCTION calculate_clocking_duration();

-- ============================================
-- 4. DOCUMENTS EMPLOYÉS
-- ============================================
CREATE TYPE document_category AS ENUM (
    'contract',          -- Contrat de travail
    'amendment',         -- Avenant
    'payslip',           -- Fiche de paie
    'certificate',       -- Certificat (travail, etc.)
    'id_document',       -- Pièce d'identité
    'diploma',           -- Diplôme
    'medical',           -- Document médical
    'termination',       -- Lettre de licenciement/démission
    'other'
);

CREATE TABLE IF NOT EXISTS employee_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

    -- Document
    document_name VARCHAR(255) NOT NULL,
    document_category document_category NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),

    -- Dates
    issue_date DATE,
    expiry_date DATE,

    -- Sécurité
    is_confidential BOOLEAN DEFAULT true,
    requires_signature BOOLEAN DEFAULT false,
    is_signed BOOLEAN DEFAULT false,
    signed_at TIMESTAMP,

    -- Métadonnées
    description TEXT,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_employee_docs_org ON employee_documents(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employee_docs_employee ON employee_documents(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employee_docs_category ON employee_documents(document_category);

-- ============================================
-- 5. PAIE SIMPLIFIÉE
-- ============================================
CREATE TYPE payroll_status AS ENUM ('draft', 'pending', 'paid', 'cancelled');

CREATE TABLE IF NOT EXISTS payrolls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

    -- Période
    period_month INT NOT NULL, -- 1-12
    period_year INT NOT NULL,

    -- Salaire de base
    base_salary DECIMAL(15,2) NOT NULL,

    -- Heures
    hours_worked DECIMAL(10,2) DEFAULT 0,
    overtime_hours DECIMAL(10,2) DEFAULT 0,
    overtime_rate DECIMAL(10,2) DEFAULT 1.25, -- 125% du taux horaire

    -- Primes et bonus
    bonuses DECIMAL(15,2) DEFAULT 0,
    commissions DECIMAL(15,2) DEFAULT 0,

    -- Déductions
    social_charges DECIMAL(15,2) DEFAULT 0, -- Charges sociales
    income_tax DECIMAL(15,2) DEFAULT 0, -- Retenue impôt à la source
    other_deductions DECIMAL(15,2) DEFAULT 0,

    -- Totaux
    gross_salary DECIMAL(15,2), -- Salaire brut
    net_salary DECIMAL(15,2), -- Salaire net

    -- Statut
    status payroll_status DEFAULT 'draft',
    payment_date DATE,

    -- Document
    payslip_url TEXT, -- Lien vers fiche de paie PDF

    -- Métadonnées
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,

    UNIQUE(employee_id, period_month, period_year, organization_id)
);

CREATE INDEX idx_payrolls_org ON payrolls(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payrolls_employee ON payrolls(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payrolls_period ON payrolls(period_year, period_month);
CREATE INDEX idx_payrolls_status ON payrolls(status);

-- Trigger: Calculer salaires brut/net
CREATE OR REPLACE FUNCTION calculate_payroll_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Salaire brut = base + heures sup + primes + commissions
    NEW.gross_salary := NEW.base_salary +
                       (NEW.overtime_hours * (NEW.base_salary / 151.67) * NEW.overtime_rate) +
                       COALESCE(NEW.bonuses, 0) +
                       COALESCE(NEW.commissions, 0);

    -- Salaire net = brut - charges - impôts - autres déductions
    NEW.net_salary := NEW.gross_salary -
                     COALESCE(NEW.social_charges, 0) -
                     COALESCE(NEW.income_tax, 0) -
                     COALESCE(NEW.other_deductions, 0);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_payroll
BEFORE INSERT OR UPDATE ON payrolls
FOR EACH ROW
EXECUTE FUNCTION calculate_payroll_amounts();

-- ============================================
-- 6. VUES UTILES
-- ============================================

-- Vue: Employés actifs avec infos managers
CREATE OR REPLACE VIEW v_employees_active AS
SELECT
    e.*,
    m.first_name || ' ' || m.last_name as manager_name,
    u.email as user_email
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id
LEFT JOIN users u ON u.id = e.user_id
WHERE e.employment_status = 'active' AND e.deleted_at IS NULL;

-- Vue: Congés en attente approbation
CREATE OR REPLACE VIEW v_leaves_pending AS
SELECT
    el.*,
    e.first_name || ' ' || e.last_name as employee_name,
    e.employee_number,
    e.department
FROM employee_leaves el
JOIN employees e ON e.id = el.employee_id
WHERE el.status = 'pending' AND el.deleted_at IS NULL
ORDER BY el.requested_at ASC;

-- Vue: Heures travaillées par employé (mois actuel)
CREATE OR REPLACE VIEW v_monthly_hours AS
SELECT
    tc.employee_id,
    e.first_name || ' ' || e.last_name as employee_name,
    EXTRACT(MONTH FROM tc.date) as month,
    EXTRACT(YEAR FROM tc.date) as year,
    SUM(tc.effective_hours) as total_hours,
    COUNT(*) as days_worked,
    AVG(tc.effective_hours) as average_daily_hours
FROM time_clockings tc
JOIN employees e ON e.id = tc.employee_id
WHERE tc.deleted_at IS NULL
  AND tc.date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY tc.employee_id, e.first_name, e.last_name, EXTRACT(MONTH FROM tc.date), EXTRACT(YEAR FROM tc.date);

-- ============================================
-- Commentaires tables
-- ============================================
COMMENT ON TABLE employees IS 'Employés de l''organisation';
COMMENT ON TABLE employee_leaves IS 'Demandes de congés et absences';
COMMENT ON TABLE time_clockings IS 'Pointages et temps de travail';
COMMENT ON TABLE employee_documents IS 'Documents RH (contrats, fiches paie, etc.)';
COMMENT ON TABLE payrolls IS 'Paie simplifiée mensuelle';
