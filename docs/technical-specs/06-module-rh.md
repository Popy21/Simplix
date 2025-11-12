# 👥 MODULE RESSOURCES HUMAINES

## 🎯 Objectif
Module complet de gestion RH : congés, absences, dossiers employés, time tracking, notes de frais.

## 📋 Fonctionnalités

### 1. Gestion des Employés
- Dossiers personnels
- Contrats de travail
- Documents (CNI, diplômes, etc.)
- Historique postes

### 2. Gestion des Congés
- Demandes de congés
- Workflow de validation
- Calendrier d'équipe
- Soldes de congés
- Types: CP, RTT, maladie, etc.

### 3. Time Tracking
- Pointage entrée/sortie
- Feuilles de temps
- Heures supplémentaires
- Gestion projets/tâches

### 4. Notes de Frais
- Soumission avec scan tickets (OCR déjà présent)
- Workflow validation
- Remboursements
- Export comptable

## 🗄️ Schéma BDD

```sql
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  
  employee_number VARCHAR(50) UNIQUE,
  hire_date DATE NOT NULL,
  termination_date DATE,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  
  job_title VARCHAR(255),
  department VARCHAR(255),
  manager_id UUID REFERENCES employees(id),
  
  salary DECIMAL(15, 2),
  salary_currency VARCHAR(3) DEFAULT 'EUR',
  
  address TEXT,
  city VARCHAR(255),
  country VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) NOT NULL,
  is_paid BOOLEAN DEFAULT true,
  annual_allowance INTEGER,
  requires_approval BOOLEAN DEFAULT true,
  
  UNIQUE(organization_id, code)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID REFERENCES leave_types(id),
  
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count DECIMAL(5, 2) NOT NULL,
  
  reason TEXT,
  status VARCHAR(20) DEFAULT 'PENDING',
  
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  rejected_at TIMESTAMP,
  rejected_by UUID REFERENCES users(id),
  rejection_reason TEXT
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID REFERENCES leave_types(id),
  year INTEGER NOT NULL,
  
  total_allowance DECIMAL(5, 2),
  used DECIMAL(5, 2) DEFAULT 0,
  pending DECIMAL(5, 2) DEFAULT 0,
  remaining DECIMAL(5, 2) GENERATED ALWAYS AS (total_allowance - used - pending) STORED,
  
  UNIQUE(employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  
  entry_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  duration_hours DECIMAL(5, 2),
  
  task_id UUID REFERENCES tasks(id),
  project_id UUID,
  description TEXT,
  
  is_billable BOOLEAN DEFAULT false,
  hourly_rate DECIMAL(10, 2),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## ✅ Checklist
- [ ] Gestion employés
- [ ] Congés et absences
- [ ] Time tracking
- [ ] Notes de frais
- [ ] Exports paie
