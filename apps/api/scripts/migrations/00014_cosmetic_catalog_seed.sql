-- +goose Up
-- +goose StatementBegin

-- Seed the cosmetic catalog in the tavern (shop_items). These are the
-- room layouts / hero poses / companions / time-of-day skins that used
-- to live as free options in Settings → Flavour & tweaks. Moving them
-- here gives players a progression loop: starter account always has the
-- defaults (cozy room, idle pose, slime pet, day time), extra variants
-- must be earned or purchased. Matches the user's ask on 2026-04-18.

DO $$
DECLARE
    -- stable UUIDs so re-running this migration on a different env keeps
    -- the same ids. Pattern: 0000xxxx-cosm-0xxx with the slot encoded in
    -- the last segment.
    fn_id UUID;
BEGIN
    -- Helper: insert a cosmetic item if its slug isn't already present.
    -- Categories:  2 = COSMETICS (character-level skin),
    --              3 = AMBIENT (environment / room mood),
    --              4 = PETS (companions).
    -- Rarities:    2 = UNCOMMON, 3 = RARE, 4 = EPIC, 5 = LEGENDARY.
    -- Currency:    1 = GOLD, 2 = GEMS.

    -- Room layouts (ambient) ------------------------------------------------
    INSERT INTO shop_items (id, slug, name, description, category, rarity, currency, price, icon_ref, accent_color, is_active)
    VALUES
      ('00000001-c05e-0001-0000-000000000001', 'room:scholar',  'Scholar chamber',  'Cool-toned study room with mossy walls and scrolls.',           3, 3, 1, 1800, 'Bookshelf', '#3d6149', TRUE),
      ('00000001-c05e-0001-0000-000000000002', 'room:warrior',  'Warrior hall',     'Battle-scarred hall with torch-lit columns and banners.',        3, 4, 1, 2800, 'Sword',     '#7a3d12', TRUE)
    ON CONFLICT (slug) DO NOTHING;

    -- Hero poses (cosmetic) -------------------------------------------------
    INSERT INTO shop_items (id, slug, name, description, category, rarity, currency, price, icon_ref, accent_color, is_active)
    VALUES
      ('00000001-c05e-0002-0000-000000000001', 'pose:wave',     'Friendly wave',    'Your hero greets visitors with a salute instead of standing idle.', 2, 2, 1, 500,  'Hero',    '#e9b866', TRUE),
      ('00000001-c05e-0002-0000-000000000002', 'pose:trophy',   'Trophy-bearer',    'Hold a trophy aloft — earned after finishing a major milestone.',   2, 4, 2, 80,   'Trophy',  '#c7ab6e', TRUE)
    ON CONFLICT (slug) DO NOTHING;

    -- Companions (pets) ----------------------------------------------------
    INSERT INTO shop_items (id, slug, name, description, category, rarity, currency, price, icon_ref, accent_color, is_active)
    VALUES
      ('00000001-c05e-0003-0000-000000000001', 'pet:raven',     'Ember raven',      'A small raven that circles your profile header.',                 4, 3, 1, 2200, 'RavenPet', '#3b2a1a', TRUE),
      ('00000001-c05e-0003-0000-000000000002', 'pet:orb',       'Spirit orb',       'A glowing orb that pulses with your streak colour.',              4, 4, 2, 120,  'SpiritOrb','#e9b866', TRUE)
    ON CONFLICT (slug) DO NOTHING;

    -- Time-of-day (ambient) ------------------------------------------------
    INSERT INTO shop_items (id, slug, name, description, category, rarity, currency, price, icon_ref, accent_color, is_active)
    VALUES
      ('00000001-c05e-0004-0000-000000000001', 'season:dusk',   'Dusk ambience',    'Soft orange dusk light tint for the top strip.',                  3, 2, 1, 900,  'SpiritOrb','#b8692a', TRUE),
      ('00000001-c05e-0004-0000-000000000002', 'season:night',  'Night ambience',   'Deep blue night backdrop — fireflies glow brighter.',             3, 3, 1, 1500, 'Fireflies','#2a3a5c', TRUE),
      ('00000001-c05e-0004-0000-000000000003', 'season:winter', 'Winter ambience',  'Snowflakes and cool parchment palette.',                          3, 4, 2, 150,  'Statue',   '#c0cad2', TRUE)
    ON CONFLICT (slug) DO NOTHING;

END $$;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM shop_items WHERE slug LIKE 'room:%' OR slug LIKE 'pose:%' OR slug LIKE 'pet:%' OR slug LIKE 'season:%';
-- +goose StatementEnd
