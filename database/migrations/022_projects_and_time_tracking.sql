-- Migration 022: Module Gestion de Projets et Suivi du Temps
-- Projets, Tâches projet, Suivi temps, Facturation temps passé, Rentabilité

-- ============================================
-- 1. PROJETS
-- ============================================
CREATE TYPE project_status AS ENUM ('draft', 'active', 'on_hold', 'completed', 'cancelled');
CREATE TYPE project_type AS ENUM ('fixed_price', 'time_and_materials', 'retainer', 'internal');

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Informations projet
    project_number VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_type project_type NOT NULL DEFAULT 'time_and_materials',
    status project_status DEFAULT 'draft',

    -- Client
    customer_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,

    -- Dates
    start_date DATE,
    end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,

    -- Budget et tarification
    budget_amount DECIMAL(15,2), -- Budget total
    hourly_rate DECIMAL(10,2), -- Taux horaire par défaut
    fixed_price DECIMAL(15,2), -- Prix forfaitaire si applicable

    -- Progression
    progress_percent DECIMAL(5,2) DEFAULT 0,

    -- Équipe
    manager_id UUID REFERENCES users(id), -- Chef de projet
    team_ids UUID[], -- IDs membres équipe

    -- Tags et catégories
    tags TEXT[],
    category VARCHAR(100),
    priority VARCHAR(50), -- 'low', 'normal', 'high', 'critical'

    -- Métadonnées
    notes TEXT,
    metadata JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_projects_org ON projects(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_customer ON projects(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_status ON projects(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_manager ON projects(manager_id);

-- Trigger: Générer numéro projet
CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INT;
    year_suffix VARCHAR(4);
BEGIN
    year_suffix := TO_CHAR(CURRENT_DATE, 'YYYY');

    SELECT COALESCE(MAX(CAST(SUBSTRING(project_number FROM 'PRJ-' || year_suffix || '-([0-9]+)') AS INT)), 0) + 1
    INTO next_number
    FROM projects
    WHERE organization_id = NEW.organization_id
      AND project_number LIKE 'PRJ-' || year_suffix || '%';

    NEW.project_number := 'PRJ-' || year_suffix || '-' || LPAD(next_number::TEXT, 4, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_project_number
BEFORE INSERT ON projects
FOR EACH ROW
WHEN (NEW.project_number IS NULL OR NEW.project_number = '')
EXECUTE FUNCTION generate_project_number();

-- ============================================
-- 2. TÂCHES PROJET
-- ============================================
CREATE TYPE task_priority AS ENUM ('low', 'normal', 'high', 'critical');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled');

CREATE TABLE IF NOT EXISTS project_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Tâche
    task_number VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status DEFAULT 'todo',
    priority task_priority DEFAULT 'normal',

    -- Assignation
    assigned_to UUID REFERENCES users(id),

    -- Dates
    due_date DATE,
    start_date DATE,
    completed_at TIMESTAMP,

    -- Estimation et suivi
    estimated_hours DECIMAL(10,2), -- Heures estimées
    actual_hours DECIMAL(10,2) DEFAULT 0, -- Heures réelles (calculé depuis time_entries)

    -- Hiérarchie (sous-tâches)
    parent_task_id UUID REFERENCES project_tasks(id),

    -- Facturation
    is_billable BOOLEAN DEFAULT true,
    hourly_rate DECIMAL(10,2), -- Surcharge taux horaire tâche

    -- Métadonnées
    tags TEXT[],
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_project_tasks_org ON project_tasks(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_tasks_project ON project_tasks(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_tasks_assigned ON project_tasks(assigned_to);
CREATE INDEX idx_project_tasks_status ON project_tasks(status);

-- ============================================
-- 3. SUIVI TEMPS (Time Entries)
-- ============================================
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Projet/Tâche
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES project_tasks(id) ON DELETE SET NULL,

    -- Utilisateur
    user_id UUID NOT NULL REFERENCES users(id),

    -- Temps
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_hours DECIMAL(10,2) NOT NULL, -- Heures travaillées
    date DATE NOT NULL, -- Date du travail

    -- Description
    description TEXT,

    -- Facturation
    is_billable BOOLEAN DEFAULT true,
    hourly_rate DECIMAL(10,2), -- Taux horaire appliqué
    billable_amount DECIMAL(15,2), -- Montant facturable = duration * rate

    -- Statut facturation
    is_invoiced BOOLEAN DEFAULT false,
    invoice_id UUID REFERENCES invoices(id),
    invoiced_at TIMESTAMP,

    -- Timer (pour suivi en direct)
    is_running BOOLEAN DEFAULT false,

    -- Métadonnées
    tags TEXT[],
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_time_entries_org ON time_entries(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_time_entries_project ON time_entries(project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_time_entries_task ON time_entries(task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);
CREATE INDEX idx_time_entries_billable ON time_entries(is_billable, is_invoiced) WHERE is_billable = true;

-- Trigger: Calculer montant facturable
CREATE OR REPLACE FUNCTION calculate_billable_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_billable AND NEW.hourly_rate IS NOT NULL AND NEW.duration_hours IS NOT NULL THEN
        NEW.billable_amount := NEW.duration_hours * NEW.hourly_rate;
    ELSE
        NEW.billable_amount := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_billable_amount
BEFORE INSERT OR UPDATE ON time_entries
FOR EACH ROW
EXECUTE FUNCTION calculate_billable_amount();

-- Trigger: Mettre à jour heures réelles tâche
CREATE OR REPLACE FUNCTION update_task_actual_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.task_id IS NOT NULL THEN
        UPDATE project_tasks SET
            actual_hours = (
                SELECT COALESCE(SUM(duration_hours), 0)
                FROM time_entries
                WHERE task_id = NEW.task_id AND deleted_at IS NULL
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.task_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_actual_hours
AFTER INSERT OR UPDATE OR DELETE ON time_entries
FOR EACH ROW
EXECUTE FUNCTION update_task_actual_hours();

-- ============================================
-- 4. BUDGETS PROJET
-- ============================================
CREATE TABLE IF NOT EXISTS project_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Budget
    budget_type VARCHAR(50) NOT NULL, -- 'labor', 'materials', 'expenses', 'other'
    budget_name VARCHAR(255) NOT NULL,
    budgeted_amount DECIMAL(15,2) NOT NULL,

    -- Dépenses réelles
    actual_amount DECIMAL(15,2) DEFAULT 0,
    remaining_amount DECIMAL(15,2),

    -- Alertes
    alert_threshold_percent DECIMAL(5,2) DEFAULT 80, -- Alerte à 80%

    -- Métadonnées
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_project_budgets_org ON project_budgets(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_budgets_project ON project_budgets(project_id) WHERE deleted_at IS NULL;

-- ============================================
-- 5. DÉPENSES PROJET
-- ============================================
CREATE TABLE IF NOT EXISTS project_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Dépense
    expense_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    category VARCHAR(100),
    description TEXT NOT NULL,

    -- Lien vers dépense générale (si applicable)
    expense_id UUID REFERENCES expenses(id),

    -- Facturation
    is_billable BOOLEAN DEFAULT true,
    markup_percent DECIMAL(5,2) DEFAULT 0, -- Majoration %
    billable_amount DECIMAL(15,2),

    -- Statut
    is_invoiced BOOLEAN DEFAULT false,
    invoice_id UUID REFERENCES invoices(id),

    -- Reçu/Justificatif
    receipt_url TEXT,

    -- Métadonnées
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_project_expenses_org ON project_expenses(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_project_expenses_project ON project_expenses(project_id) WHERE deleted_at IS NULL;

-- ============================================
-- 6. JALONS PROJET (Milestones)
-- ============================================
CREATE TYPE milestone_status AS ENUM ('pending', 'in_progress', 'completed', 'missed');

CREATE TABLE IF NOT EXISTS project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Jalon
    name VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    status milestone_status DEFAULT 'pending',

    -- Paiement lié
    payment_percent DECIMAL(5,2), -- % paiement à ce jalon
    payment_amount DECIMAL(15,2),
    is_invoiced BOOLEAN DEFAULT false,
    invoice_id UUID REFERENCES invoices(id),

    -- Complétion
    completed_at TIMESTAMP,

    -- Métadonnées
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_milestones_org ON project_milestones(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_milestones_project ON project_milestones(project_id) WHERE deleted_at IS NULL;

-- ============================================
-- 7. VUES UTILES
-- ============================================

-- Vue: Rentabilité projet
CREATE OR REPLACE VIEW v_project_profitability AS
SELECT
    p.id as project_id,
    p.organization_id,
    p.name as project_name,
    p.project_type,
    p.status,
    p.budget_amount,
    p.fixed_price,

    -- Revenus
    CASE
        WHEN p.project_type = 'fixed_price' THEN p.fixed_price
        ELSE COALESCE(SUM(te.billable_amount) FILTER (WHERE te.is_billable = true), 0)
    END as total_revenue,

    -- Coûts temps
    COALESCE(SUM(te.duration_hours), 0) as total_hours,
    COALESCE(SUM(te.billable_amount) FILTER (WHERE te.is_billable = false), 0) as internal_cost,

    -- Coûts dépenses
    COALESCE(SUM(pe.amount), 0) as total_expenses,

    -- Marge
    (CASE
        WHEN p.project_type = 'fixed_price' THEN p.fixed_price
        ELSE COALESCE(SUM(te.billable_amount) FILTER (WHERE te.is_billable = true), 0)
    END) - COALESCE(SUM(te.billable_amount) FILTER (WHERE te.is_billable = false), 0) - COALESCE(SUM(pe.amount), 0) as profit_margin

FROM projects p
LEFT JOIN time_entries te ON te.project_id = p.id AND te.deleted_at IS NULL
LEFT JOIN project_expenses pe ON pe.project_id = p.id AND pe.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.organization_id, p.name, p.project_type, p.status, p.budget_amount, p.fixed_price;

-- Vue: Temps non facturé
CREATE OR REPLACE VIEW v_unbilled_time AS
SELECT
    te.id,
    te.organization_id,
    te.project_id,
    p.name as project_name,
    p.customer_id,
    c.name as customer_name,
    te.user_id,
    u.name as user_name,
    te.date,
    te.duration_hours,
    te.hourly_rate,
    te.billable_amount,
    te.description
FROM time_entries te
JOIN projects p ON p.id = te.project_id
LEFT JOIN contacts c ON c.id = p.customer_id
LEFT JOIN users u ON u.id = te.user_id
WHERE te.is_billable = true
  AND te.is_invoiced = false
  AND te.deleted_at IS NULL
  AND p.deleted_at IS NULL
ORDER BY te.date DESC;

-- Vue: Progression projet
CREATE OR REPLACE VIEW v_project_progress AS
SELECT
    p.id as project_id,
    p.organization_id,
    p.name as project_name,
    p.status,
    COUNT(DISTINCT pt.id) as total_tasks,
    COUNT(DISTINCT pt.id) FILTER (WHERE pt.status = 'done') as completed_tasks,
    CASE
        WHEN COUNT(DISTINCT pt.id) > 0 THEN
            ROUND((COUNT(DISTINCT pt.id) FILTER (WHERE pt.status = 'done')::DECIMAL / COUNT(DISTINCT pt.id)) * 100, 2)
        ELSE 0
    END as completion_percent,
    COALESCE(SUM(te.duration_hours), 0) as total_hours_logged,
    COALESCE(SUM(pt.estimated_hours), 0) as total_hours_estimated
FROM projects p
LEFT JOIN project_tasks pt ON pt.project_id = p.id AND pt.deleted_at IS NULL
LEFT JOIN time_entries te ON te.project_id = p.id AND te.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.organization_id, p.name, p.status;

-- ============================================
-- Commentaires tables
-- ============================================
COMMENT ON TABLE projects IS 'Projets clients et internes';
COMMENT ON TABLE project_tasks IS 'Tâches liées aux projets';
COMMENT ON TABLE time_entries IS 'Suivi du temps passé sur projets/tâches';
COMMENT ON TABLE project_budgets IS 'Budgets par catégorie pour chaque projet';
COMMENT ON TABLE project_expenses IS 'Dépenses liées aux projets';
COMMENT ON TABLE project_milestones IS 'Jalons et étapes clés des projets';
