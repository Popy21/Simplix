-- Migration: Remove AI features
-- Removes all AI-related tables and columns

-- Drop AI columns from contacts
ALTER TABLE contacts DROP COLUMN IF EXISTS ai_score;
ALTER TABLE contacts DROP COLUMN IF EXISTS ai_score_updated_at;
ALTER TABLE contacts DROP COLUMN IF EXISTS ai_insights;
ALTER TABLE contacts DROP COLUMN IF EXISTS engagement_score;
ALTER TABLE contacts DROP COLUMN IF EXISTS last_engagement_at;

-- Drop AI columns from deals
ALTER TABLE deals DROP COLUMN IF EXISTS ai_win_probability;
ALTER TABLE deals DROP COLUMN IF EXISTS ai_recommended_actions;
ALTER TABLE deals DROP COLUMN IF EXISTS ai_risk_factors;
ALTER TABLE deals DROP COLUMN IF EXISTS predicted_close_date;
ALTER TABLE deals DROP COLUMN IF EXISTS predicted_value;

-- Drop AI tables
DROP TABLE IF EXISTS ai_predictions CASCADE;
DROP TABLE IF EXISTS ai_training_data CASCADE;
DROP TABLE IF EXISTS ai_recommendations CASCADE;
DROP TABLE IF EXISTS ai_enrichment_queue CASCADE;
DROP TABLE IF EXISTS conversation_analysis CASCADE;
DROP TABLE IF EXISTS smart_lists CASCADE;
DROP TABLE IF EXISTS forecasts CASCADE;

-- Drop AI function
DROP FUNCTION IF EXISTS calculate_engagement_score(UUID);
