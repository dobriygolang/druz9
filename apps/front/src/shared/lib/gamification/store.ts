/**
 * Gamification store — Zustand-backed game state.
 *
 * Split into:
 *   - persisted slice   (localStorage via zustand/persist): lifetime XP,
 *     embers, inventory, equipped gear, streak, last daily UTC, toast
 *     queue (short-lived).
 *   - session slice     (in-memory only): active boost, derived stats,
 *     current level-up overlay etc.
 *
 * Single entry point: `useGameStore`. Event ingestion via `emitGameEvent`.
 * HUD components subscribe with selectors; do NOT subscribe to the whole
 * store or you'll re-render the world on every toast.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { deriveLevel } from './levelFormula'
import {
  EVENT_REWARDS, type GameEventType, type GameEventPayload, type RewardBundle,
} from './events'
import { ACHIEVEMENT_MAP } from './achievements'
import { SHOP_MAP, type ShopItem } from './shop'

export interface RewardToast {
  id: string
  xp: number
  embers: number
  label: string
  icon: string
  createdAt: number
}

export interface EquippedGear {
  hat?: string
  cloak?: string
  weapon?: string
  frame?: string
  banner?: string
  companion?: string
}

export interface ActiveBoost {
  itemId: string
  xpMultiplier: number
  expiresAt: number
}

interface GameState {
  /* ── Persisted ── */
  totalXp: number
  embers: number
  /** Premium currency. Earned rarely (weekly boss, achievements, event drops).
   *  Unlocks rare shop items (dragon companions, profile frames). */
  gems: number
  /** Map of shopItemId → count owned. */
  inventory: Record<string, number>
  equipped: EquippedGear
  /** Current consecutive streak in days. */
  streakDays: number
  /** UTC-day (yyyy-mm-dd) of the last day with any quest activity. */
  lastActiveUtcDay: string | null
  /** Which daily quest ids the user marked complete today. Reset on UTC-day. */
  completedDailyQuests: string[]
  /** Set of unlocked achievement ids. */
  unlockedAchievements: string[]
  /** Mute reward SFX. Routed through shared/lib/sound.setSoundEnabled. */
  soundMuted: boolean

  /* ── Session (non-persisted) ── */
  toastQueue: RewardToast[]
  levelUpOverlay: number | null  // the new level number, or null
  unlockOverlay: string | null   // achievement id to display in modal
  activeBoost: ActiveBoost | null

  /* ── Actions ── */
  emit: (event: GameEventPayload) => void
  consumeToast: (id: string) => void
  dismissLevelUp: () => void
  dismissUnlock: () => void
  unlockAchievement: (id: string) => void
  buy: (item: ShopItem) => { ok: boolean; reason?: string }
  equip: (slot: keyof EquippedGear, itemId: string | undefined) => void
  activateBoost: (itemId: string) => { ok: boolean; reason?: string }
  /** Toggle a daily-quest id done/not-done. On first transition to done,
   *  credits XP + embers via emit('practice_task_solved'-like event. */
  toggleDailyQuest: (id: string, reward: { xp: number; embers: number; label: string; icon: string }) => void
  hardReset: () => void
}

const INITIAL: Omit<GameState,
  'emit' | 'consumeToast' | 'dismissLevelUp' | 'dismissUnlock'
  | 'unlockAchievement' | 'buy' | 'equip' | 'activateBoost' | 'hardReset'
  | 'toggleDailyQuest'
  | 'toastQueue' | 'levelUpOverlay' | 'unlockOverlay' | 'activeBoost'
> = {
  totalXp: 0,
  embers: 120,
  gems: 3,   // seed: three gems so the chip isn't empty on first launch
  inventory: {},
  equipped: {},
  streakDays: 0,
  lastActiveUtcDay: null,
  completedDailyQuests: [],
  unlockedAchievements: [],
  soundMuted: false,
}

function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  const t = (s: string) => new Date(s + 'T00:00:00Z').getTime()
  return Math.round((t(b) - t(a)) / 86_400_000)
}

let toastSeq = 0
const nextToastId = () => `t_${Date.now()}_${++toastSeq}`

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...INITIAL,
      toastQueue: [],
      levelUpOverlay: null,
      unlockOverlay: null,
      activeBoost: null,

      emit: (event) => {
        const s = get()
        const rewardFn = EVENT_REWARDS[event.type]
        if (!rewardFn) return
        const baseReward = rewardFn(event.data)
        const mult = s.activeBoost && s.activeBoost.expiresAt > Date.now()
          ? s.activeBoost.xpMultiplier
          : 1
        const reward: RewardBundle = {
          ...baseReward,
          xp: Math.round(baseReward.xp * mult),
        }
        const prevLevel = deriveLevel(s.totalXp).level
        const nextTotalXp = s.totalXp + reward.xp
        const nextLevel = deriveLevel(nextTotalXp).level

        // Streak handling on any non-trivial event.
        let streakDays = s.streakDays
        let lastActiveUtcDay = s.lastActiveUtcDay
        const today = utcDay()
        if (event.type !== 'streak_milestone' && event.type !== 'achievement_unlocked') {
          if (lastActiveUtcDay === today) {
            // already counted today
          } else if (lastActiveUtcDay && daysBetween(lastActiveUtcDay, today) === 1) {
            streakDays += 1
            lastActiveUtcDay = today
          } else {
            streakDays = 1
            lastActiveUtcDay = today
          }
        }

        const toast: RewardToast = {
          id: nextToastId(),
          xp: reward.xp, embers: reward.embers,
          label: reward.label, icon: reward.icon,
          createdAt: Date.now(),
        }

        set({
          totalXp: nextTotalXp,
          embers: s.embers + reward.embers,
          streakDays,
          lastActiveUtcDay,
          toastQueue: [...s.toastQueue, toast].slice(-6),
          levelUpOverlay: nextLevel > prevLevel ? nextLevel : s.levelUpOverlay,
        })

        // Level-based achievement unlocks.
        const levelMilestones: Record<number, string> = {
          5: 'level_5', 10: 'level_10', 25: 'level_25',
          50: 'level_50', 100: 'level_100',
        }
        if (levelMilestones[nextLevel] && nextLevel > prevLevel) {
          get().unlockAchievement(levelMilestones[nextLevel])
        }
        // Streak milestones.
        const streakMilestones: Record<number, string> = {
          3: 'streak_3', 7: 'streak_7', 30: 'streak_30',
          100: 'streak_100', 365: 'streak_365',
        }
        if (streakMilestones[streakDays] && streakDays !== s.streakDays) {
          get().unlockAchievement(streakMilestones[streakDays])
        }
      },

      consumeToast: (id) => {
        set(s => ({ toastQueue: s.toastQueue.filter(t => t.id !== id) }))
      },

      dismissLevelUp: () => set({ levelUpOverlay: null }),
      dismissUnlock: () => set({ unlockOverlay: null }),

      unlockAchievement: (id) => {
        const s = get()
        if (s.unlockedAchievements.includes(id)) return
        if (!ACHIEVEMENT_MAP[id]) return
        set({
          unlockedAchievements: [...s.unlockedAchievements, id],
          unlockOverlay: id,
        })
        // Unlock reward (bonus XP for the ribbon).
        get().emit({ type: 'achievement_unlocked', data: { id } })
      },

      buy: (item) => {
        const s = get()
        // Gems-priced items (rare/premium) check gems; others use embers.
        if (item.currency === 'gems') {
          if (s.gems < item.price) return { ok: false, reason: 'Not enough gems' }
          set({
            gems: s.gems - item.price,
            inventory: { ...s.inventory, [item.id]: (s.inventory[item.id] ?? 0) + 1 },
          })
        } else {
          if (s.embers < item.price) return { ok: false, reason: 'Not enough embers' }
          set({
            embers: s.embers - item.price,
            inventory: { ...s.inventory, [item.id]: (s.inventory[item.id] ?? 0) + 1 },
          })
        }
        if (!s.unlockedAchievements.includes('first_purchase')) {
          get().unlockAchievement('first_purchase')
        }
        return { ok: true }
      },

      toggleDailyQuest: (id, reward) => {
        const s = get()
        const alreadyDone = s.completedDailyQuests.includes(id)
        if (alreadyDone) {
          // Un-checking does NOT refund — keeps the ledger honest.
          set({
            completedDailyQuests: s.completedDailyQuests.filter(q => q !== id),
          })
          return
        }
        // Mark as done and credit rewards. We piggy-back on the generic
        // emit() so toast + streak + level-up all flow through.
        set({
          completedDailyQuests: [...s.completedDailyQuests, id],
        })
        get().emit({
          type: 'daily_quest_completed',
          data: { questId: id, xp: reward.xp, embers: reward.embers,
                  label: reward.label, icon: reward.icon },
        })
      },

      equip: (slot, itemId) => {
        set(s => ({ equipped: { ...s.equipped, [slot]: itemId } }))
      },

      activateBoost: (itemId) => {
        const s = get()
        const item = SHOP_MAP[itemId]
        if (!item || item.category !== 'boost' || !item.durationSec) {
          return { ok: false, reason: 'Not a boost' }
        }
        if ((s.inventory[itemId] ?? 0) < 1) return { ok: false, reason: 'Not owned' }
        set({
          inventory: { ...s.inventory, [itemId]: s.inventory[itemId] - 1 },
          activeBoost: {
            itemId,
            xpMultiplier: item.xpMultiplier ?? 1,
            expiresAt: Date.now() + item.durationSec * 1000,
          },
        })
        return { ok: true }
      },

      hardReset: () => {
        set({
          ...INITIAL,
          toastQueue: [],
          levelUpOverlay: null,
          unlockOverlay: null,
          activeBoost: null,
        })
      },
    }),
    {
      name: 'druz9.game.v2',
      partialize: (s) => ({
        totalXp: s.totalXp,
        embers: s.embers,
        gems: s.gems,
        inventory: s.inventory,
        equipped: s.equipped,
        streakDays: s.streakDays,
        lastActiveUtcDay: s.lastActiveUtcDay,
        completedDailyQuests: s.completedDailyQuests,
        unlockedAchievements: s.unlockedAchievements,
        soundMuted: s.soundMuted,
      }),
    },
  ),
)

/** Convenience — emit from anywhere. */
export function emitGameEvent(type: GameEventType, data?: Record<string, unknown>) {
  useGameStore.getState().emit({ type, data })
}

/** Derived selectors — use these in components so they re-render
    only when the specific slice changes. */
export const selectLevel = (s: GameState) => deriveLevel(s.totalXp)
export const selectEmbers = (s: GameState) => s.embers
export const selectStreak = (s: GameState) => s.streakDays
export const selectToasts = (s: GameState) => s.toastQueue
