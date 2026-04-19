-- +goose Up
-- +goose StatementBegin

-- Add a new shop_items.category for AVATAR base bodies (5).
-- Slot 'avatar' so the cosmetic-equip transaction in EquipCosmetic
-- enforces "one avatar per user" automatically.
--
-- Seed five base avatars:
--  • Two free (warden + mage) — picked during onboarding
--  • Three premium (rogue / paladin / archivist) — bought from the tavern
--
-- icon_ref is the static asset path so the shop renders the SVG inline.
-- ShopPage.renderIcon detects path-like icon_refs and falls back to <img>.
DO $$
BEGIN
    INSERT INTO shop_items (id, slug, name, description, category, rarity, currency, price, icon_ref, accent_color, is_active, slot)
    VALUES
      ('00000001-c05e-0005-0000-000000000001', 'avatar:warden',    'Warden',
        'Стартовый аватар. Простой и серьёзный страж — выбирается при онбординге.',
        7, 1, 1, 0,    '/img/people/avatar-warden.svg',    '#5b4331', TRUE, 'avatar'),
      ('00000001-c05e-0005-0000-000000000002', 'avatar:mage',      'Mage',
        'Стартовый аватар. Маг-исследователь, для тех, кто любит поразмышлять.',
        7, 1, 1, 0,    '/img/people/avatar-mage.svg',      '#3d6149', TRUE, 'avatar'),
      ('00000001-c05e-0005-0000-000000000003', 'avatar:rogue',     'Rogue',
        'Премиум-аватар: ловкий разбойник для скоростных дуэлей.',
        7, 3, 1, 1500, '/img/people/avatar-rogue.svg',     '#3b2a1a', TRUE, 'avatar'),
      ('00000001-c05e-0005-0000-000000000004', 'avatar:paladin',   'Paladin',
        'Премиум-аватар: рыцарь долга, хорош для гильдийных войн.',
        7, 4, 1, 2800, '/img/people/avatar-paladin.svg',   '#7a3d12', TRUE, 'avatar'),
      ('00000001-c05e-0005-0000-000000000005', 'avatar:archivist', 'Archivist',
        'Легендарный аватар: учёный-летописец из Эмбер-Пакта.',
        7, 5, 2, 200,  '/img/people/avatar-archivist.svg', '#c7ab6e', TRUE, 'avatar')
    ON CONFLICT (slug) DO NOTHING;

    -- Free avatars are auto-granted to every existing user so onboarding
    -- pickers always have at least the two starter options to choose from.
    INSERT INTO user_shop_inventory (user_id, item_id, equipped, acquired_at)
    SELECT u.id, s.id, FALSE, NOW()
    FROM users u
    CROSS JOIN shop_items s
    WHERE s.slug IN ('avatar:warden', 'avatar:mage')
    ON CONFLICT (user_id, item_id) DO NOTHING;
END $$;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DELETE FROM shop_items WHERE slug LIKE 'avatar:%';
-- +goose StatementEnd
