/**
 * Unified pixel-art sprite library for the DRUZ9 home hub.
 *
 * All sprites share a cohesive cozy-medieval palette and top-down
 * projection (3/4 for buildings, straight top-down for ground props).
 * Each sprite is a [palette, data] pair — see shared/ui/Sprite.
 */

/* ─── Shared palette tokens ─────────────────────────────────────────
   Re-used keys across sprites to keep colour feel cohesive.            */

const P = {
  // wood / logs
  W: '#8C6A3A', w: '#A88150', D: '#5A3E1E', d: '#3B2612',
  // stone
  S: '#7A7F88', s: '#5A5F68', L: '#9EA3AC',
  // grass / foliage
  G: '#3E7A35', g: '#56984A', k: '#6FB060',
  // earth / dirt
  E: '#6B4A2A', e: '#8A643A',
  // roof tones (warm)
  R: '#A8413A', r: '#C2574A', J: '#7E2F2A',
  // roof tones (cool slate)
  B: '#4A5A6E', b: '#3A4A5C',
  // magic / arcane
  M: '#8B5CF6', m: '#B69DFF', V: '#5B2DA8',
  // warm light
  Y: '#FFD36B', y: '#F2A33C', O: '#FF7A2A',
  // cold light / water
  C: '#5FAFD1', c: '#3A8BB3', F: '#A9DCEA',
  // red accents / flags
  Q: '#C53030', q: '#E55050',
  // off-white / paper
  P: '#EDE4CC', p: '#D3C69C',
  // skin & character
  sk: '#F1C89E', sb: '#D69A70',
  // dark outline
  X: '#201612', x: '#2E1E18',
  // neutral mid
  N: '#3A2E22', n: '#574230',
  // pink / bloom
  I: '#E27AA8', i: '#F0A8CC',
  // pure white
  T: '#FFFFFF',
}

/* ─── Player character (16×24 top-down, faces right/down idle) ─── */
export const PLAYER_P: Record<string, string> = {
  X: P.X, H: '#3B2612', h: '#5A3E1E',
  S: P.sk, s: P.sb,
  E: '#1B1008', T: '#D9E3EA',
  A: '#2F7A4A', a: '#1F5A34',  // tunic green
  B: '#3B2612', K: '#7A5030',  // belt / boots
  G: '#D4A236',                // buckle
}
export const PLAYER_D = [
  '    XXXX    ',
  '   XhHHhX   ',
  '   XhhHhX   ',
  '   XHHHhX   ',
  '   XSSSSX   ',
  '   SEsESsS  ',
  '   XSSsSX   ',
  '   XSsSsX   ',
  '  XAAaAAaX  ',
  '  XaAAaAAX  ',
  '  XAaAGAaX  ',
  '  XAAaAAaX  ',
  '  XAAAAAAX  ',
  '  XaAAAAaX  ',
  '  XS    SX  ',
  '  XS    SX  ',
  '  XK    KX  ',
  '  XBB  BBX  ',
  '  XXX  XXX  ',
]

/* ─── Companion Fox (10×7) ─── */
export const PET_P: Record<string, string> = {
  X: P.X, O: '#E07A2C', o: '#C25E1A', W: '#F5E6C8', E: '#1B1008',
}
export const PET_D = [
  ' XOX    XOX ',
  ' XOOX  XOOX ',
  'XOOOOXXOOOOX',
  'XOEOOWWOOEOX',
  ' XOOWOOWOOX ',
  '  XOOOOOOX  ',
  '   XOOOOX   ',
]

/* ─── NPC palettes (reuses PLAYER body shape) ─── */
function npc(hair: string, hair2: string, tunic: string, tunic2: string, trim: string): Record<string, string> {
  return {
    X: P.X, H: hair, h: hair2,
    S: P.sk, s: P.sb,
    E: '#1B1008', T: '#D9E3EA',
    A: tunic, a: tunic2, B: '#3B2612', K: '#7A5030', G: trim,
  }
}
export const NPC_MERCHANT_P = npc('#8B4513', '#5C2E0E', '#B84A6E', '#8E2A4E', P.Y)
export const NPC_GUARD_P    = npc('#2B2A2A', '#1A1A1A', '#3F3F42', '#2A2A2D', '#C8C8CC')
export const NPC_SCHOLAR_P  = npc('#C9A66B', '#8A6F38', '#4A3A8E', '#2E2358', '#D4A236')
export const NPC_SAGE_P     = npc('#E5E5E5', '#B8B8B8', '#5B2DA8', '#3E1E75', '#D4A236')
export const NPC_BARD_P     = npc('#D28A1C', '#8B5A10', '#1E7A55', '#0F5A3A', P.Y)
export const NPC_D = PLAYER_D // same body, palette differs

/* ─── Campfire (14×10) ─── */
export const FIRE_P: Record<string, string> = {
  X: P.X, S: P.S, s: P.s, L: P.L,
  R: '#D63B1E', r: '#F17038', Y: '#FFD36B', y: '#FFAD33', W: '#F5E6C8',
  n: '#5A3E1E',
}
export const FIRE_D = [
  '     YY       ',
  '    YyRy      ',
  '   RyYyRy     ',
  '  RYrYYrYR    ',
  ' yRYryYrYRy   ',
  '  RyYrYYyR    ',
  ' nXnXnXnXnX   ',
  ' XnXnXnXnX    ',
  'sSsSsSsSsSsS  ',
  'SLSLSLSLSLSL  ',
]

/* ─── Cottage / player home (24×20, 3/4 top-down) ─── */
export const HOME_P: Record<string, string> = {
  X: P.X, R: P.R, r: P.r, J: P.J,   // roof
  W: P.W, w: P.w, D: P.D, d: P.d,   // walls/beams
  S: P.S, s: P.s,                    // chimney stone
  Y: P.Y, y: P.y,                    // window
  E: '#3A2A1A', G: P.G, g: P.g,      // door / grass base
  N: '#2E1E14',
}
export const HOME_D = [
  '       XXXXXXXXXXXXX    ',
  '      XJRRRRRRRRRRRJX   ',
  '     XJRrrrrrrrrrrrRJX  ',
  '    XJRrRRRrRRRrRRRrRJX ',
  '   XJRrRRRRRrRRRRRrrRJX ',
  '  XJRrRRRRRRRrRRRRRRRJX ',
  ' XXXRrRRRRRRRRRRRRRRRJXX',
  ' XSSSSSRRRRRRRRRRRRRRXXS',
  ' XSssSSSSSRRRRRRRRRRXSSS',
  ' XWDWDWDWDWDWDWDWDWDWDWX',
  ' XWwwwwYYywwwwwwYYywwwWX',
  ' XWwwwwYYywwwEEwYYywwwWX',
  ' XDwwwwYYywwwEEwYYywwwDX',
  ' XWwwwwyywwwwEEwwyywwwWX',
  ' XWwwwwwwwwwwEEwwwwwwwWX',
  ' XDwwwwwwwwwwEEwwwwwwwDX',
  ' XWDWDWDWDWDWEEDWDWDWDWX',
  ' XNNNNNNNNNNNNNNNNNNNNNX',
  '  XXXXXXXXXXXXXXXXXXXXX ',
  '                        ',
]

/* ─── Guild Hall / Tavern (28×22) ─── */
export const GUILD_P: Record<string, string> = {
  X: P.X, R: P.R, r: P.r, J: P.J,
  W: P.W, w: P.w, D: P.D, d: P.d,
  S: P.S, s: P.s, L: P.L,
  Y: P.Y, y: P.y, E: '#3A2A1A',
  Q: P.Q, q: P.q, N: '#2E1E14',
  T: P.T,
}
export const GUILD_D = [
  '         XXXXXXXXXXXXXXX    ',
  '        XQXQXQXQXQXQXQXX    ',
  '         X  X           X   ',
  '       XXXXXXXXXXXXXXXXXXX  ',
  '      XJRRRRRRRRRRRRRRRRRJX ',
  '     XJRrRRRrRRRrRRRrRRRrRJX',
  '    XJRrRRRRRrRRRRRrRRRRRrRJ',
  '   XJRrRRRRRRRrRRRRRRRrRRRRJ',
  '  XJRRRRRRRRRRRRRRRRRRRRRRRJ',
  ' XXXRRRRRRRRRRRRRRRRRRRRRRRJ',
  ' XSSSSSSSSRRRRRRRRRRRRRRRRXX',
  ' XSssSSSSSSSSRRRRRRRRRRRRXss',
  ' XWDWDWDWDWDWDWDWDWDWDWDWDWX',
  ' XWwYYywwwwwYYywwwwwYYywwwWX',
  ' XWwYYywwwwwYYywwwwwYYywwwDX',
  ' XDwyywwwwwwyywwwEEwyywwwwWX',
  ' XWwwwwwwwwwwwwwwEEwwwwwwwWX',
  ' XWwwwwwwwTTwwwwwEEwwwwwwwWX',
  ' XDwwwwwwwTTwwwwwEEwwwwwwwDX',
  ' XWDWDWDWDWDWDWDWEEWDWDWDWDX',
  ' XNNNNNNNNNNNNNNNEENNNNNNNNX',
  '  XXXXXXXXXXXXXXXXXXXXXXXXX ',
]

/* ─── Academy / library tower (22×28) ─── */
export const ACADEMY_P: Record<string, string> = {
  X: P.X, B: P.B, b: P.b,
  S: P.S, s: P.s, L: P.L,
  W: P.W, w: P.w, D: P.D,
  Y: P.Y, y: P.y, M: P.M, m: P.m, E: '#3A2A1A',
  T: P.T,
}
export const ACADEMY_D = [
  '         XMMX         ',
  '        XMmMmX        ',
  '        XMmMmX        ',
  '        XMMMMX        ',
  '       XXBBBBXX       ',
  '      XBbBBBbBX       ',
  '     XBbBSSSBbBX      ',
  '    XBBSSsssSSBBX     ',
  '   XBbSssLLsssBbBX    ',
  '  XXSSSSSSSSSSSSSSX   ',
  '  XSLLsSYySLLsSYySSX  ',
  '  XSsssSyySsssSyySSX  ',
  '  XSLLsSSSSLLsSSSSSX  ',
  '  XSSSSSSSSSSSSSSSSX  ',
  '  XSLLsSYyLLsSYySSSX  ',
  '  XSsssSyysssSyySSSX  ',
  '  XSLLsSSSLLsSSSSSSX  ',
  '  XSSSSSSSSSSSSSSSSX  ',
  '  XSLLsSYyLLsSYySSSX  ',
  '  XSsssSyysssSyySSSX  ',
  '  XSLLsSSSLLsSSSSSSX  ',
  '  XSSSSSSSSSSSSSSSSX  ',
  '  XWWWWWWEEWWWWWWWWX  ',
  '  XWwwwwwEEwwwwwwwWX  ',
  '  XDwwwwwEEwwwwwwwDX  ',
  '  XWWWWWWEEWWWWWWWWX  ',
  '  XXXXXXXEEXXXXXXXXX  ',
  '        XEEX          ',
]

/* ─── Shop / market stall (22×18) ─── */
export const SHOP_P: Record<string, string> = {
  X: P.X, R: P.R, r: P.r, J: P.J,
  W: P.W, w: P.w, D: P.D, d: P.d,
  Y: P.Y, y: P.y, Q: P.Q, q: P.q,
  T: P.T, I: P.I, i: P.i, G: P.g,
  S: '#6E4A26', s: '#4E2E10',
}
export const SHOP_D = [
  '                      ',
  '   XJRRRRRRRRRRRRRRJX ',
  '  XJRrRRRRRRRRRRRRrRJX',
  ' XJRRRRRRRRRRRRRRRRRJX',
  'XJRrQqQqQqQqQqQqQqQrRJ',
  'XJrRRRRRRRRRRRRRRRRRrJ',
  ' XXXXRRRRRRRRRRRRRXXX ',
  ' D                  D ',
  ' W XTTX  XYYX XIIiX W ',
  ' W XTTX  XYYX XIIiX W ',
  ' D XGGX  XWWX XwwWX D ',
  ' W XGGX  XWWX XWWWX W ',
  ' D                  D ',
  ' W WDWDWDWDWDWDWDWDW D',
  ' W WwwwwwwwwwwwwwwwW W',
  ' D WwwwwwwwwwwwwwwwW D',
  ' W WDWDWDWDWDWDWDWDW W',
  ' XXXXXXXXXXXXXXXXXXXX ',
]

/* ─── Training ground target dummy (10×16) ─── */
export const DUMMY_P: Record<string, string> = {
  X: P.X, W: P.W, w: P.w, D: P.D,
  H: '#D8C08A', h: '#B09860', J: '#7A5030',
  Q: P.Q, q: P.q,
}
export const DUMMY_D = [
  '   XHHX   ',
  '  XHhHhX  ',
  '  XHHhHX  ',
  '  XHhHHX  ',
  '  XHHhHX  ',
  ' XJHHHHJX ',
  ' XJHQqHJX ',
  ' XJHqQHJX ',
  ' XJHHHHJX ',
  '  XJHHJX  ',
  '   XDDX   ',
  '   XDDX   ',
  '   XDDX   ',
  '   XDDX   ',
  '  XJDDJX  ',
  ' XJJDDJJX ',
]

/* ─── Quest Board (14×16) ─── */
export const BOARD_P: Record<string, string> = {
  X: P.X, W: P.W, w: P.w, D: P.D,
  P: P.P, p: P.p, I: '#2C1810',
  Q: P.Q, N: P.N, n: P.n,
  Y: P.Y,
}
export const BOARD_D = [
  '   XXXXXXXXXX  ',
  '  XDWWWWWWWWDX ',
  '  XWPPPPPPPPWX ',
  '  XWPIIpPIIpPX ',
  '  XWPpppPIppPX ',
  '  XWPIIpPpIIPX ',
  '  XWPpppPIppPX ',
  '  XWPQQpPIIpPX ',
  '  XWPPPPPPPPPX ',
  '  XDWWWWWWWWDX ',
  '   XXXXXXXXXX  ',
  '     XWWX      ',
  '     XWWX      ',
  '     XWWX      ',
  '     XDDX      ',
  '    XNNNNX     ',
]

/* ─── Signpost (10×16) ─── */
export const SIGN_P: Record<string, string> = {
  X: P.X, W: P.W, w: P.w, D: P.D, G: P.G, Y: P.Y, A: '#3E7A35',
}
export const SIGN_D = [
  '  XXXXXXX ',
  ' XAAAAAAX ',
  ' XAYYAAAX ',
  ' XAAAAYAX ',
  ' XAAAAAAX ',
  '  XXXXXXX ',
  '    XWX   ',
  '    XwX   ',
  '    XWX   ',
  '    XwX   ',
  '    XWX   ',
  '    XwX   ',
  '    XDX   ',
  '    XDX   ',
  '   XDDDX  ',
  '  XDDDDDX ',
]

/* ─── Progress Garden — stages (variable size) ─── */
export const GARDEN_P: Record<string, string> = {
  X: P.X, G: P.G, g: P.g, k: P.k,
  T: P.D, t: P.d,
  R: '#E74C3C', Y: P.Y, I: P.I, B: '#8B6914',
  E: P.E, e: P.e,
}
export const GARDEN_STAGES: string[][] = [
  // seed
  [' g  ', ' gG ', ' tg ', ' t  '],
  // sprout
  ['  gg  ', ' gGg  ', ' gkg  ', '  tg  ', '  t   ', ' ttt  '],
  // sapling
  ['   ggg   ', '  gGgGg  ', '  gkgkg  ', '   ggg   ', '    t    ', '    t    ', '    t    ', '   ttt   '],
  // bloom
  ['   R ggg   ', '  gRGgGgY  ', '  gkRkgYg  ', '  gGgGkgI  ', '   ggggIg  ', '    ggg    ', '     t     ', '     t     ', '     t     ', '    ttt    '],
  // grand
  ['    YRggg    ', '   gRGRGgIIg ', '  gkRkgRYIg  ', '  gGgGkgIgk  ', '  ggRggYgRg  ', '   gggYggg   ', '    ggggg    ', '     ggg     ', '     tt      ', '     tt      ', '     tt      ', '    tttt     '],
]
export function gardenStage(streak: number): string[] {
  if (streak <= 0) return GARDEN_STAGES[0]
  if (streak <= 3) return GARDEN_STAGES[1]
  if (streak <= 7) return GARDEN_STAGES[2]
  if (streak <= 14) return GARDEN_STAGES[3]
  return GARDEN_STAGES[4]
}

/* ─── Altar / Weekly Boss portal (16×20) ─── */
export const PORTAL_P: Record<string, string> = {
  X: P.X, S: P.S, s: P.s, L: P.L,
  M: P.M, m: P.m, V: P.V, T: P.T, Y: P.Y,
  n: P.n,
}
export const PORTAL_D = [
  '     XMMMX      ',
  '    XMmMmMX     ',
  '   XMmVVVmMX    ',
  '  XMmVTTTVmMX   ',
  ' XMmVTmmmTVmMX  ',
  ' XMVTmMMMmTVMX  ',
  'XMmVTmMVVMmTVmMX',
  'XMVTmMVXXVMmTVMX',
  'XMVTmMVXXVMmTVMX',
  'XMmVTmMVVMmTVmMX',
  ' XMVTmMMMmTVMX  ',
  ' XMmVTmmmTVmMX  ',
  '  XMmVTTTVmMX   ',
  '   XMmVVVmMX    ',
  '    XMmMmMX     ',
  '     XMMMX      ',
  '    sSsSsSs     ',
  '   sLSSsSSLs    ',
  '  nSnLSSSLnSn   ',
  ' nSnSnnnnnSnSn  ',
]

/* ─── Atlas Table (20×14) ─── */
export const ATLAS_P: Record<string, string> = {
  X: P.X, W: P.W, w: P.w, D: P.D,
  P: P.P, p: P.p, C: P.C, c: P.c, G: P.G, g: P.g,
  Q: P.Q, n: P.n, Y: P.Y,
}
export const ATLAS_D = [
  '                    ',
  '   XXXXXXXXXXXXXX   ',
  '  XWPPPPPPPPPPPPWX  ',
  '  XWPCCcCCcGgGgGPX  ',
  '  XWPcPGgQgGgCcPPX  ',
  '  XWPGPggYggGPCcPX  ',
  '  XWPcGPgPGgGPCcPX  ',
  '  XWPpPCCcpPGgGcPX  ',
  '  XWPPPPPPPPPPPPWX  ',
  '  XDWWWWWWWWWWWWDX  ',
  '   XWX        XWX   ',
  '   XWX        XWX   ',
  '   XDX        XDX   ',
  '   XDX        XDX   ',
]

/* ─── Campfire is FIRE; also stone ring base (16×4) ─── */
export const FIRE_RING_P: Record<string, string> = { X: P.X, S: P.S, s: P.s, L: P.L, n: '#4A3A2A' }
export const FIRE_RING_D = [
  '   SsLsSsLsS    ',
  '  sLSSsSSsLSs   ',
  '  nSnSLnSLnSn   ',
  '   nnnnnnnnn    ',
]

/* ─── Tree — oak (14×18) ─── */
export const TREE_OAK_P: Record<string, string> = {
  X: P.X, G: P.G, g: P.g, k: P.k, D: P.D, d: P.d, n: '#2E1E14',
}
export const TREE_OAK_D = [
  '     XXXX     ',
  '    XgGgGX    ',
  '   XggkGgkX   ',
  '  XgGkGkGgGX  ',
  ' XgGgkGGkGgGX ',
  ' XgkgGGgkGgkX ',
  'XgGgGkgGkGgGgX',
  'XgkgGgGkgGgkgX',
  ' XgGgkGGkGgGX ',
  '  XgGkgGkGgX  ',
  '   XggkGgkX   ',
  '    XgGgGX    ',
  '     XDDX     ',
  '     XDDX     ',
  '     XDdX     ',
  '     XDDX     ',
  '    XdDDdX    ',
  '   nnXXXXnn   ',
]

/* ─── Tree — pine (10×20) ─── */
export const TREE_PINE_P: Record<string, string> = {
  X: P.X, G: '#1E5D30', g: '#2C7A3E', k: '#458A4E', D: P.D, d: P.d,
}
export const TREE_PINE_D = [
  '    XX    ',
  '   XgGX   ',
  '   XGGX   ',
  '  XGgGgX  ',
  '  XgGGGX  ',
  ' XGggGgGX ',
  ' XgGGkGGX ',
  'XGgGgkGgGX',
  'XgGGkgGGgX',
  ' XGgGGgGX ',
  'XgGgGkGGgX',
  'XGgGkgGggX',
  ' XGggGgGX ',
  '  XGgGgX  ',
  '  XgGGgX  ',
  '   XGgX   ',
  '   XDDX   ',
  '   XDDX   ',
  '  XdDDdX  ',
  ' XXXXXXXX ',
]

/* ─── Bush (10×6) ─── */
export const BUSH_P: Record<string, string> = { X: P.X, G: P.G, g: P.g, k: P.k, I: P.I, Y: P.Y }
export const BUSH_D = [
  '   XXXX   ',
  '  XgGgGX  ',
  ' XgGkGgGX ',
  ' XgkGgIgX ',
  '  XggYgX  ',
  '   XXXX   ',
]

/* ─── Flower red (4×6) ─── */
export const FLOWER_R_P: Record<string, string> = { X: P.X, Q: P.Q, q: P.q, Y: P.Y, G: P.G, g: P.g }
export const FLOWER_R_D = [
  ' QQ ',
  'QqYq',
  ' QQ ',
  ' GG ',
  ' Gg ',
  ' GG ',
]
/* ─── Flower yellow ─── */
export const FLOWER_Y_P: Record<string, string> = { X: P.X, Y: P.Y, y: P.y, O: P.O, G: P.G, g: P.g }
export const FLOWER_Y_D = [
  ' YY ',
  'YOyO',
  ' YY ',
  ' GG ',
  ' Gg ',
  ' GG ',
]

/* ─── Rock (8×6) ─── */
export const ROCK_P: Record<string, string> = { X: P.X, S: P.S, s: P.s, L: P.L }
export const ROCK_D = [
  '  XXXX  ',
  ' XSLSLX ',
  'XSSLLSSX',
  'XsSssLsX',
  ' XsSssX ',
  '  XXXX  ',
]

/* ─── Barrel (8×10) ─── */
export const BARREL_P: Record<string, string> = { X: P.X, W: P.W, w: P.w, D: P.D }
export const BARREL_D = [
  ' XWWWWX ',
  'XWwwwwWX',
  'XDwwwwDX',
  'XWwwwwWX',
  'XDwwwwDX',
  'XWwwwwWX',
  'XDwwwwDX',
  'XWwwwwWX',
  ' XDDDDX ',
  '  XXXX  ',
]

/* ─── Crate (10×8) ─── */
export const CRATE_P: Record<string, string> = { X: P.X, W: P.W, w: P.w, D: P.D }
export const CRATE_D = [
  ' XXXXXXXX ',
  ' XWwWwWwWX',
  ' XwWwWwWwX',
  ' XWwXXwWwX',
  ' XwWXXWwWX',
  ' XWwWwWwWX',
  ' XwWwWwWwX',
  ' XXXXXXXX ',
]

/* ─── Lantern post (4×14) ─── */
export const LANTERN_P: Record<string, string> = { X: P.X, W: P.W, w: P.w, D: P.D, Y: P.Y, y: P.y }
export const LANTERN_D = [
  ' XX ',
  ' XX ',
  'XYYX',
  'XYyX',
  'XYYX',
  ' XX ',
  ' WW ',
  ' Ww ',
  ' WW ',
  ' Ww ',
  ' WW ',
  ' Ww ',
  ' DD ',
  ' DD ',
]

/* ─── Fence segments (horizontal 10×6, vertical 4×14) ─── */
export const FENCE_H_P: Record<string, string> = { X: P.X, W: P.W, w: P.w, D: P.D }
export const FENCE_H_D = [
  ' XX    XX ',
  ' XW    XW ',
  'XWwwwwwwwX',
  'XDwWwWwWwX',
  ' XW    XW ',
  ' XD    XD ',
]
export const FENCE_V_P: Record<string, string> = { X: P.X, W: P.W, w: P.w, D: P.D }
export const FENCE_V_D = [
  ' XX ',
  ' XW ',
  'XWwX',
  'XwWX',
  'XWwX',
  'XWwX',
  'XwWX',
  'XWwX',
  'XwWX',
  'XWwX',
  'XWwX',
  'XwWX',
  ' XD ',
  ' XD ',
]

/* ─── Bridge plank (16×6) ─── */
export const BRIDGE_PLANK_P: Record<string, string> = { X: P.X, W: P.W, w: P.w, D: P.D }
export const BRIDGE_PLANK_D = [
  'XDWwWwWwWwWwWDX ',
  'XWWwWwWwWwWwWWX ',
  'XWwWwWwWwWwWwWX ',
  'XWWwWwWwWwWwWWX ',
  'XDWwWwWwWwWwWDX ',
  ' XXXXXXXXXXXX   ',
]

/* ─── Stump (6×6) ─── */
export const STUMP_P: Record<string, string> = { X: P.X, W: P.W, w: P.w, D: P.D }
export const STUMP_D = [
  ' XXXX ',
  'XWwWwX',
  'XwDWwX',
  'XWwWWX',
  'XwWwWX',
  ' XXXX ',
]

/* ─── Target / practice post (8×14) ─── */
export const TARGET_P: Record<string, string> = { X: P.X, Q: P.Q, q: P.q, T: P.T, W: P.W, D: P.D, Y: P.Y }
export const TARGET_D = [
  ' XXXXXX ',
  'XQqQqQqX',
  'XqTQQTqX',
  'XQTYYTqX',
  'XqTYYTQX',
  'XQTQQTqX',
  'XqQqQqQX',
  ' XXXXXX ',
  '   WW   ',
  '   DW   ',
  '   WW   ',
  '   DW   ',
  '  XDDX  ',
  '  XXXX  ',
]

/* ─── Mushroom (6×5) ─── */
export const MUSHROOM_P: Record<string, string> = { X: P.X, Q: P.Q, q: P.q, T: P.T, W: P.W }
export const MUSHROOM_D = [
  ' XQQX ',
  'XQqTqX',
  'XqQQqX',
  ' XWWX ',
  ' XWWX ',
]
