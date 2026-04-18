-- +goose Up
-- +goose StatementBegin

-- Arena player ratings table — required by the guild leaderboard query
-- (data/arena/leaderboards.go:37). The code references it via LEFT JOIN,
-- but absent the table Postgres refuses the whole statement with
-- "relation arena_player_ratings does not exist". Creating a minimal
-- empty table lets the query fall through with zero avg_rating instead
-- of 500-ing. Fill in real ratings via the arena matchmaker later.
CREATE TABLE IF NOT EXISTS arena_player_ratings (
  user_id    UUID         PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  rating     INT          NOT NULL DEFAULT 1000,
  league     SMALLINT     NOT NULL DEFAULT 1,  -- 1=bronze, 2=silver, 3=gold, 4=platinum...
  games      INT          NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT arena_player_ratings_rating_nonneg CHECK (rating >= 0)
);

CREATE INDEX IF NOT EXISTS idx_arena_player_ratings_rating ON arena_player_ratings(rating DESC);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS arena_player_ratings;
-- +goose StatementEnd
