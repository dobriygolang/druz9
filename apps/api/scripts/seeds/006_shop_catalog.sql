-- Seed the tavern catalog with the items that were previously hard-coded
-- on the front-end. Idempotent via the unique slug.
--
-- Category: 1 decor, 2 cosmetics, 3 ambient, 4 pets, 5 guild, 6 seasonal
-- Rarity:   1 common, 2 uncommon, 3 rare, 4 epic, 5 legendary
-- Currency: 1 gold, 2 gems, 3 shards

INSERT INTO shop_items (slug, name, description, category, rarity, currency, price, icon_ref, accent_color, is_seasonal)
VALUES
    -- decor
    ('oakshelf',       'Oakwood shelf',          'A modest bookshelf for your hero chamber.',         1, 1, 1, 90,   'Bookshelf',  '#7a593a', FALSE),
    ('ember-brazier',  'Ember brazier',          'A warm brazier crackling with ember light.',        1, 2, 1, 220,  'Torch',      '#b8692a', FALSE),
    ('silver-window',  'Silver dusk window',     'A window looking into the dusk.',                   1, 3, 1, 380,  'PixelWindow','#3b6a8f', FALSE),
    ('fireplace',      'Crimson fireplace',      'A crackling hearth of crimson flame.',              1, 4, 1, 720,  'Fireplace',  '#a23a2a', FALSE),
    ('moss-rug',       'Mossvale rug',           'Soft green weave from Mossvale looms.',             1, 2, 1, 140,  'Rug',        '#3d6149', FALSE),
    ('ancestor',       'Ancestor statue',        'A stone watcher honouring past heroes.',            1, 3, 1, 480,  'Statue',     '#c7ab6e', FALSE),
    ('emberglass',     'Emberglass chest',       'A chest that glows from within.',                   1, 5, 1, 1480, 'Chest',      '#e9b866', FALSE),
    ('duskbanner',     'Dusk banner',            'Banner woven in dusk-dye.',                         1, 3, 1, 320,  'Banner',     '#7a3d12', FALSE),

    -- cosmetics
    ('moonveil',       'Moonveil Aura',          'A soft silver aura follows your hero.',             2, 4, 1, 480,  'SpiritOrb',  '#8fb8d4', FALSE),
    ('emberward',      'Emberward Cloak',        'A cloak the Ember Bearers used to wear.',           2, 5, 1, 920,  'Hero',       '#c85a2d', FALSE),
    ('siegebreaker',   'Siegebreaker title',     'Claim the "Siegebreaker" hero title.',              2, 3, 1, 280,  'Sword',      '#a23a2a', FALSE),
    ('oakleaf-frame',  'Oakleaf Frame',          'A mossy oakleaf frame around your avatar.',         2, 2, 1, 140,  'Banner',     '#3d6149', FALSE),

    -- ambient
    ('fireflies',      'Fireflies',              'Drifting fireflies above your profile.',            3, 1, 1, 80,   'Fireflies',  '#e9b866', FALSE),
    ('snow',           'Snowfall',               'Gentle snowfall on your hero chamber.',             3, 2, 1, 180,  'Snow',       '#c0cad2', FALSE),
    ('rain',           'Autumn rain',            'Cold autumn rain drumming softly.',                 3, 2, 1, 180,  'Rain',       '#3b6a8f', FALSE),
    ('mist',           'Magical mist',           'Faint mist wraps the profile.',                     3, 3, 1, 360,  'Mist',       '#9fb89a', FALSE),

    -- pets
    ('slime',          'Moss Slime',             'A lazy but loyal slime.',                           4, 1, 1, 120,  'SlimePet',   '#3d6149', FALSE),
    ('raven',          'Raven familiar',         'A sharp-eyed raven bringing patch notes.',          4, 3, 1, 260,  'RavenPet',   '#3b2a1e', FALSE),
    ('orb',            'Spirit orb',             'A whispering orb — sometimes right.',               4, 4, 1, 540,  'SpiritOrb',  '#a27ac8', FALSE),

    -- guild
    ('gbanner',        'Raven banner',           'Raven-crest banner for guild halls.',               5, 4, 1, 1200, 'Banner',     '#a23a2a', FALSE),
    ('pillar',         'Victory pillar',         'A grand victory pillar for guild halls.',           5, 5, 1, 3600, 'Trophy',     '#e9b866', FALSE),

    -- seasonal (no price — event-drop only)
    ('ember-pact',     'Ember Pact crown',       'Awarded to Ember Pact season chapter finishers.',   6, 5, 3, 200,  'Trophy',     '#e9b866', TRUE),
    ('harvest',        'Harvest lantern',        'Drops from the Harvest event.',                     6, 3, 3, 50,   'Torch',      '#b8692a', TRUE)
ON CONFLICT (slug) DO NOTHING;
