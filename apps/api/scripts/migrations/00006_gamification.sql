-- +goose Up
-- Gamification: guilds (renamed from circles in 00033), season missions/progress,
-- season pass, streak shields, shop, wallets.
-- Consolidated from original migrations 00007, 00008 (guilds creator idx), 00020,
-- 00022, 00031, 00032, 00033 (rename), 00034, 00036, 00037, 00038 (CHECKs).

-- Guilds (was circles).
CREATE TABLE IF NOT EXISTS guilds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  creator_id UUID NOT NULL REFERENCES users(id),
  member_count INT NOT NULL DEFAULT 0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  region TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT guilds_name_len CHECK (char_length(name) <= 100),
  CONSTRAINT guilds_description_len CHECK (char_length(description) <= 2000)
);

CREATE INDEX idx_guilds_created ON guilds(created_at DESC);
CREATE INDEX idx_guilds_creator_id ON guilds(creator_id);
CREATE INDEX idx_guilds_location ON guilds(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE TABLE IF NOT EXISTS guild_members (
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (guild_id, user_id)
);

CREATE INDEX idx_guild_members_user ON guild_members(user_id);

-- Guild events (join table linking events scheduled for a guild).
CREATE TABLE IF NOT EXISTS guild_events (
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (guild_id, event_id)
);

CREATE INDEX idx_guild_events_event ON guild_events(event_id);

-- Guild-scoped challenges.
CREATE TABLE IF NOT EXISTS guild_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL CHECK (template_key IN ('streak_days', 'daily_completion', 'duels_count', 'mocks_count')),
  target_value INT NOT NULL CHECK (target_value > 0),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_guild_challenges_guild_active ON guild_challenges(guild_id, ends_at DESC);

-- Per-user contributions toward a guild challenge.
CREATE TABLE IF NOT EXISTS guild_challenge_contributions (
  challenge_id UUID NOT NULL REFERENCES guild_challenges(id) ON DELETE CASCADE,
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contribution INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (challenge_id, user_id)
);

CREATE INDEX idx_guild_challenge_contributions_guild ON guild_challenge_contributions(guild_id);

-- Rolling aggregate of guild activity used by pulse digests.
CREATE TABLE IF NOT EXISTS guild_pulse (
  guild_id UUID PRIMARY KEY REFERENCES guilds(id) ON DELETE CASCADE,
  active_members_week INT NOT NULL DEFAULT 0,
  duels_week INT NOT NULL DEFAULT 0,
  mocks_week INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Season passes.
CREATE TABLE IF NOT EXISTS season_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number INT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  max_tier INT NOT NULL DEFAULT 40,
  xp_per_tier INT NOT NULL DEFAULT 500,
  premium_price_gems INT NOT NULL DEFAULT 400,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT season_passes_window_valid CHECK (ends_at > starts_at),
  CONSTRAINT season_passes_max_tier_positive CHECK (max_tier > 0),
  CONSTRAINT season_passes_xp_positive CHECK (xp_per_tier > 0)
);

CREATE INDEX idx_season_passes_window ON season_passes(starts_at, ends_at);

CREATE TABLE IF NOT EXISTS season_pass_tiers (
  season_pass_id UUID NOT NULL REFERENCES season_passes(id) ON DELETE CASCADE,
  tier INT NOT NULL,
  free_reward_kind SMALLINT NOT NULL DEFAULT 0,
  free_reward_amount INT NOT NULL DEFAULT 0,
  free_reward_label TEXT NOT NULL DEFAULT '',
  premium_reward_kind SMALLINT NOT NULL DEFAULT 0,
  premium_reward_amount INT NOT NULL DEFAULT 0,
  premium_reward_label TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (season_pass_id, tier),
  CONSTRAINT season_pass_tier_positive CHECK (tier > 0)
);

CREATE TABLE IF NOT EXISTS user_season_pass_progress (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_pass_id UUID NOT NULL REFERENCES season_passes(id) ON DELETE CASCADE,
  xp INT NOT NULL DEFAULT 0,
  has_premium BOOLEAN NOT NULL DEFAULT FALSE,
  claimed_free INT[] NOT NULL DEFAULT ARRAY[]::INT[],
  claimed_premium INT[] NOT NULL DEFAULT ARRAY[]::INT[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, season_pass_id),
  CONSTRAINT user_season_pass_xp_nonneg CHECK (xp >= 0)
);

-- Season mission definitions.
CREATE TABLE IF NOT EXISTS season_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number SMALLINT NOT NULL,
  mission_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  target_value INT NOT NULL,
  xp_reward INT NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_season_missions_season ON season_missions(season_number);

CREATE TABLE IF NOT EXISTS user_season_progress (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_number SMALLINT NOT NULL,
  mission_id UUID NOT NULL REFERENCES season_missions(id) ON DELETE CASCADE,
  current_value INT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, mission_id)
);

CREATE INDEX idx_usp_user_season ON user_season_progress(user_id, season_number);

-- Daily/weekly mission completion log.
CREATE TABLE IF NOT EXISTS user_mission_completions (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_key TEXT NOT NULL,
  period_key TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, mission_key, period_key)
);

CREATE INDEX idx_umc_user_period ON user_mission_completions(user_id, period_key);

-- Streak shields.
CREATE TABLE IF NOT EXISTS user_streak_shields (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  owned_count INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  last_restored_to INT,
  total_purchased INT NOT NULL DEFAULT 0,
  total_used INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_streak_shields_owned_nonneg CHECK (owned_count >= 0)
);

-- Shop.
CREATE TABLE IF NOT EXISTS shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category SMALLINT NOT NULL,
  rarity SMALLINT NOT NULL DEFAULT 1,
  currency SMALLINT NOT NULL DEFAULT 1,
  price INT NOT NULL DEFAULT 0,
  icon_ref TEXT NOT NULL DEFAULT '',
  accent_color TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_seasonal BOOLEAN NOT NULL DEFAULT FALSE,
  rotates_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT shop_items_price_nonneg CHECK (price >= 0),
  CONSTRAINT shop_items_rarity_range CHECK (rarity BETWEEN 1 AND 5),
  CONSTRAINT shop_items_name_len CHECK (char_length(name) <= 120),
  CONSTRAINT shop_items_description_len CHECK (char_length(description) <= 2000)
);

CREATE INDEX idx_shop_items_category ON shop_items(category) WHERE is_active = TRUE;
CREATE INDEX idx_shop_items_rarity   ON shop_items(rarity)   WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS user_shop_inventory (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  equipped BOOLEAN NOT NULL DEFAULT FALSE,
  price_paid INT NOT NULL DEFAULT 0,
  currency SMALLINT NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, item_id)
);

CREATE INDEX idx_user_inventory_user ON user_shop_inventory(user_id);
CREATE INDEX idx_user_inventory_equipped ON user_shop_inventory(user_id) WHERE equipped = TRUE;

-- Wallets: first-class currency balances + audit ledger.
CREATE TABLE IF NOT EXISTS user_wallets (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  gold INT NOT NULL DEFAULT 0,
  gems INT NOT NULL DEFAULT 0,
  shards INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_wallets_gold_nonneg CHECK (gold >= 0),
  CONSTRAINT user_wallets_gems_nonneg CHECK (gems >= 0),
  CONSTRAINT user_wallets_shards_nonneg CHECK (shards >= 0)
);

CREATE TABLE IF NOT EXISTS user_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency SMALLINT NOT NULL,
  amount INT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  source_kind TEXT NOT NULL DEFAULT '',
  source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_tx_user ON user_wallet_transactions(user_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS user_wallet_transactions;
DROP TABLE IF EXISTS user_wallets;
DROP TABLE IF EXISTS user_shop_inventory;
DROP TABLE IF EXISTS shop_items;
DROP TABLE IF EXISTS user_streak_shields;
DROP TABLE IF EXISTS user_mission_completions;
DROP TABLE IF EXISTS user_season_progress;
DROP TABLE IF EXISTS season_missions;
DROP TABLE IF EXISTS user_season_pass_progress;
DROP TABLE IF EXISTS season_pass_tiers;
DROP TABLE IF EXISTS season_passes;
DROP TABLE IF EXISTS guild_pulse;
DROP TABLE IF EXISTS guild_challenge_contributions;
DROP TABLE IF EXISTS guild_challenges;
DROP TABLE IF EXISTS guild_events;
DROP TABLE IF EXISTS guild_members;
DROP TABLE IF EXISTS guilds;
