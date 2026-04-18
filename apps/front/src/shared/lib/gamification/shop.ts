/**
 * Shop catalog — items the player can buy with embers.
 *
 * Categories:
 *   avatar_gear   → shows on <AvatarSprite /> (hats, cloaks, weapons)
 *   profile_decor → frames/banners on profile header
 *   boost         → consumables (XP boost 24h, etc.)
 *   companion     → rare dragon pets (small animated SVG near avatar)
 */

export type ShopCategory = 'avatar_gear' | 'profile_decor' | 'boost' | 'companion'

export type ShopRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'dragon'

export interface ShopItem {
  id: string
  category: ShopCategory
  rarity: ShopRarity
  name: string
  description: string
  price: number         // amount of the chosen currency
  /** 'embers' (default) for regular items, 'gems' for premium rare drops. */
  currency?: 'embers' | 'gems'
  icon: string          // emoji until SVG lands
  /** For avatar gear: which slot does this occupy? */
  slot?: 'hat' | 'cloak' | 'weapon' | 'frame' | 'banner' | 'companion'
  /** For boosts: seconds of effect. */
  durationSec?: number
  /** For boosts: XP multiplier while active (1.5 = +50%). */
  xpMultiplier?: number
}

export const SHOP_ITEMS: ShopItem[] = [
  // ── Avatar gear: HATS ──
  { id: 'hat_scholar',  category: 'avatar_gear', rarity: 'common',
    name: 'Scholar Cap', description: 'Soft velvet cap for the studious.', price: 80, icon: '🎓', slot: 'hat' },
  { id: 'hat_wizard',   category: 'avatar_gear', rarity: 'rare',
    name: 'Wizard Hat',  description: 'Pointed, star-embroidered.',         price: 200, icon: '🧙', slot: 'hat' },
  { id: 'hat_crown',    category: 'avatar_gear', rarity: 'epic',
    name: 'Gold Crown',  description: 'For champions only.',                price: 500, icon: '👑', slot: 'hat' },
  { id: 'hat_dragon',   category: 'avatar_gear', rarity: 'legendary',
    name: 'Dragon Horns', description: 'Forged from fallen wyrm scales.',  price: 1200, icon: '🐲', slot: 'hat' },

  // ── Avatar gear: CLOAKS ──
  { id: 'cloak_green',  category: 'avatar_gear', rarity: 'common',
    name: 'Woolen Cloak', description: 'Warm, simple, forest-green.',       price: 60, icon: '🟢', slot: 'cloak' },
  { id: 'cloak_sapphire', category: 'avatar_gear', rarity: 'rare',
    name: 'Sapphire Cloak', description: 'Deep blue with silver trim.',     price: 180, icon: '🔷', slot: 'cloak' },
  { id: 'cloak_phoenix', category: 'avatar_gear', rarity: 'epic',
    name: 'Phoenix Cloak', description: 'Animated flame at the hem.',       price: 600, icon: '🔥', slot: 'cloak' },
  { id: 'cloak_void',   category: 'avatar_gear', rarity: 'legendary',
    name: 'Void Mantle',  description: 'Stars swirl within.',               price: 1500, icon: '🌌', slot: 'cloak' },

  // ── Avatar gear: WEAPONS ──
  { id: 'weapon_sword', category: 'avatar_gear', rarity: 'common',
    name: 'Iron Sword',   description: 'Reliable blade.',                    price: 50, icon: '🗡️', slot: 'weapon' },
  { id: 'weapon_staff',  category: 'avatar_gear', rarity: 'rare',
    name: 'Oak Staff',    description: 'Channels arcane focus.',            price: 150, icon: '⚕️', slot: 'weapon' },
  { id: 'weapon_bow',    category: 'avatar_gear', rarity: 'rare',
    name: 'Recurve Bow',  description: 'Silent and swift.',                  price: 150, icon: '🏹', slot: 'weapon' },
  { id: 'weapon_hammer', category: 'avatar_gear', rarity: 'epic',
    name: 'Thunderhammer',description: 'Strikes with arc lightning.',       price: 450, icon: '🔨', slot: 'weapon' },
  { id: 'weapon_scythe', category: 'avatar_gear', rarity: 'legendary',
    name: 'Reaper Scythe', description: 'Harvests bugs from code.',         price: 1000, icon: '⚰️', slot: 'weapon' },

  // ── Profile decor ──
  { id: 'frame_gold',   category: 'profile_decor', rarity: 'rare',
    name: 'Gilded Frame', description: 'Gold-trimmed avatar frame.',        price: 200, icon: '🖼️', slot: 'frame' },
  { id: 'frame_dragon', category: 'profile_decor', rarity: 'legendary',
    name: 'Dragon Frame', description: 'Wyrm coiled around your portrait.', price: 2000, icon: '🐉', slot: 'frame' },
  { id: 'banner_guild', category: 'profile_decor', rarity: 'common',
    name: 'Guild Banner', description: 'Show off your allegiance.',         price: 100, icon: '🚩', slot: 'banner' },
  { id: 'banner_flame', category: 'profile_decor', rarity: 'epic',
    name: 'Flame Banner', description: 'Animated fire trim.',               price: 500, icon: '🔥', slot: 'banner' },

  // ── Boosts (consumable) ──
  { id: 'boost_xp_small', category: 'boost', rarity: 'common',
    name: 'Focus Draught',    description: '+25% XP for 1 hour.',           price: 50, icon: '🧪',
    durationSec: 3600, xpMultiplier: 1.25 },
  { id: 'boost_xp_medium', category: 'boost', rarity: 'rare',
    name: 'Scholar\'s Elixir',description: '+50% XP for 3 hours.',          price: 150, icon: '⚗️',
    durationSec: 10_800, xpMultiplier: 1.5 },
  { id: 'boost_xp_large', category: 'boost', rarity: 'epic',
    name: 'Dragon\'s Blood',  description: '+100% XP for 24 hours.',        price: 500, icon: '🩸',
    durationSec: 86_400, xpMultiplier: 2.0 },

  // ── Companions (dragon pets) ──
  { id: 'comp_drake_red', category: 'companion', rarity: 'epic',
    name: 'Red Drake',    description: 'Tiny red dragon that follows you.', price: 800, icon: '🔴', slot: 'companion' },
  { id: 'comp_drake_green', category: 'companion', rarity: 'epic',
    name: 'Emerald Drake',description: 'Emerald scales, playful spirit.',   price: 800, icon: '🟢', slot: 'companion' },
  { id: 'comp_drake_gold', category: 'companion', rarity: 'legendary',
    name: 'Gold Drake',   description: 'Shining companion, grants +10% embers.', price: 2000, icon: '🟡', slot: 'companion' },
  { id: 'comp_dragon_void', category: 'companion', rarity: 'dragon',
    name: 'Void Dragon',  description: 'The rarest of all. Only for dragons.', price: 50, currency: 'gems', icon: '🐉', slot: 'companion' },

  // ── Premium (gems) — reserved for weekly-boss drops and rare unlocks ──
  { id: 'frame_arcane',    category: 'profile_decor', rarity: 'dragon',
    name: 'Arcane Frame',  description: 'Shifting runes around the portrait.', price: 25, currency: 'gems', icon: '✦', slot: 'frame' },
  { id: 'hat_phoenix',     category: 'avatar_gear', rarity: 'dragon',
    name: 'Phoenix Crest', description: 'A fiery crown of rebirth.',           price: 30, currency: 'gems', icon: '🦅', slot: 'hat' },
]

export const SHOP_MAP: Record<string, ShopItem> = Object.fromEntries(
  SHOP_ITEMS.map(i => [i.id, i]),
)
