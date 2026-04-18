-- +goose Up
-- Passive skill tree: user allocations and earned points ledger.

CREATE TABLE IF NOT EXISTS user_skill_points (
  user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  earned      INT NOT NULL DEFAULT 0 CHECK (earned >= 0),
  spent       INT NOT NULL DEFAULT 0 CHECK (spent >= 0),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per allocated skill node; PK ensures no duplicate allocations.
CREATE TABLE IF NOT EXISTS user_skill_allocations (
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id     TEXT NOT NULL,
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, skill_id)
);

CREATE INDEX idx_user_skill_allocations_user ON user_skill_allocations(user_id);

-- +goose Down
DROP TABLE IF EXISTS user_skill_allocations;
DROP TABLE IF EXISTS user_skill_points;
