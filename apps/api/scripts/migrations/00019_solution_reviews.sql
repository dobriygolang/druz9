-- +goose Up

-- Pattern and optimal complexity metadata for tasks
ALTER TABLE code_tasks ADD COLUMN IF NOT EXISTS pattern TEXT NOT NULL DEFAULT '';
ALTER TABLE code_tasks ADD COLUMN IF NOT EXISTS optimal_time_complexity TEXT NOT NULL DEFAULT '';
ALTER TABLE code_tasks ADD COLUMN IF NOT EXISTS optimal_space_complexity TEXT NOT NULL DEFAULT '';

-- Aggregated per-task statistics (materialized periodically)
CREATE TABLE task_stats (
  task_id UUID PRIMARY KEY REFERENCES code_tasks(id) ON DELETE CASCADE,
  median_solve_time_ms BIGINT NOT NULL DEFAULT 0,
  total_solves INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unified solution reviews across all modes
CREATE TABLE solution_reviews (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('daily', 'practice', 'duel', 'mock')),
  task_id UUID NOT NULL REFERENCES code_tasks(id) ON DELETE CASCADE,

  -- Level 1: instant feedback (filled synchronously)
  is_correct BOOLEAN NOT NULL,
  attempt_number INT NOT NULL DEFAULT 1,
  solve_time_ms BIGINT NOT NULL DEFAULT 0,
  median_time_ms BIGINT NOT NULL DEFAULT 0,
  passed_count INT NOT NULL DEFAULT 0,
  total_count INT NOT NULL DEFAULT 0,

  -- Level 2: AI review (filled asynchronously, nullable until ready)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed')),
  ai_verdict TEXT CHECK (ai_verdict IN ('optimal', 'good', 'suboptimal', 'brute_force')),
  ai_time_complexity TEXT,
  ai_space_complexity TEXT,
  ai_pattern TEXT,
  ai_strengths TEXT[] NOT NULL DEFAULT '{}',
  ai_weaknesses TEXT[] NOT NULL DEFAULT '{}',
  ai_hint TEXT,
  ai_skill_signals JSONB,
  ai_provider TEXT,
  ai_model TEXT,

  -- Level 3: duel comparison (nullable, only for duels)
  opponent_submission_id UUID,
  comparison_summary TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_solution_reviews_user_task ON solution_reviews(user_id, task_id);
CREATE INDEX idx_solution_reviews_user_pattern ON solution_reviews(user_id, ai_pattern) WHERE ai_pattern IS NOT NULL;
CREATE INDEX idx_solution_reviews_submission ON solution_reviews(submission_id);
CREATE INDEX idx_solution_reviews_user_created ON solution_reviews(user_id, created_at DESC);

-- +goose Down
DROP INDEX IF EXISTS idx_solution_reviews_user_created;
DROP INDEX IF EXISTS idx_solution_reviews_submission;
DROP INDEX IF EXISTS idx_solution_reviews_user_pattern;
DROP INDEX IF EXISTS idx_solution_reviews_user_task;
DROP TABLE IF EXISTS solution_reviews;
DROP TABLE IF EXISTS task_stats;
ALTER TABLE code_tasks DROP COLUMN IF EXISTS optimal_space_complexity;
ALTER TABLE code_tasks DROP COLUMN IF EXISTS optimal_time_complexity;
ALTER TABLE code_tasks DROP COLUMN IF EXISTS pattern;
