/**
 * Achievement registry — 50 trophies players can earn across the
 * product. Unlocking emits `achievement_unlocked` event which triggers
 * the modal overlay + XP/ember reward bundle.
 *
 * Rarity affects visual treatment only:
 *   common     → bronze hex
 *   rare       → blue hex
 *   epic       → purple hex with inner glow
 *   legendary  → gold hex with outer pulse
 *   dragon     → fire hex with particle ring (player-of-the-year tier)
 *
 * The `condition` field is a descriptor only; the actual unlock check
 * lives where the relevant event fires (see store.onEvent).
 */

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'dragon'

export type AchievementCategory =
  | 'practice' | 'interview' | 'community' | 'podcast' | 'streak'
  | 'boss' | 'shop' | 'veteran'

export interface Achievement {
  id: string
  category: AchievementCategory
  rarity: AchievementRarity
  name: string
  description: string
  icon: string            // emoji fallback (SVG lands later)
}

export const ACHIEVEMENTS: Achievement[] = [
  // ── Practice (coding) ─────────────────────
  { id: 'first_blood', category: 'practice', rarity: 'common',
    name: 'First Blood', description: 'Solve your first coding task.', icon: '⚔️' },
  { id: 'ten_tasks', category: 'practice', rarity: 'common',
    name: 'Blade Sharpener', description: 'Solve 10 coding tasks.', icon: '🗡️' },
  { id: 'fifty_tasks', category: 'practice', rarity: 'rare',
    name: 'Runic Scholar', description: 'Solve 50 coding tasks.', icon: '📘' },
  { id: 'hundred_tasks', category: 'practice', rarity: 'epic',
    name: 'Arcane Master', description: 'Solve 100 coding tasks.', icon: '🔮' },
  { id: 'hard_ten', category: 'practice', rarity: 'epic',
    name: 'Dragonslayer Trainee', description: 'Solve 10 hard coding tasks.', icon: '🐲' },
  { id: 'hard_fifty', category: 'practice', rarity: 'legendary',
    name: 'Dragonslayer', description: 'Solve 50 hard coding tasks.', icon: '🐉' },
  { id: 'speed_demon', category: 'practice', rarity: 'rare',
    name: 'Swift Blade', description: 'Solve a task in under 5 minutes.', icon: '⚡' },
  { id: 'flawless_week', category: 'practice', rarity: 'epic',
    name: 'Flawless Week', description: 'Solve at least 1 task every day for a week.', icon: '✨' },

  // ── Interviews ─────────────────────
  { id: 'mock_first', category: 'interview', rarity: 'common',
    name: 'Prepared', description: 'Complete your first mock interview.', icon: '📜' },
  { id: 'mock_ten', category: 'interview', rarity: 'rare',
    name: 'Seasoned', description: 'Complete 10 mock interviews.', icon: '📚' },
  { id: 'mock_fifty', category: 'interview', rarity: 'legendary',
    name: 'Oracle', description: 'Complete 50 mock interviews.', icon: '🔮' },
  { id: 'mock_perfect', category: 'interview', rarity: 'epic',
    name: 'Perfect Answer', description: 'Score 10/10 in a mock interview.', icon: '💎' },

  // ── Community ─────────────────────
  { id: 'first_friend', category: 'community', rarity: 'common',
    name: 'Not Alone', description: 'Make your first connection in the guild.', icon: '🤝' },
  { id: 'mentor', category: 'community', rarity: 'epic',
    name: 'Mentor', description: 'Help 10 other adventurers.', icon: '🧙' },
  { id: 'guild_leader', category: 'community', rarity: 'rare',
    name: 'Guild Leader', description: 'Create and lead a study guild.', icon: '⭕' },
  { id: 'event_goer', category: 'community', rarity: 'common',
    name: 'Festival Visitor', description: 'Attend an event.', icon: '🎪' },
  { id: 'code_room_regular', category: 'community', rarity: 'rare',
    name: 'Tavern Regular', description: 'Join 25 code room sessions.', icon: '🍺' },

  // ── Podcast / reading ─────────────────────
  { id: 'first_listen', category: 'podcast', rarity: 'common',
    name: 'Open Ears', description: 'Listen to your first podcast.', icon: '🎧' },
  { id: 'podcast_ten_hours', category: 'podcast', rarity: 'rare',
    name: 'Audiophile', description: 'Listen to 10 hours of podcasts.', icon: '📻' },
  { id: 'reader', category: 'podcast', rarity: 'common',
    name: 'Reader', description: 'Read 5 articles.', icon: '📖' },
  { id: 'librarian', category: 'podcast', rarity: 'rare',
    name: 'Librarian', description: 'Read 50 articles.', icon: '📚' },

  // ── Streak ─────────────────────
  { id: 'streak_3', category: 'streak', rarity: 'common',
    name: 'Kindling', description: 'Maintain a 3-day streak.', icon: '🔥' },
  { id: 'streak_7', category: 'streak', rarity: 'rare',
    name: 'Sustained Flame', description: 'Maintain a 7-day streak.', icon: '🔥' },
  { id: 'streak_30', category: 'streak', rarity: 'epic',
    name: 'Eternal Fire', description: 'Maintain a 30-day streak.', icon: '🔥' },
  { id: 'streak_100', category: 'streak', rarity: 'legendary',
    name: 'Dragonheart', description: 'Maintain a 100-day streak.', icon: '💖' },
  { id: 'streak_365', category: 'streak', rarity: 'dragon',
    name: 'Year of the Dragon', description: 'Maintain a 365-day streak.', icon: '🐉' },

  // ── Boss ─────────────────────
  { id: 'boss_first_try', category: 'boss', rarity: 'rare',
    name: 'First Foe', description: 'Attempt your first weekly boss.', icon: '🎯' },
  { id: 'boss_first_win', category: 'boss', rarity: 'epic',
    name: 'Bosskiller', description: 'Defeat your first weekly boss.', icon: '👑' },
  { id: 'boss_streak_4', category: 'boss', rarity: 'legendary',
    name: 'Champion', description: 'Defeat 4 weekly bosses in a row.', icon: '🏆' },
  { id: 'boss_perfect', category: 'boss', rarity: 'dragon',
    name: 'Flawless Champion', description: 'Defeat a boss with max score.', icon: '🌟' },

  // ── Shop / economy ─────────────────────
  { id: 'first_purchase', category: 'shop', rarity: 'common',
    name: 'Spender', description: 'Buy your first item at the market.', icon: '💰' },
  { id: 'wardrobe', category: 'shop', rarity: 'rare',
    name: 'Wardrobe', description: 'Own 5 cosmetic items.', icon: '👕' },
  { id: 'collector', category: 'shop', rarity: 'epic',
    name: 'Collector', description: 'Own 20 items.', icon: '🎨' },
  { id: 'dragon_patron', category: 'shop', rarity: 'legendary',
    name: 'Dragon Patron', description: 'Unlock a dragon companion.', icon: '🐲' },

  // ── Veteran / meta ─────────────────────
  { id: 'level_5', category: 'veteran', rarity: 'common',
    name: 'Journeyman', description: 'Reach level 5.', icon: '🗺️' },
  { id: 'level_10', category: 'veteran', rarity: 'rare',
    name: 'Adept', description: 'Reach level 10.', icon: '⚗️' },
  { id: 'level_25', category: 'veteran', rarity: 'epic',
    name: 'Master', description: 'Reach level 25.', icon: '🎓' },
  { id: 'level_50', category: 'veteran', rarity: 'legendary',
    name: 'Grandmaster', description: 'Reach level 50.', icon: '👑' },
  { id: 'level_100', category: 'veteran', rarity: 'dragon',
    name: 'Ascended', description: 'Reach level 100.', icon: '✨' },
  { id: 'first_offer', category: 'veteran', rarity: 'legendary',
    name: 'Job Offer!', description: 'Report your first offer.', icon: '💼' },
  { id: 'year_one', category: 'veteran', rarity: 'epic',
    name: 'One Year In', description: 'Train here for a full year.', icon: '🎂' },

  // ── Hidden / easter eggs ─────────────────────
  { id: 'night_owl', category: 'practice', rarity: 'rare',
    name: 'Night Owl', description: 'Solve a task after midnight.', icon: '🦉' },
  { id: 'early_bird', category: 'practice', rarity: 'rare',
    name: 'Early Bird', description: 'Solve a task before 6 AM.', icon: '🐓' },
  { id: 'weekend_warrior', category: 'practice', rarity: 'rare',
    name: 'Weekend Warrior', description: 'Solve 10 tasks in a weekend.', icon: '⚔️' },
  { id: 'polyglot', category: 'practice', rarity: 'epic',
    name: 'Polyglot', description: 'Solve tasks in 3 different languages.', icon: '🗣️' },
  { id: 'comeback', category: 'veteran', rarity: 'rare',
    name: 'Comeback', description: 'Return after a month-long break.', icon: '🔁' },
  { id: 'social_butterfly', category: 'community', rarity: 'rare',
    name: 'Social Butterfly', description: 'React to 50 community posts.', icon: '🦋' },
  { id: 'gift_giver', category: 'shop', rarity: 'epic',
    name: 'Gift Giver', description: 'Gift an item to another user.', icon: '🎁' },
  { id: 'perfect_day', category: 'veteran', rarity: 'epic',
    name: 'Perfect Day', description: 'Complete every daily quest in one day.', icon: '🌟' },
  { id: 'iron_will', category: 'practice', rarity: 'legendary',
    name: 'Iron Will', description: 'Fail a task 5 times then solve it.', icon: '💪' },
]

export const ACHIEVEMENT_MAP: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map(a => [a.id, a]),
)
