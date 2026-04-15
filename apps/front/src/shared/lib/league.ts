/** Shared league constants — single source of truth for league display. */

export const LEAGUE_LABELS: Record<string, string> = {
  ARENA_LEAGUE_BRONZE: 'Bronze',
  ARENA_LEAGUE_SILVER: 'Silver',
  ARENA_LEAGUE_GOLD: 'Gold',
  ARENA_LEAGUE_PLATINUM: 'Platinum',
  ARENA_LEAGUE_DIAMOND: 'Diamond',
  ARENA_LEAGUE_MASTER: 'Master',
}

export const LEAGUE_TEXT_COLORS: Record<string, string> = {
  ARENA_LEAGUE_BRONZE: 'text-[#A0785A]',
  ARENA_LEAGUE_SILVER: 'text-[#8B95A5]',
  ARENA_LEAGUE_GOLD: 'text-[#D4A017]',
  ARENA_LEAGUE_PLATINUM: 'text-[#4ECDC4]',
  ARENA_LEAGUE_DIAMOND: 'text-[#7C6FE0]',
  ARENA_LEAGUE_MASTER: 'text-[#E64980]',
}

export const LEAGUE_BG_COLORS: Record<string, string> = {
  ARENA_LEAGUE_BRONZE: 'bg-[#A0785A]',
  ARENA_LEAGUE_SILVER: 'bg-[#8B95A5]',
  ARENA_LEAGUE_GOLD: 'bg-[#D4A017]',
  ARENA_LEAGUE_PLATINUM: 'bg-[#4ECDC4]',
  ARENA_LEAGUE_DIAMOND: 'bg-[#7C6FE0]',
  ARENA_LEAGUE_MASTER: 'bg-[#E64980]',
}

/** Maps proto enum (e.g. "ARENA_LEAGUE_GOLD") to lowercase name for PlayerFrame. */
export const LEAGUE_FRAME_NAMES: Record<string, string> = {
  ARENA_LEAGUE_BRONZE: 'bronze',
  ARENA_LEAGUE_SILVER: 'silver',
  ARENA_LEAGUE_GOLD: 'gold',
  ARENA_LEAGUE_PLATINUM: 'platinum',
  ARENA_LEAGUE_DIAMOND: 'diamond',
  ARENA_LEAGUE_MASTER: 'master',
}

export function leagueLabel(leagueEnum: string): string {
  return LEAGUE_LABELS[leagueEnum] ?? ''
}

export function leagueDotColor(leagueEnum: string): string {
  return LEAGUE_BG_COLORS[leagueEnum] ?? 'bg-[#94a3b8]'
}
