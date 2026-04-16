/**
 * Shared pixel-art sprite data used across RPG scene pages.
 * Each sprite is a [palette, data] pair where:
 * - palette maps characters to hex colors
 * - data is an array of strings (pixel rows)
 */

// ── Oak Tree (10w × 15h) ──
export const TREE_OAK_P: Record<string, string> = {
  L: '#2D5A27', l: '#3A7A32', k: '#4E9A44', K: '#60B855',
  T: '#6B4E28', t: '#5A3E1E',
}
export const TREE_OAK_D = [
  '   llll   ',
  '  lLlLll  ',
  ' llKlkLll ',
  ' lLlklLLl ',
  'llkKlLlkll',
  'lLllklLlLl',
  ' llLKlLll ',
  '  lllLll  ',
  '   llll   ',
  '    TT    ',
  '    TT    ',
  '    TT    ',
  '    Tt    ',
  '   tTTt   ',
  '  ttTTtt  ',
]

// ── Pine Tree (8w × 15h) ──
export const TREE_PINE_P: Record<string, string> = {
  L: '#1A4D2E', l: '#2D6A3F', k: '#3D8A4F',
  T: '#5A3E1E', t: '#4A3018',
}
export const TREE_PINE_D = [
  '   lL   ',
  '  llLl  ',
  '  lkLl  ',
  ' lllLll ',
  '  llLl  ',
  ' llLkll ',
  ' lkLlkl ',
  'lllLlkll',
  '  lLkl  ',
  ' llLkll ',
  'lkLlklkl',
  '   TT   ',
  '   Tt   ',
  '   TT   ',
  '  tTTt  ',
]

// ── Cloud (10w × 4h) ──
export const CLOUD_P: Record<string, string> = { C: '#F0F4F8', c: '#E2E8F0' }
export const CLOUD_D = [
  '   CCC    ',
  ' CCCCcCC  ',
  'CCcCCCcCCC',
  ' cCCCCCCc ',
]

// ── Campfire (8w × 8h) ──
export const FIRE_P: Record<string, string> = {
  S: '#808080', s: '#666666', R: '#DD5500', r: '#FF8800',
  Y: '#FFAA33', y: '#FFD700', G: '#555555',
}
export const FIRE_D = [
  '   Yy   ',
  '  yYRy  ',
  '  RyrR  ',
  ' RrYrR  ',
  ' yRYRr  ',
  '  RrR   ',
  ' SGSGS  ',
  'sSSSSSSs',
]

// ── Lantern (4w × 8h) ──
export const LANTERN_P: Record<string, string> = {
  W: '#5C3A1E', G: '#FFD700', g: '#FFC000', M: '#808080', F: '#FFAA33',
}
export const LANTERN_D = [
  ' MM ',
  ' MW ',
  'WGGW',
  'WgFW',
  'WGGW',
  ' WW ',
  ' WW ',
  ' WW ',
]

// ── Flowers (8w × 4h) ──
export const FLOWERS_P: Record<string, string> = {
  R: '#E74C3C', r: '#FF6B6B', Y: '#FFD700', y: '#FBBF24',
  P: '#D946EF', p: '#F0ABFC', G: '#3A7A32', g: '#4E9A44',
}
export const FLOWERS_D = [
  ' R  Yp  ',
  'rRg yPg ',
  ' gG gG  ',
  ' g   g  ',
]

// ── Barrel (6w × 6h) ──
export const BARREL_P: Record<string, string> = {
  W: '#8B6914', w: '#A07828', D: '#6B4E11', M: '#555555',
}
export const BARREL_D = [
  ' WWWW ',
  'DWWWWD',
  'MWWWWM',
  'DWWWWD',
  'MWWWWM',
  ' DDDD ',
]

// ── Waterfall (6w × 16h) ──
export const WATERFALL_P: Record<string, string> = {
  S: '#808080', s: '#666666', W: '#4499CC', w: '#66BBEE',
  F: '#AADDEE', f: '#88CCDD',
}
export const WATERFALL_D = [
  'SSSSS ',
  'SwwwS ',
  ' WwW  ',
  ' wWFw ',
  ' WwwW ',
  ' wWww ',
  ' WFwW ',
  ' wWww ',
  ' WwFW ',
  ' wWww ',
  ' WwwW ',
  'FwWwwF',
  'FfWwfF',
  'FFfwFF',
  ' FFFF ',
  '  FF  ',
]

// ── Boss Portal (14w × 16h) ──
export const PORTAL_P: Record<string, string> = {
  S: '#808080', s: '#666666', G: '#8B5CF6', g: '#6D28D9',
  P: '#C4B5FD', p: '#A78BFA', F: '#DDD6FE',
  K: '#555555', k: '#444444',
}
export const PORTAL_D = [
  '    PPPP      ',
  '  PPGggGPP    ',
  ' PGg    gGP   ',
  ' Pg  FF  gP   ',
  'SG  FPPF  GS  ',
  'Sg   PP   gS  ',
  'SG        GS  ',
  'Sg        gS  ',
  'SG        GS  ',
  'SG  FPPF  GS  ',
  ' Sg  FF  gS   ',
  ' SGg    gGS   ',
  '  SSGggGSS    ',
  '    SSSS      ',
  ' KKKKKKKKKK   ',
  'kKKKKKKKKKKk  ',
]

// ── Signpost (8w × 14h) ──
export const SIGN_P: Record<string, string> = {
  W: '#A07828', w: '#8B6914', D: '#6B4E11',
  A: '#059669', a: '#047857',
}
export const SIGN_D = [
  ' AAAAAA ',
  ' AaAAAA ',
  ' AAAAAA ',
  '   WW   ',
  '  DDDD  ',
  '  DWWD  ',
  '   WW   ',
  '   wW   ',
  '   WW   ',
  '   Ww   ',
  '   WW   ',
  '   wW   ',
  '  DWWD  ',
  ' DDDDDD ',
]

// ── Progress Garden stages ──
export const GARDEN_P: Record<string, string> = {
  G: '#3A7A32', g: '#4E9A44', K: '#60B855',
  T: '#6B4E28', t: '#5A3E1E',
  R: '#E74C3C', Y: '#FFD700', P: '#D946EF', B: '#8B6914',
}

export const GARDEN_STAGES: string[][] = [
  // Stage 0: sprout
  [' g  ', ' gG ', ' Tg ', ' T  '],
  // Stage 1: small plant
  ['  gg  ', ' gGg  ', ' gKg  ', '  Tg  ', '  T   ', ' tTt  '],
  // Stage 2: small tree
  ['  ggg   ', ' gGgGg  ', ' gKgKg  ', '  ggg   ', '   T    ', '   T    ', '   T    ', '  tTt   '],
  // Stage 3: blooming tree
  ['  R ggg   ', ' gRGgGg   ', ' gKRKgY   ', ' gGgGKg   ', '  gggPg   ', '   ggg    ', '    T     ', '    T     ', '    T     ', '   tTt    '],
  // Stage 4: grand tree
  ['   YRggg    ', '  gRGRGgP   ', ' gKRKgRYPg  ', ' gGgGKgPgK  ', ' ggRggPgRg  ', '  gggYggg   ', '   ggggg    ', '    ggg     ', '    TT      ', '    TT      ', '    TT      ', '   tTTt     '],
]

export function gardenStage(streak: number): string[] {
  if (streak <= 0) return GARDEN_STAGES[0]
  if (streak <= 3) return GARDEN_STAGES[1]
  if (streak <= 7) return GARDEN_STAGES[2]
  if (streak <= 14) return GARDEN_STAGES[3]
  return GARDEN_STAGES[4]
}

// ── Player Character (12w × 16h) ──
export const PLAYER_P: Record<string, string> = {
  H: '#5C3A1E', h: '#7A5033', S: '#F4C99B', s: '#E8B88C',
  E: '#1E1E1E', C: '#E8A87C', A: '#059669', a: '#047857',
  T: '#34D399', t: '#2AB880', P: '#5B4A3F',
  B: '#3D2E24', b: '#2E2018',
}
export const PLAYER_D = [
  '    HHH     ',
  '   HHHHH    ',
  '   HhHhH    ',
  '   SSSSS    ',
  '   SESESS   ',
  '   SSCCSS   ',
  '    SSS     ',
  '   aTTTa    ',
  '  saTTTas   ',
  '   TTTTT    ',
  '   aTTTa    ',
  '    PPP     ',
  '   PP PP    ',
  '   PP PP    ',
  '   BB BB    ',
  '   Bb Bb    ',
]

// ── NPC Merchant (12w × 16h) ──
export const NPC_P: Record<string, string> = {
  H: '#D97706', h: '#B45309', S: '#F4C99B', s: '#E8B88C',
  E: '#1E1E1E', C: '#E8A87C', R: '#8B3513', r: '#A04020',
  T: '#C4A46C', t: '#B08C4A', P: '#5B4A3F',
  B: '#3D2E24', b: '#2E2018',
}
export const NPC_D = [
  '   HhHHH    ',
  '   HHHHH    ',
  '   HhHhH    ',
  '   SSSSS    ',
  '   SESESS   ',
  '   SSCCSS   ',
  '    SSS     ',
  '   RTTTTR   ',
  '  rRTTTRr   ',
  '   RTTTTR   ',
  '   rTTTr    ',
  '    PPP     ',
  '   PP PP    ',
  '   PP PP    ',
  '   BB BB    ',
  '   Bb Bb    ',
]

// ── Companion Cat (8w × 6h) ──
export const CAT_P: Record<string, string> = {
  O: '#FF8C00', o: '#E67E00', E: '#1E1E1E', N: '#FFB366', T: '#CC7000',
}
export const CAT_D = [
  ' O    O ',
  ' OO  OO ',
  ' OEOOEO ',
  'OONNNOOO',
  ' OOOOOOT',
  '  OOOO  ',
]

// ── Tavern (17w × 14h) ──
export const TAVERN_P: Record<string, string> = {
  R: '#8B3513', r: '#A04020', q: '#B85030',
  W: '#D4A574', w: '#E8C99A', B: '#5C3A1E', b: '#7A5833',
  D: '#4A2E14', d: '#3C2410', G: '#FFD700', g: '#FFC000',
  P: '#808080', p: '#999999', C: '#5A5A6A', c: '#707080',
}
export const TAVERN_D = [
  '       CC       ',
  '       Cc       ',
  '    RRRRRRRR    ',
  '   RRRRqrRRRR   ',
  '  RRRRRqrRRRRR  ',
  ' RRRRRRRRRRRRRR ',
  'RRRRRRRRRRRRRRRq',
  '  BWWGWWWWGWWb  ',
  '  BWWgWWWWgWWB  ',
  '  BWWWWWWWWWWB  ',
  '  BWGWWddWWGWb  ',
  '  BWgWWDDWWgWB  ',
  '  BPPPPDDPPPPP  ',
  '  PPpPPDDPPpPPp ',
]

// ── Tower (12w × 18h) ──
export const TOWER_P: Record<string, string> = {
  S: '#808888', s: '#6A7278', W: '#A0A8B0', w: '#B0B8C0',
  G: '#4499CC', g: '#66BBEE', F: '#FFD700', f: '#FFA500',
  D: '#5C3A1E', M: '#3388BB', m: '#5599CC',
}
export const TOWER_D = [
  '     Ff     ',
  '    FmmF    ',
  '    FMMF    ',
  '     Ff     ',
  '    SssS    ',
  '   SSWWSS   ',
  '   SWgWWS   ',
  '   SSWWSS   ',
  '   SSWWSS   ',
  '   SWgWWS   ',
  '   SSWWSS   ',
  '   SSWWSS   ',
  '   SWgWWS   ',
  '   SSWWSS   ',
  '  SSWDWSS   ',
  '  SSSDsSS   ',
  ' SSSSSSSSSS ',
  'SSSSSSSSSSSS',
]

// ── Quest Board (12w × 13h) ──
export const BOARD_P: Record<string, string> = {
  W: '#8B6914', w: '#A07828', D: '#6B4E11',
  P: '#F5E6C8', p: '#E5D0A8', N: '#CD5C5C', I: '#2C1810',
}
export const BOARD_D = [
  '  DWWWWWWD  ',
  '  WPPPPPW   ',
  '  WNPIPNW   ',
  '  WPPPPPW   ',
  '  WPIPPIW   ',
  '  WPPPPPW   ',
  '  WPIPpPW   ',
  '  WPPPPPW   ',
  '  DWWWWWWD  ',
  '   WWWWWW   ',
  '    wW      ',
  '    WW      ',
  '    DD      ',
]
