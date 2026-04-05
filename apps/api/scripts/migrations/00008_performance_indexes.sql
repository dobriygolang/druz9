-- +goose Up

-- events: creator_id filter (used in ListEvents when filtering by creator)
CREATE INDEX idx_events_creator_id ON events(creator_id);

-- podcasts: partial index covering only uploaded podcasts (object_key != null/empty)
-- aligns with the WHERE clause used in ListPodcasts and CleanupStaleDrafts
CREATE INDEX idx_podcasts_uploaded ON podcasts(created_at DESC)
  WHERE object_key IS NOT NULL AND object_key <> '';

-- circles: creator_id lookup
CREATE INDEX idx_circles_creator_id ON circles(creator_id);

-- +goose Down
DROP INDEX IF EXISTS idx_circles_creator_id;
DROP INDEX IF EXISTS idx_podcasts_uploaded;
DROP INDEX IF EXISTS idx_events_creator_id;
