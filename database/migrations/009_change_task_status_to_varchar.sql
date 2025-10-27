-- Migration 009: Change task_status from ENUM to VARCHAR
-- Description: Allow custom task statuses in Kanban board
-- Author: Team Simplix
-- Date: 2025-10-26

-- Convert status column from ENUM to VARCHAR
ALTER TABLE tasks
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE VARCHAR(50) USING status::text,
  ALTER COLUMN status SET DEFAULT 'todo';

-- Update priority column to also use VARCHAR for consistency
ALTER TABLE tasks
  ALTER COLUMN priority DROP DEFAULT,
  ALTER COLUMN priority TYPE VARCHAR(50) USING priority::text,
  ALTER COLUMN priority SET DEFAULT 'medium';

-- Drop the old ENUM types (optional, but recommended for cleanup)
-- Note: This will only work if no other tables are using these types
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;

-- Add indexes for the new VARCHAR columns
CREATE INDEX IF NOT EXISTS idx_tasks_status_varchar ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority_varchar ON tasks(priority);

-- Update any existing statuses to ensure they're valid
UPDATE tasks SET status = 'todo' WHERE status IS NULL;
UPDATE tasks SET priority = 'medium' WHERE priority IS NULL;

COMMENT ON COLUMN tasks.status IS 'Task status - supports custom values for Kanban columns';
COMMENT ON COLUMN tasks.priority IS 'Task priority - supports custom priority levels';
