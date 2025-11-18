-- Migration: Add AI and machine learning features
-- Enables AI lead scoring, predictions, and intelligent recommendations

-- Add AI fields to leads/contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ai_score DECIMAL(5, 2) DEFAULT 0 CHECK (ai_score >= 0 AND ai_score <= 100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ai_score_updated_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ai_insights JSONB DEFAULT '{}'::jsonb;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_engagement_at TIMESTAMPTZ;

-- Add AI fields to deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS ai_win_probability DECIMAL(5, 2) CHECK (ai_win_probability >= 0 AND ai_win_probability <= 100);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS ai_recommended_actions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS ai_risk_factors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS predicted_close_date DATE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS predicted_value DECIMAL(15, 2);

-- Create ai_predictions table (store AI model predictions)
CREATE TABLE IF NOT EXISTS ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  model_type VARCHAR(100) NOT NULL, -- 'lead_scoring', 'deal_probability', 'churn_risk', 'revenue_forecast'
  entity_type VARCHAR(50) NOT NULL, -- 'contact', 'deal', 'customer'
  entity_id UUID NOT NULL,
  prediction_value DECIMAL(10, 2) NOT NULL,
  confidence_score DECIMAL(5, 2), -- 0-100
  features_used JSONB, -- Which features contributed to prediction
  model_version VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Create ai_training_data table (store data for model training)
CREATE TABLE IF NOT EXISTS ai_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  model_type VARCHAR(100) NOT NULL,
  features JSONB NOT NULL,
  label DECIMAL(10, 2) NOT NULL, -- The actual outcome
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ai_recommendations table (AI-generated recommendations)
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  recommendation_type VARCHAR(100) NOT NULL, -- 'follow_up', 'send_email', 'schedule_call', 'update_deal', 'assign_to'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  confidence_score DECIMAL(5, 2),
  reasoning TEXT,
  suggested_action JSONB,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed', 'completed')),
  accepted_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Create ai_enrichment_queue table (contacts to enrich with AI)
CREATE TABLE IF NOT EXISTS ai_enrichment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  enrichment_type VARCHAR(100) NOT NULL, -- 'company_data', 'social_profiles', 'email_validation', 'phone_validation'
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  provider VARCHAR(50), -- 'clearbit', 'hunter', 'pipl', 'custom'
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Create conversation_analysis table (AI sentiment and topic analysis)
CREATE TABLE IF NOT EXISTS conversation_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL, -- 'email', 'note', 'call_transcript'
  entity_id UUID NOT NULL,
  sentiment VARCHAR(20), -- 'positive', 'neutral', 'negative'
  sentiment_score DECIMAL(5, 2), -- -1 to 1
  topics TEXT[], -- Extracted topics
  key_phrases TEXT[],
  intent VARCHAR(100), -- 'inquiry', 'complaint', 'purchase', 'support'
  language VARCHAR(10),
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create smart_lists table (dynamic AI-powered segments)
CREATE TABLE IF NOT EXISTS smart_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- 'contacts', 'deals', 'companies'
  ai_criteria JSONB NOT NULL, -- AI-generated criteria
  manual_criteria JSONB,
  update_frequency VARCHAR(50) DEFAULT 'daily', -- 'realtime', 'hourly', 'daily', 'weekly'
  member_count INTEGER DEFAULT 0,
  last_updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create forecasts table (AI revenue forecasting)
CREATE TABLE IF NOT EXISTS forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  forecast_period VARCHAR(50) NOT NULL, -- 'week', 'month', 'quarter', 'year'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  predicted_revenue DECIMAL(15, 2) NOT NULL,
  confidence_interval_low DECIMAL(15, 2),
  confidence_interval_high DECIMAL(15, 2),
  actual_revenue DECIMAL(15, 2),
  accuracy_score DECIMAL(5, 2),
  contributing_deals JSONB, -- Deals contributing to forecast
  model_version VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, forecast_period, start_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contacts_ai_score ON contacts(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_engagement_score ON contacts(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_deals_ai_win_probability ON deals(ai_win_probability DESC);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_entity ON ai_predictions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_model ON ai_predictions(model_type);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_org ON ai_predictions(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_training_org ON ai_training_data(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user ON ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_status ON ai_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_entity ON ai_recommendations(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_enrichment_queue_status ON ai_enrichment_queue(status);
CREATE INDEX IF NOT EXISTS idx_ai_enrichment_queue_contact ON ai_enrichment_queue(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversation_analysis_entity ON conversation_analysis(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_conversation_analysis_sentiment ON conversation_analysis(sentiment);
CREATE INDEX IF NOT EXISTS idx_smart_lists_org ON smart_lists(organization_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_org_period ON forecasts(organization_id, forecast_period, start_date);

-- Create triggers
CREATE TRIGGER update_smart_lists_updated_at
  BEFORE UPDATE ON smart_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ai_predictions TO postgres;
GRANT ALL PRIVILEGES ON ai_training_data TO postgres;
GRANT ALL PRIVILEGES ON ai_recommendations TO postgres;
GRANT ALL PRIVILEGES ON ai_enrichment_queue TO postgres;
GRANT ALL PRIVILEGES ON conversation_analysis TO postgres;
GRANT ALL PRIVILEGES ON smart_lists TO postgres;
GRANT ALL PRIVILEGES ON forecasts TO postgres;

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(contact_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  email_opens INTEGER;
  email_clicks INTEGER;
  activities_count INTEGER;
  days_since_last_activity INTEGER;
  score INTEGER := 0;
BEGIN
  -- Count email engagement
  SELECT COUNT(*) INTO email_opens FROM email_logs WHERE contact_id = contact_uuid AND status = 'opened';
  SELECT COUNT(*) INTO email_clicks FROM email_logs WHERE contact_id = contact_uuid AND status = 'clicked';
  SELECT COUNT(*) INTO activities_count FROM activities WHERE contact_id = contact_uuid;

  -- Calculate days since last activity
  SELECT EXTRACT(DAY FROM (NOW() - MAX(created_at)))::INTEGER INTO days_since_last_activity
  FROM activities WHERE contact_id = contact_uuid;

  -- Calculate score (0-100)
  score := LEAST(100,
    (email_opens * 5) +
    (email_clicks * 10) +
    (activities_count * 3) -
    COALESCE(days_since_last_activity, 30)
  );

  RETURN GREATEST(0, score);
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE ai_predictions IS 'AI model predictions for leads, deals, and forecasts';
COMMENT ON TABLE ai_training_data IS 'Historical data for training ML models';
COMMENT ON TABLE ai_recommendations IS 'AI-generated action recommendations for users';
COMMENT ON TABLE ai_enrichment_queue IS 'Queue for enriching contacts with external data';
COMMENT ON TABLE conversation_analysis IS 'AI sentiment and topic analysis of conversations';
COMMENT ON TABLE smart_lists IS 'Dynamic AI-powered contact/deal segments';
COMMENT ON TABLE forecasts IS 'AI revenue forecasting with confidence intervals';
COMMENT ON COLUMN contacts.ai_score IS 'AI-calculated lead quality score (0-100)';
COMMENT ON COLUMN contacts.engagement_score IS 'Engagement activity score (0-100)';
COMMENT ON COLUMN deals.ai_win_probability IS 'AI-predicted probability of winning deal (0-100)';
