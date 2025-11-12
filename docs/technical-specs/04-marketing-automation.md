# 📧 MARKETING AUTOMATION AVANCÉ

## 🎯 Objectif
Créer un système complet de marketing automation avec landing pages, formulaires, A/B testing, campagnes multi-canaux et lead scoring.

---

## 📋 Fonctionnalités

### 1. **Landing Pages Builder**
- Éditeur drag & drop
- Templates prêts à l'emploi
- Responsive design
- SEO optimisé
- Intégration formulaires
- Tracking conversions

### 2. **Form Builder**
- Formulaires personnalisables
- Validation avancée
- Multi-étapes
- Conditional logic
- Anti-spam (reCAPTCHA)
- Auto-réponses

### 3. **A/B Testing**
- Tests email subject
- Tests landing pages
- Tests CTA
- Tests audiences
- Statistical significance
- Auto-winner selection

### 4. **Lead Scoring**
- Scoring basé sur comportement
- Scoring démographique
- Scoring engagement
- Qualification automatique
- Routage automatique

### 5. **Campagnes Multi-Canaux**
- Email + SMS
- Séquences automatisées
- Déclencheurs comportementaux
- Nurturing leads
- Re-engagement

---

## 🗄️ Schéma BDD

```sql
-- ========================================
-- LANDING PAGES
-- ========================================

CREATE TABLE IF NOT EXISTS landing_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Content
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL, -- URL: simplix.com/l/slug
  title VARCHAR(255),
  meta_description TEXT,

  -- Design
  template_id UUID,
  content JSONB NOT NULL, -- Structure JSON du builder
  custom_css TEXT,
  custom_js TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, PUBLISHED, ARCHIVED
  published_at TIMESTAMP,

  -- Analytics
  views_count INTEGER DEFAULT 0,
  submissions_count INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN views_count > 0 THEN (submissions_count::DECIMAL / views_count * 100) ELSE 0 END
  ) STORED,

  -- SEO
  canonical_url TEXT,
  og_image TEXT,

  -- Settings
  settings JSONB DEFAULT '{}', -- tracking codes, redirects, etc.

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(organization_id, slug)
);

CREATE INDEX idx_landing_pages_org ON landing_pages(organization_id);
CREATE INDEX idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX idx_landing_pages_status ON landing_pages(status);

-- Landing page visits
CREATE TABLE IF NOT EXISTS landing_page_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landing_page_id UUID REFERENCES landing_pages(id) ON DELETE CASCADE,

  -- Visitor info
  visitor_id UUID, -- Anonymous or identified
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),
  utm_term VARCHAR(100),

  -- Engagement
  time_on_page INTEGER, -- seconds
  did_convert BOOLEAN DEFAULT false,
  form_submission_id UUID,

  visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lp_visits_page ON landing_page_visits(landing_page_id);
CREATE INDEX idx_lp_visits_visitor ON landing_page_visits(visitor_id);

-- ========================================
-- FORM BUILDER
-- ========================================

CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Structure
  fields JSONB NOT NULL, -- Array de définition des champs
  settings JSONB DEFAULT '{}', -- redirect_url, auto_response, etc.

  -- Integration
  webhook_url TEXT,
  integrations JSONB, -- CRM, email, etc.

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Analytics
  submissions_count INTEGER DEFAULT 0,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_forms_org ON forms(organization_id);

-- Form submissions
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  landing_page_id UUID REFERENCES landing_pages(id),

  -- Data
  data JSONB NOT NULL, -- Données soumises

  -- Visitor
  visitor_id UUID,
  contact_id UUID REFERENCES contacts(id), -- Si identifié
  ip_address INET,
  user_agent TEXT,

  -- Processing
  status VARCHAR(20) DEFAULT 'NEW', -- NEW, PROCESSED, SPAM
  processed_at TIMESTAMP,

  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_form_submissions_form ON form_submissions(form_id);
CREATE INDEX idx_form_submissions_contact ON form_submissions(contact_id);

-- ========================================
-- A/B TESTING
-- ========================================

CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  test_type VARCHAR(50) NOT NULL, -- EMAIL_SUBJECT, LANDING_PAGE, CTA, AUDIENCE

  -- Config
  variants JSONB NOT NULL, -- [{name: 'A', config: {...}}, {name: 'B', config: {...}}]
  traffic_split JSONB DEFAULT '{"A": 50, "B": 50}', -- % distribution

  -- Status
  status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, RUNNING, COMPLETED, PAUSED
  started_at TIMESTAMP,
  ended_at TIMESTAMP,

  -- Goals
  goal_metric VARCHAR(50), -- CLICK_RATE, CONVERSION_RATE, REVENUE
  goal_value DECIMAL(15, 2),

  -- Results
  winner VARCHAR(10), -- 'A', 'B', etc.
  confidence_level DECIMAL(5, 2), -- Statistical confidence %

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- A/B Test results
CREATE TABLE IF NOT EXISTS ab_test_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ab_test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,

  variant VARCHAR(10) NOT NULL, -- 'A', 'B', etc.

  -- Metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(15, 2) DEFAULT 0,

  click_rate DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN impressions > 0 THEN (clicks::DECIMAL / impressions * 100) ELSE 0 END
  ) STORED,
  conversion_rate DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN clicks > 0 THEN (conversions::DECIMAL / clicks * 100) ELSE 0 END
  ) STORED,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(ab_test_id, variant)
);

-- ========================================
-- LEAD SCORING
-- ========================================

CREATE TABLE IF NOT EXISTS lead_scoring_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Rule
  rule_type VARCHAR(50) NOT NULL, -- DEMOGRAPHIC, BEHAVIOR, ENGAGEMENT
  condition JSONB NOT NULL, -- {field: 'industry', operator: 'equals', value: 'Tech'}
  score_change INTEGER NOT NULL, -- +10, -5, etc.

  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lead scores (current scores for each contact)
CREATE TABLE IF NOT EXISTS lead_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE UNIQUE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  current_score INTEGER DEFAULT 0,
  previous_score INTEGER DEFAULT 0,
  score_grade VARCHAR(5), -- A+, A, B, C, D, F

  last_scored_at TIMESTAMP,
  last_activity_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lead_scores_contact ON lead_scores(contact_id);
CREATE INDEX idx_lead_scores_grade ON lead_scores(score_grade);

-- Score history
CREATE TABLE IF NOT EXISTS lead_score_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_score_id UUID REFERENCES lead_scores(id) ON DELETE CASCADE,

  rule_id UUID REFERENCES lead_scoring_rules(id),
  score_change INTEGER NOT NULL,
  reason TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- SÉQUENCES EMAIL (Déjà partiellement présent)
-- ========================================

-- Améliorer la table existante email_campaigns
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(50) DEFAULT 'ONE_TIME';
-- ONE_TIME, DRIP, TRIGGERED, AB_TEST

-- Sequences (drip campaigns)
CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Trigger
  trigger_type VARCHAR(50), -- FORM_SUBMIT, TAG_ADDED, LEAD_SCORE, MANUAL
  trigger_config JSONB,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Stats
  enrolled_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Steps de la séquence
CREATE TABLE IF NOT EXISTS email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID REFERENCES email_sequences(id) ON DELETE CASCADE,

  step_number INTEGER NOT NULL,
  step_type VARCHAR(50) DEFAULT 'EMAIL', -- EMAIL, SMS, WAIT, ACTION

  -- Email content
  subject VARCHAR(500),
  body TEXT,
  template_id UUID,

  -- Timing
  delay_value INTEGER NOT NULL, -- 1, 3, 7, etc.
  delay_unit VARCHAR(20) NOT NULL, -- MINUTES, HOURS, DAYS

  -- Conditions
  send_conditions JSONB, -- Only send if conditions met

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(sequence_id, step_number)
);

-- Enrollments (qui est dans quelle séquence)
CREATE TABLE IF NOT EXISTS email_sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID REFERENCES email_sequences(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,

  current_step_number INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, PAUSED, COMPLETED, CANCELLED

  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  next_step_at TIMESTAMP,

  UNIQUE(sequence_id, contact_id)
);

CREATE INDEX idx_enrollments_sequence ON email_sequence_enrollments(sequence_id);
CREATE INDEX idx_enrollments_contact ON email_sequence_enrollments(contact_id);
CREATE INDEX idx_enrollments_next_step ON email_sequence_enrollments(next_step_at)
  WHERE status = 'ACTIVE';
```

---

## 🔧 Services

### 1. **Landing Page Builder Service**

```typescript
// api/src/services/marketing/landing-page.service.ts
export class LandingPageService {
  async create(organizationId: string, data: any): Promise<string> {
    const slug = this.generateSlug(data.name);

    const result = await db.query(
      `INSERT INTO landing_pages
       (organization_id, name, slug, title, meta_description, content, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT')
       RETURNING id`,
      [organizationId, data.name, slug, data.title, data.meta_description, JSON.stringify(data.content)]
    );

    return result.rows[0].id;
  }

  async publish(pageId: string): Promise<void> {
    await db.query(
      `UPDATE landing_pages
       SET status = 'PUBLISHED', published_at = NOW()
       WHERE id = $1`,
      [pageId]
    );
  }

  async trackVisit(pageId: string, visitorData: any): Promise<void> {
    await db.query(
      `INSERT INTO landing_page_visits
       (landing_page_id, visitor_id, ip_address, user_agent, referrer,
        utm_source, utm_medium, utm_campaign)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [pageId, visitorData.visitorId, visitorData.ip, visitorData.userAgent,
       visitorData.referrer, visitorData.utmSource, visitorData.utmMedium, visitorData.utmCampaign]
    );

    // Incrémenter le compteur
    await db.query(
      'UPDATE landing_pages SET views_count = views_count + 1 WHERE id = $1',
      [pageId]
    );
  }

  private generateSlug(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
  }
}
```

### 2. **A/B Testing Service**

```typescript
// api/src/services/marketing/ab-test.service.ts
export class ABTestService {
  async createTest(organizationId: string, testConfig: any): Promise<string> {
    const result = await db.query(
      `INSERT INTO ab_tests
       (organization_id, name, test_type, variants, traffic_split, goal_metric)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        organizationId,
        testConfig.name,
        testConfig.testType,
        JSON.stringify(testConfig.variants),
        JSON.stringify(testConfig.trafficSplit),
        testConfig.goalMetric
      ]
    );

    const testId = result.rows[0].id;

    // Initialiser les résultats pour chaque variant
    for (const variant of testConfig.variants) {
      await db.query(
        `INSERT INTO ab_test_results (ab_test_id, variant)
         VALUES ($1, $2)`,
        [testId, variant.name]
      );
    }

    return testId;
  }

  async getVariantForVisitor(testId: string, visitorId: string): Promise<string> {
    // Chercher si le visiteur a déjà été assigné
    const existing = await this.redis.get(`ab_test:${testId}:visitor:${visitorId}`);
    if (existing) return existing;

    // Assigner un variant selon la distribution
    const test = await db.query(
      'SELECT traffic_split, variants FROM ab_tests WHERE id = $1',
      [testId]
    );

    const { traffic_split, variants } = test.rows[0];
    const variant = this.selectVariant(traffic_split);

    // Sauvegarder l'assignation (cache 30 jours)
    await this.redis.setex(`ab_test:${testId}:visitor:${visitorId}`, 2592000, variant);

    return variant;
  }

  async recordImpression(testId: string, variant: string): Promise<void> {
    await db.query(
      `UPDATE ab_test_results
       SET impressions = impressions + 1, updated_at = NOW()
       WHERE ab_test_id = $1 AND variant = $2`,
      [testId, variant]
    );
  }

  async recordConversion(testId: string, variant: string, revenue: number = 0): Promise<void> {
    await db.query(
      `UPDATE ab_test_results
       SET conversions = conversions + 1, revenue = revenue + $3, updated_at = NOW()
       WHERE ab_test_id = $1 AND variant = $2`,
      [testId, variant, revenue]
    );
  }

  async calculateWinner(testId: string): Promise<{winner: string, confidence: number}> {
    const results = await db.query(
      'SELECT * FROM ab_test_results WHERE ab_test_id = $1',
      [testId]
    );

    // Calculer statistical significance (Z-test)
    // Simplified version - production should use proper stats library
    const variants = results.rows;
    if (variants.length !== 2) throw new Error('Currently supports only 2 variants');

    const [a, b] = variants;

    const pA = a.conversions / a.impressions;
    const pB = b.conversions / b.impressions;

    const pPooled = (a.conversions + b.conversions) / (a.impressions + b.impressions);
    const se = Math.sqrt(pPooled * (1 - pPooled) * (1/a.impressions + 1/b.impressions));
    const zScore = Math.abs(pA - pB) / se;

    // Z-score to confidence level (simplified)
    const confidence = this.zScoreToConfidence(zScore);

    if (confidence >= 95) {
      const winner = pA > pB ? a.variant : b.variant;

      await db.query(
        `UPDATE ab_tests
         SET winner = $1, confidence_level = $2, status = 'COMPLETED', ended_at = NOW()
         WHERE id = $3`,
        [winner, confidence, testId]
      );

      return { winner, confidence };
    }

    return { winner: 'INCONCLUSIVE', confidence };
  }

  private selectVariant(trafficSplit: Record<string, number>): string {
    const rand = Math.random() * 100;
    let cumulative = 0;

    for (const [variant, percentage] of Object.entries(trafficSplit)) {
      cumulative += percentage;
      if (rand <= cumulative) return variant;
    }

    return Object.keys(trafficSplit)[0]; // Fallback
  }

  private zScoreToConfidence(z: number): number {
    // Simplified conversion
    if (z >= 2.58) return 99;
    if (z >= 1.96) return 95;
    if (z >= 1.65) return 90;
    return 80;
  }
}
```

### 3. **Lead Scoring Service**

```typescript
// api/src/services/marketing/lead-scoring.service.ts
export class LeadScoringService {
  async scoreContact(contactId: string): Promise<number> {
    const contact = await db.query(
      'SELECT * FROM contacts WHERE id = $1',
      [contactId]
    );

    if (!contact.rows[0]) return 0;

    const organizationId = contact.rows[0].organization_id;

    // Récupérer toutes les règles actives
    const rules = await db.query(
      'SELECT * FROM lead_scoring_rules WHERE organization_id = $1 AND is_active = true ORDER BY priority DESC',
      [organizationId]
    );

    let totalScore = 0;
    const appliedRules = [];

    for (const rule of rules.rows) {
      if (this.evaluateCondition(contact.rows[0], rule.condition)) {
        totalScore += rule.score_change;
        appliedRules.push({ ruleId: rule.id, change: rule.score_change, reason: rule.name });
      }
    }

    // Calculer le grade
    const grade = this.calculateGrade(totalScore);

    // Mettre à jour ou créer le score
    const existing = await db.query(
      'SELECT id, current_score FROM lead_scores WHERE contact_id = $1',
      [contactId]
    );

    if (existing.rows.length > 0) {
      const previousScore = existing.rows[0].current_score;

      await db.query(
        `UPDATE lead_scores
         SET current_score = $1, previous_score = $2, score_grade = $3, last_scored_at = NOW()
         WHERE contact_id = $4`,
        [totalScore, previousScore, grade, contactId]
      );

      // Enregistrer l'historique
      for (const applied of appliedRules) {
        await db.query(
          `INSERT INTO lead_score_history (lead_score_id, rule_id, score_change, reason)
           VALUES ($1, $2, $3, $4)`,
          [existing.rows[0].id, applied.ruleId, applied.change, applied.reason]
        );
      }
    } else {
      const result = await db.query(
        `INSERT INTO lead_scores
         (contact_id, organization_id, current_score, score_grade, last_scored_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id`,
        [contactId, organizationId, totalScore, grade]
      );

      for (const applied of appliedRules) {
        await db.query(
          `INSERT INTO lead_score_history (lead_score_id, rule_id, score_change, reason)
           VALUES ($1, $2, $3, $4)`,
          [result.rows[0].id, applied.ruleId, applied.change, applied.reason]
        );
      }
    }

    return totalScore;
  }

  private evaluateCondition(contact: any, condition: any): boolean {
    const { field, operator, value } = condition;
    const contactValue = contact[field];

    switch (operator) {
      case 'equals':
        return contactValue === value;
      case 'not_equals':
        return contactValue !== value;
      case 'contains':
        return contactValue && contactValue.includes(value);
      case 'greater_than':
        return contactValue > value;
      case 'less_than':
        return contactValue < value;
      default:
        return false;
    }
  }

  private calculateGrade(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }
}
```

---

## 📦 Dépendances

```json
{
  "dependencies": {
    "juice": "^9.0.0",
    "mjml": "^4.14.0",
    "js-beautify": "^1.14.11"
  }
}
```

---

## ✅ Checklist

- [ ] Landing page builder UI
- [ ] Form builder
- [ ] A/B testing engine
- [ ] Lead scoring rules
- [ ] Email sequences
- [ ] SMS integration
- [ ] Analytics dashboard

---

## 🎯 KPIs

- ✅ Conversion rate tracking
- ✅ A/B test confidence > 95%
- ✅ Lead score accuracy
- ✅ Email deliverability > 98%
