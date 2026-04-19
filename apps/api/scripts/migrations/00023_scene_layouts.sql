-- +goose Up
-- +goose StatementBegin

-- ADR-003 — Scene composition engine. One layout per (scope, owner_id):
--   scope = 'user_room'  -> owner_id is users.id
--   scope = 'guild_hall' -> owner_id is guilds.id
-- Items inside a layout reference shop_items so we always render the latest
-- art / metadata. Ownership invariant (item belongs to user or guild) is
-- enforced in the service layer, not in the DB — items can be donated /
-- transferred and the layout should remain consistent.
CREATE TABLE IF NOT EXISTS scene_layouts (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    scope           TEXT         NOT NULL CHECK (scope IN ('user_room','guild_hall')),
    owner_id        UUID         NOT NULL,
    width           INT          NOT NULL DEFAULT 1200,
    height          INT          NOT NULL DEFAULT 800,
    background_ref  TEXT         NOT NULL DEFAULT '',
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_by      UUID         NOT NULL,
    UNIQUE (scope, owner_id)
);

CREATE TABLE IF NOT EXISTS scene_placed_items (
    id            UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id     UUID              NOT NULL REFERENCES scene_layouts(id) ON DELETE CASCADE,
    item_id       UUID              NOT NULL REFERENCES shop_items(id),
    x             DOUBLE PRECISION  NOT NULL,
    y             DOUBLE PRECISION  NOT NULL,
    scale         DOUBLE PRECISION  NOT NULL DEFAULT 1.0 CHECK (scale > 0),
    rotation_deg  DOUBLE PRECISION  NOT NULL DEFAULT 0,
    z_index       INT               NOT NULL DEFAULT 0,
    flipped       BOOLEAN           NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_scene_placed_items_layout ON scene_placed_items(layout_id);
CREATE INDEX IF NOT EXISTS idx_scene_layouts_owner ON scene_layouts(scope, owner_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_scene_layouts_owner;
DROP INDEX IF EXISTS idx_scene_placed_items_layout;
DROP TABLE IF EXISTS scene_placed_items;
DROP TABLE IF EXISTS scene_layouts;
-- +goose StatementEnd
