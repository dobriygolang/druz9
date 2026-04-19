-- +goose Up
-- +goose StatementBegin

-- ADR-003 — Guild-owned cosmetics. Mirrors user_shop_inventory but keyed by
-- guild_id. Used by Guild Hall scene editor. Donations and bank purchases
-- both insert here; CREATOR/OFFICER permissions are enforced in the service
-- layer (see internal/api/guild/permissions.go).
CREATE TABLE IF NOT EXISTS guild_inventory (
    guild_id     UUID         NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    item_id      UUID         NOT NULL REFERENCES shop_items(id),
    acquired_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    acquired_by  UUID         NOT NULL,        -- user who donated / spent bank
    source       TEXT         NOT NULL DEFAULT 'donation' CHECK (source IN ('donation','bank_purchase')),
    PRIMARY KEY (guild_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_guild_inventory_item ON guild_inventory(item_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_guild_inventory_item;
DROP TABLE IF EXISTS guild_inventory;
-- +goose StatementEnd
