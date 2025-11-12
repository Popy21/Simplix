# 🎫 SYSTÈME DE TICKETING SAV

## 🎯 Objectif
Système complet de support client avec tickets, SLA, base de connaissance, chat.

## 📋 Fonctionnalités

### 1. Tickets
- Création multi-canal (email, form, API)
- Catégorisation et priorité
- Assignation automatique
- SLA tracking
- Réponses templates
- Pièces jointes

### 2. Base de Connaissance
- Articles FAQ
- Catégories
- Recherche full-text
- Votes utiles
- Portail public

### 3. SLA Management
- Règles SLA par priorité
- Alertes dépassement
- Reporting

### 4. Satisfaction Client
- Sondages post-résolution
- NPS, CSAT
- Analytics

## 🗄️ Schéma BDD

```sql
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  subject VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  
  customer_id UUID REFERENCES companies(id),
  contact_id UUID REFERENCES contacts(id),
  
  status VARCHAR(20) DEFAULT 'OPEN',
  priority VARCHAR(20) DEFAULT 'MEDIUM',
  category VARCHAR(100),
  
  assigned_to UUID REFERENCES users(id),
  assigned_at TIMESTAMP,
  
  sla_due_at TIMESTAMP,
  first_response_at TIMESTAMP,
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticket_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kb_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  
  views_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sla_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  
  first_response_hours INTEGER,
  resolution_hours INTEGER,
  
  is_active BOOLEAN DEFAULT true
);
```

## ✅ Checklist
- [ ] Système de tickets
- [ ] SLA tracking
- [ ] Base de connaissance
- [ ] Email integration
- [ ] Portail client
- [ ] Reporting satisfaction
