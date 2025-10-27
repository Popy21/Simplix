-- ============================================================================
-- Migration 008: add probability column to deals
-- ============================================================================

ALTER TABLE deals
ADD COLUMN IF NOT EXISTS probability INTEGER;

UPDATE deals d
SET probability = COALESCE(d.probability, ps.win_probability, 0)
FROM pipeline_stages ps
WHERE d.stage_id = ps.id;

ALTER TABLE deals
ALTER COLUMN probability SET DEFAULT 0;

ALTER TABLE deals
ALTER COLUMN probability SET NOT NULL;

ALTER TABLE deals
DROP CONSTRAINT IF EXISTS deal_probability_range;

ALTER TABLE deals
ADD CONSTRAINT deal_probability_range
CHECK (probability >= 0 AND probability <= 100);
