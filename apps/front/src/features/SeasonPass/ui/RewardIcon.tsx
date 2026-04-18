// Pixel-style SVG reward icons for the season pass ladder. Each icon is
// drawn on a 16×16 grid (scaled by CSS to the tier cell size) using
// small <rect>s so it reads as "pixel art" regardless of zoom. Avoiding
// anti-aliasing keeps the edges crisp via shapeRendering="crispEdges".

import type { CSSProperties } from 'react'
import { RewardKind } from '@/features/SeasonPass/model/types'

interface Props {
  kind: RewardKind
  size?: number
  style?: CSSProperties
}

// Color palette — ember/moss/parchment from the global CSS variables,
// resolved to concrete hex values because raw SVG doesn't see
// `var(--...)`. Keep these in sync with the shop rarity palette.
const COLORS = {
  inkDark:   '#2a1f14',
  parch:     '#f6ead0',
  parchDim:  '#dcc690',
  emberHi:   '#ffd97f',
  emberLo:   '#b8692a',
  gold:      '#e9b866',
  goldDeep:  '#8f5a1f',
  gem:       '#8fb8d4',
  gemDeep:   '#3e6f8f',
  xp:        '#9fb89a',
  xpDeep:    '#4d6f4a',
  moss:      '#3d6149',
  danger:    '#a23a2a',
  frame:     '#c7ab6e',
  pet:       '#a27ac8',
  aura:      '#fcd063',
}

function IconFrame({ children, size = 16 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      style={{ display: 'block' }}
    >
      {children}
    </svg>
  )
}

function GoldCoin() {
  return (
    <g>
      {/* outer outline */}
      <rect x="5" y="1" width="6" height="1" fill={COLORS.inkDark} />
      <rect x="3" y="2" width="2" height="1" fill={COLORS.inkDark} />
      <rect x="11" y="2" width="2" height="1" fill={COLORS.inkDark} />
      <rect x="2" y="3" width="1" height="2" fill={COLORS.inkDark} />
      <rect x="13" y="3" width="1" height="2" fill={COLORS.inkDark} />
      <rect x="1" y="5" width="1" height="6" fill={COLORS.inkDark} />
      <rect x="14" y="5" width="1" height="6" fill={COLORS.inkDark} />
      <rect x="2" y="11" width="1" height="2" fill={COLORS.inkDark} />
      <rect x="13" y="11" width="1" height="2" fill={COLORS.inkDark} />
      <rect x="3" y="13" width="2" height="1" fill={COLORS.inkDark} />
      <rect x="11" y="13" width="2" height="1" fill={COLORS.inkDark} />
      <rect x="5" y="14" width="6" height="1" fill={COLORS.inkDark} />
      {/* gold body */}
      <rect x="5" y="2" width="6" height="1" fill={COLORS.emberHi} />
      <rect x="3" y="3" width="10" height="1" fill={COLORS.gold} />
      <rect x="2" y="4" width="12" height="1" fill={COLORS.gold} />
      <rect x="2" y="5" width="12" height="6" fill={COLORS.gold} />
      <rect x="3" y="11" width="10" height="1" fill={COLORS.goldDeep} />
      <rect x="5" y="12" width="6" height="1" fill={COLORS.goldDeep} />
      {/* stamped $ */}
      <rect x="7" y="4" width="2" height="1" fill={COLORS.goldDeep} />
      <rect x="6" y="5" width="1" height="1" fill={COLORS.goldDeep} />
      <rect x="7" y="6" width="2" height="1" fill={COLORS.goldDeep} />
      <rect x="9" y="7" width="1" height="1" fill={COLORS.goldDeep} />
      <rect x="6" y="8" width="3" height="1" fill={COLORS.goldDeep} />
      <rect x="7" y="3" width="1" height="7" fill={COLORS.emberHi} />
      {/* highlight */}
      <rect x="4" y="4" width="1" height="1" fill={COLORS.emberHi} />
      <rect x="3" y="5" width="1" height="2" fill={COLORS.emberHi} />
    </g>
  )
}

function Gem() {
  return (
    <g>
      {/* outline */}
      <rect x="5" y="1" width="6" height="1" fill={COLORS.inkDark} />
      <rect x="3" y="2" width="2" height="1" fill={COLORS.inkDark} />
      <rect x="11" y="2" width="2" height="1" fill={COLORS.inkDark} />
      <rect x="2" y="3" width="1" height="2" fill={COLORS.inkDark} />
      <rect x="13" y="3" width="1" height="2" fill={COLORS.inkDark} />
      <rect x="2" y="5" width="12" height="1" fill={COLORS.inkDark} />
      <rect x="3" y="6" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="12" y="6" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="4" y="7" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="11" y="7" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="5" y="8" width="1" height="2" fill={COLORS.inkDark} />
      <rect x="10" y="8" width="1" height="2" fill={COLORS.inkDark} />
      <rect x="6" y="10" width="1" height="2" fill={COLORS.inkDark} />
      <rect x="9" y="10" width="1" height="2" fill={COLORS.inkDark} />
      <rect x="7" y="12" width="2" height="2" fill={COLORS.inkDark} />
      {/* fills */}
      <rect x="5" y="2" width="6" height="1" fill={COLORS.gem} />
      <rect x="3" y="3" width="10" height="2" fill={COLORS.gem} />
      <rect x="4" y="6" width="8" height="1" fill={COLORS.gem} />
      <rect x="5" y="7" width="6" height="1" fill={COLORS.gem} />
      <rect x="6" y="8" width="4" height="2" fill={COLORS.gem} />
      <rect x="7" y="10" width="2" height="2" fill={COLORS.gem} />
      {/* facets / shading */}
      <rect x="4" y="3" width="2" height="1" fill={COLORS.parch} />
      <rect x="5" y="4" width="1" height="1" fill={COLORS.parch} />
      <rect x="9" y="3" width="3" height="1" fill={COLORS.gemDeep} />
      <rect x="8" y="5" width="4" height="1" fill={COLORS.gemDeep} />
      <rect x="8" y="8" width="2" height="1" fill={COLORS.gemDeep} />
    </g>
  )
}

function XpSpark() {
  return (
    <g>
      {/* 4-pointed star */}
      <rect x="7" y="1" width="2" height="2" fill={COLORS.inkDark} />
      <rect x="7" y="13" width="2" height="2" fill={COLORS.inkDark} />
      <rect x="1" y="7" width="2" height="2" fill={COLORS.inkDark} />
      <rect x="13" y="7" width="2" height="2" fill={COLORS.inkDark} />
      <rect x="6" y="3" width="4" height="1" fill={COLORS.inkDark} />
      <rect x="6" y="12" width="4" height="1" fill={COLORS.inkDark} />
      <rect x="3" y="6" width="1" height="4" fill={COLORS.inkDark} />
      <rect x="12" y="6" width="1" height="4" fill={COLORS.inkDark} />
      <rect x="5" y="4" width="6" height="1" fill={COLORS.inkDark} />
      <rect x="5" y="11" width="6" height="1" fill={COLORS.inkDark} />
      <rect x="4" y="5" width="1" height="6" fill={COLORS.inkDark} />
      <rect x="11" y="5" width="1" height="6" fill={COLORS.inkDark} />
      {/* fill */}
      <rect x="7" y="3" width="2" height="10" fill={COLORS.emberHi} />
      <rect x="3" y="7" width="10" height="2" fill={COLORS.emberHi} />
      <rect x="6" y="4" width="4" height="8" fill={COLORS.emberHi} />
      <rect x="4" y="6" width="8" height="4" fill={COLORS.emberHi} />
      {/* inner glow */}
      <rect x="7" y="5" width="2" height="6" fill={COLORS.parch} />
      <rect x="5" y="7" width="6" height="2" fill={COLORS.parch} />
    </g>
  )
}

function Frame() {
  return (
    <g>
      {/* outer ornate frame */}
      <rect x="1" y="1" width="14" height="2" fill={COLORS.frame} />
      <rect x="1" y="13" width="14" height="2" fill={COLORS.frame} />
      <rect x="1" y="3" width="2" height="10" fill={COLORS.frame} />
      <rect x="13" y="3" width="2" height="10" fill={COLORS.frame} />
      {/* inner */}
      <rect x="3" y="3" width="10" height="10" fill={COLORS.parch} />
      {/* corner gems */}
      <rect x="2" y="2" width="2" height="2" fill={COLORS.emberHi} />
      <rect x="12" y="2" width="2" height="2" fill={COLORS.emberHi} />
      <rect x="2" y="12" width="2" height="2" fill={COLORS.emberHi} />
      <rect x="12" y="12" width="2" height="2" fill={COLORS.emberHi} />
      {/* outline */}
      <rect x="0" y="0" width="16" height="1" fill={COLORS.inkDark} />
      <rect x="0" y="15" width="16" height="1" fill={COLORS.inkDark} />
      <rect x="0" y="0" width="1" height="16" fill={COLORS.inkDark} />
      <rect x="15" y="0" width="1" height="16" fill={COLORS.inkDark} />
      {/* portrait silhouette */}
      <rect x="7" y="6" width="2" height="2" fill={COLORS.goldDeep} />
      <rect x="6" y="8" width="4" height="4" fill={COLORS.goldDeep} />
    </g>
  )
}

function Pet() {
  return (
    <g>
      {/* fox/slime head */}
      <rect x="5" y="3" width="6" height="1" fill={COLORS.inkDark} />
      <rect x="4" y="4" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="11" y="4" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="3" y="5" width="1" height="5" fill={COLORS.inkDark} />
      <rect x="12" y="5" width="1" height="5" fill={COLORS.inkDark} />
      <rect x="4" y="10" width="1" height="2" fill={COLORS.inkDark} />
      <rect x="11" y="10" width="1" height="2" fill={COLORS.inkDark} />
      <rect x="5" y="12" width="2" height="1" fill={COLORS.inkDark} />
      <rect x="9" y="12" width="2" height="1" fill={COLORS.inkDark} />
      {/* body */}
      <rect x="5" y="4" width="6" height="1" fill={COLORS.emberLo} />
      <rect x="4" y="5" width="8" height="5" fill={COLORS.emberLo} />
      <rect x="5" y="10" width="6" height="2" fill={COLORS.emberLo} />
      <rect x="7" y="12" width="2" height="1" fill={COLORS.emberLo} />
      {/* ears */}
      <rect x="4" y="1" width="2" height="2" fill={COLORS.inkDark} />
      <rect x="10" y="1" width="2" height="2" fill={COLORS.inkDark} />
      <rect x="5" y="2" width="1" height="1" fill={COLORS.emberLo} />
      <rect x="10" y="2" width="1" height="1" fill={COLORS.emberLo} />
      {/* eyes */}
      <rect x="6" y="6" width="1" height="2" fill={COLORS.inkDark} />
      <rect x="9" y="6" width="1" height="2" fill={COLORS.inkDark} />
      <rect x="6" y="6" width="1" height="1" fill={COLORS.parch} />
      <rect x="9" y="6" width="1" height="1" fill={COLORS.parch} />
      {/* mouth / nose */}
      <rect x="7" y="9" width="2" height="1" fill={COLORS.inkDark} />
    </g>
  )
}

function Emote() {
  return (
    <g>
      {/* speech bubble */}
      <rect x="2" y="2" width="12" height="1" fill={COLORS.inkDark} />
      <rect x="2" y="9" width="12" height="1" fill={COLORS.inkDark} />
      <rect x="2" y="2" width="1" height="8" fill={COLORS.inkDark} />
      <rect x="13" y="2" width="1" height="8" fill={COLORS.inkDark} />
      <rect x="3" y="3" width="10" height="6" fill={COLORS.parch} />
      {/* tail */}
      <rect x="5" y="10" width="3" height="1" fill={COLORS.inkDark} />
      <rect x="6" y="11" width="2" height="1" fill={COLORS.inkDark} />
      <rect x="6" y="12" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="5" y="10" width="2" height="1" fill={COLORS.parch} />
      <rect x="6" y="11" width="1" height="1" fill={COLORS.parch} />
      {/* dots */}
      <rect x="5" y="5" width="2" height="2" fill={COLORS.emberLo} />
      <rect x="9" y="5" width="2" height="2" fill={COLORS.emberLo} />
    </g>
  )
}

function BannerIcon() {
  return (
    <g>
      {/* pole */}
      <rect x="7" y="1" width="1" height="14" fill={COLORS.goldDeep} />
      <rect x="6" y="1" width="3" height="1" fill={COLORS.gold} />
      {/* flag */}
      <rect x="8" y="2" width="6" height="1" fill={COLORS.inkDark} />
      <rect x="8" y="10" width="6" height="1" fill={COLORS.inkDark} />
      <rect x="14" y="3" width="1" height="7" fill={COLORS.inkDark} />
      <rect x="8" y="3" width="6" height="7" fill={COLORS.danger} />
      {/* crest */}
      <rect x="10" y="4" width="2" height="1" fill={COLORS.gold} />
      <rect x="9" y="5" width="4" height="3" fill={COLORS.gold} />
      <rect x="10" y="8" width="2" height="1" fill={COLORS.gold} />
      {/* forked tail */}
      <rect x="10" y="10" width="1" height="2" fill={COLORS.inkDark} />
      <rect x="11" y="11" width="1" height="1" fill={COLORS.inkDark} />
    </g>
  )
}

function Aura() {
  return (
    <g>
      {/* outer glow ring */}
      <circle cx="8" cy="8" r="7" fill={COLORS.aura} opacity="0.2" />
      {/* cross-shape aura */}
      <rect x="7" y="0" width="2" height="3" fill={COLORS.aura} />
      <rect x="7" y="13" width="2" height="3" fill={COLORS.aura} />
      <rect x="0" y="7" width="3" height="2" fill={COLORS.aura} />
      <rect x="13" y="7" width="3" height="2" fill={COLORS.aura} />
      <rect x="2" y="2" width="2" height="2" fill={COLORS.aura} />
      <rect x="12" y="2" width="2" height="2" fill={COLORS.aura} />
      <rect x="2" y="12" width="2" height="2" fill={COLORS.aura} />
      <rect x="12" y="12" width="2" height="2" fill={COLORS.aura} />
      {/* core */}
      <rect x="5" y="5" width="6" height="6" fill={COLORS.emberHi} />
      <rect x="6" y="4" width="4" height="1" fill={COLORS.inkDark} />
      <rect x="6" y="11" width="4" height="1" fill={COLORS.inkDark} />
      <rect x="4" y="6" width="1" height="4" fill={COLORS.inkDark} />
      <rect x="11" y="6" width="1" height="4" fill={COLORS.inkDark} />
      <rect x="5" y="5" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="10" y="5" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="5" y="10" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="10" y="10" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="6" y="6" width="4" height="4" fill={COLORS.parch} />
    </g>
  )
}

function Cosmetic() {
  // Wizard/adventurer hat — reads as "cosmetic" better than a generic square.
  return (
    <g>
      {/* point */}
      <rect x="7" y="1" width="2" height="1" fill={COLORS.inkDark} />
      <rect x="6" y="2" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="9" y="2" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="7" y="2" width="2" height="1" fill={COLORS.emberLo} />
      {/* upper cone */}
      <rect x="5" y="3" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="10" y="3" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="6" y="3" width="4" height="1" fill={COLORS.emberLo} />
      <rect x="4" y="4" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="11" y="4" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="5" y="4" width="6" height="1" fill={COLORS.emberLo} />
      <rect x="3" y="5" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="12" y="5" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="4" y="5" width="8" height="1" fill={COLORS.emberLo} />
      <rect x="2" y="6" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="13" y="6" width="1" height="1" fill={COLORS.inkDark} />
      <rect x="3" y="6" width="10" height="1" fill={COLORS.emberLo} />
      {/* brim */}
      <rect x="1" y="7" width="14" height="2" fill={COLORS.inkDark} />
      <rect x="2" y="8" width="12" height="1" fill={COLORS.frame} />
      {/* star */}
      <rect x="7" y="4" width="2" height="2" fill={COLORS.emberHi} />
    </g>
  )
}

export function RewardIcon({ kind, size = 22, style }: Props) {
  let body: React.ReactNode = null
  switch (kind) {
    case RewardKind.GOLD:     body = <GoldCoin />; break
    case RewardKind.GEMS:     body = <Gem />; break
    case RewardKind.XP:       body = <XpSpark />; break
    case RewardKind.FRAME:    body = <Frame />; break
    case RewardKind.PET:      body = <Pet />; break
    case RewardKind.EMOTE:    body = <Emote />; break
    case RewardKind.BANNER:   body = <BannerIcon />; break
    case RewardKind.AURA:     body = <Aura />; break
    case RewardKind.COSMETIC: body = <Cosmetic />; break
    default:
      // Unspecified — neutral placeholder.
      body = (
        <g>
          <rect x="2" y="2" width="12" height="12" fill={COLORS.parchDim} />
          <rect x="1" y="1" width="14" height="1" fill={COLORS.inkDark} />
          <rect x="1" y="14" width="14" height="1" fill={COLORS.inkDark} />
          <rect x="1" y="1" width="1" height="14" fill={COLORS.inkDark} />
          <rect x="14" y="1" width="1" height="14" fill={COLORS.inkDark} />
        </g>
      )
      break
  }
  return (
    <div style={{ width: size, height: size, ...style }}>
      <IconFrame size={size}>{body}</IconFrame>
    </div>
  )
}
