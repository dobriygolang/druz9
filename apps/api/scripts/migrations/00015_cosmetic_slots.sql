-- +goose Up
-- +goose StatementBegin

-- Wave D — Avatar customization. Each cosmetic item now declares a `slot`:
-- the anatomical / environmental position it occupies when equipped. The
-- Hero sprite on the profile layers SVGs by slot, so only one item per
-- slot can be equipped at a time. Items with an empty slot are legacy /
-- non-equippable (kept for backwards compatibility).
--
-- Slot vocabulary (open-ended; client maps unknown → ignore):
--   pose      — hero body pose overlay (wave, trophy, …)
--   pet       — companion next to the hero
--   room      — backdrop / room layout
--   ambience  — time-of-day tint / particle effect
--   head      — headgear overlay (future)
--   body      — torso overlay (future)
--   back      — cape / wings (future)
--   aura      — glow around the hero (future)
--   frame     — profile frame border (future)

ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS slot TEXT NOT NULL DEFAULT '';

-- Backfill the 9 items seeded in 00014 by slug prefix.
UPDATE shop_items SET slot = 'pose'     WHERE slug LIKE 'pose:%'   AND slot = '';
UPDATE shop_items SET slot = 'pet'      WHERE slug LIKE 'pet:%'    AND slot = '';
UPDATE shop_items SET slot = 'room'     WHERE slug LIKE 'room:%'   AND slot = '';
UPDATE shop_items SET slot = 'ambience' WHERE slug LIKE 'season:%' AND slot = '';

CREATE INDEX IF NOT EXISTS idx_shop_items_slot ON shop_items(slot) WHERE slot <> '';

-- One-item-per-slot uniqueness is enforced in the EquipCosmetic service
-- inside a transaction (UPDATE …  SET equipped=FALSE WHERE slot=$target
-- FOR UPDATE, then UPDATE chosen SET equipped=TRUE). No DB-level unique
-- index — Postgres doesn't allow subqueries in index expressions.

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_shop_items_slot;
ALTER TABLE shop_items DROP COLUMN IF EXISTS slot;
-- +goose StatementEnd
