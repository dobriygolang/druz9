-- Atlas region tags for GetRegionContext aggregate badges.

-- +goose Up
ALTER TABLE IF EXISTS guilds
  ADD COLUMN IF NOT EXISTS region_tag TEXT NOT NULL DEFAULT '';
ALTER TABLE IF EXISTS events
  ADD COLUMN IF NOT EXISTS region_tag TEXT NOT NULL DEFAULT '';
ALTER TABLE IF EXISTS podcasts
  ADD COLUMN IF NOT EXISTS region_tag TEXT NOT NULL DEFAULT '';

UPDATE guilds
SET region_tag = lower(regexp_replace(region, '[^a-zA-Z0-9]+', '_', 'g'))
WHERE region_tag = '' AND COALESCE(region, '') <> '';

UPDATE events
SET region_tag = lower(regexp_replace(region, '[^a-zA-Z0-9]+', '_', 'g'))
WHERE region_tag = '' AND COALESCE(region, '') <> '';

CREATE INDEX IF NOT EXISTS idx_guilds_region_tag_public
  ON guilds(region_tag)
  WHERE is_public = TRUE;

CREATE INDEX IF NOT EXISTS idx_events_region_tag_open
  ON events(region_tag, scheduled_at)
  WHERE is_public = TRUE AND status = 'approved';

CREATE INDEX IF NOT EXISTS idx_podcasts_region_tag_uploaded
  ON podcasts(region_tag)
  WHERE object_key IS NOT NULL AND object_key <> '';

-- +goose Down
DROP INDEX IF EXISTS idx_podcasts_region_tag_uploaded;
DROP INDEX IF EXISTS idx_events_region_tag_open;
DROP INDEX IF EXISTS idx_guilds_region_tag_public;

ALTER TABLE IF EXISTS podcasts DROP COLUMN IF EXISTS region_tag;
ALTER TABLE IF EXISTS events DROP COLUMN IF EXISTS region_tag;
ALTER TABLE IF EXISTS guilds DROP COLUMN IF EXISTS region_tag;
