export interface GameUser {
  name: string
  title: string
  level: number
  xp: number
  xpMax: number
  xpPct: number
  streak: number
  achievements: number
  achievementsMax: number
  duelsWon: number
  duelsLost: number
  guild: string
  gold: number
  gems: number
  arenaPoints: number
}

export type RoomLayout = 'cozy' | 'scholar' | 'warrior'
export type HeroPose = 'idle' | 'wave' | 'trophy'
export type Pet = 'slime' | 'raven' | 'orb' | 'none'
export type Season = 'day' | 'dusk' | 'night' | 'winter'
export type Density = 'compact' | 'normal' | 'roomy'

export interface Tweaks {
  roomLayout: RoomLayout
  heroPose: HeroPose
  pet: Pet
  season: Season
  density: Density
}
