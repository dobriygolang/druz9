/**
 * Gamification event taxonomy.
 *
 * Each real product action (submit code, finish mock, listen to podcast,
 * read article, daily login) becomes a typed event. The store consumes
 * the event, awards XP/embers, advances quests and unlocks achievements.
 *
 * Keep this file the single source of truth for XP economy. Tuning the
 * numbers below affects every surface that awards progress.
 */

export type GameEventType =
  | 'code_task_solved'
  | 'mock_interview_completed'
  | 'arena_match_won'
  | 'arena_match_played'
  | 'podcast_listened'           // 15+ minutes
  | 'article_read'
  | 'daily_login'
  | 'weekly_boss_attempted'
  | 'weekly_boss_defeated'
  | 'code_room_session_ended'    // collaborative session
  | 'daily_quest_completed'
  | 'daily_quests_all_completed' // all 4 for the day
  | 'streak_milestone'           // 7/30/100 day stroke
  | 'achievement_unlocked'

export interface GameEventPayload {
  type: GameEventType
  /** Optional per-event metadata (task id, duration, score etc). */
  data?: Record<string, unknown>
}

export interface RewardBundle {
  xp: number
  embers: number
  /** Human-readable reason shown in the toast. */
  label: string
  icon: string
}

/** Reward table — tune these to tune the economy. */
export const EVENT_REWARDS: Record<GameEventType, (data?: any) => RewardBundle> = {
  code_task_solved: (d) => ({
    xp: (d?.difficulty === 'hard' ? 150 : d?.difficulty === 'medium' ? 75 : 40),
    embers: (d?.difficulty === 'hard' ? 25 : d?.difficulty === 'medium' ? 12 : 6),
    label: 'Coding task solved',
    icon: '⚔️',
  }),
  mock_interview_completed: () => ({
    xp: 120, embers: 30, label: 'Mock interview complete', icon: '📜',
  }),
  arena_match_won: () => ({
    xp: 80, embers: 15, label: 'Arena match won', icon: '🏆',
  }),
  arena_match_played: () => ({
    xp: 25, embers: 3, label: 'Arena match played', icon: '⚔️',
  }),
  podcast_listened: () => ({
    xp: 30, embers: 5, label: 'Podcast listened', icon: '🎧',
  }),
  article_read: () => ({
    xp: 20, embers: 3, label: 'Article read', icon: '📖',
  }),
  daily_login: () => ({
    xp: 10, embers: 2, label: 'Daily login', icon: '🌅',
  }),
  weekly_boss_attempted: () => ({
    xp: 50, embers: 10, label: 'Weekly boss attempted', icon: '🐉',
  }),
  weekly_boss_defeated: () => ({
    xp: 500, embers: 150, label: 'Weekly boss DEFEATED', icon: '🐉',
  }),
  code_room_session_ended: () => ({
    xp: 35, embers: 5, label: 'Collab session ended', icon: '👥',
  }),
  daily_quest_completed: (d) => ({
    // Caller passes exact rewards from the quest definition (xp/embers/label/icon).
    // Fallback to sensible defaults if not provided.
    xp: typeof d?.xp === 'number' ? d.xp : 30,
    embers: typeof d?.embers === 'number' ? d.embers : 5,
    label: typeof d?.label === 'string' ? d.label : 'Daily quest complete',
    icon: typeof d?.icon === 'string' ? d.icon : '✨',
  }),
  daily_quests_all_completed: () => ({
    xp: 100, embers: 30, label: 'All daily quests done!', icon: '🔥',
  }),
  streak_milestone: (d) => ({
    xp: (d?.days ?? 7) * 10,
    embers: (d?.days ?? 7) * 3,
    label: `${d?.days ?? 7}-day streak!`,
    icon: '🔥',
  }),
  achievement_unlocked: () => ({
    xp: 50, embers: 10, label: 'Achievement unlocked', icon: '🏅',
  }),
}
