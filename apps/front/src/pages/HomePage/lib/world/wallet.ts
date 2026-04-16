/**
 * Wallet — local-only currency + inventory state.
 *
 * Backed by localStorage for now; swap for backend sync in a follow-up.
 * Currency: "embers" (coin-like). Inventory: map of item-id → count.
 */

import { useCallback, useEffect, useState } from 'react'

const KEY = 'druz9.wallet.v1'

export interface WalletState {
  embers: number
  inventory: Record<string, number>
}

const DEFAULT: WalletState = { embers: 120, inventory: {} }

export interface ShopItem {
  id: string
  name: string
  description: string
  price: number
  icon: string // emoji fallback for modal
  category: 'seed' | 'decor' | 'cosmetic' | 'tool'
}

export const SHOP_CATALOG: ShopItem[] = [
  { id: 'seed_bloom',   name: 'Bloom Seed',    description: 'Grows faster in your streak garden.', price: 20, icon: '🌱', category: 'seed' },
  { id: 'seed_rare',    name: 'Starlight Seed', description: 'Rare plant — blooms at 7-day streak.', price: 60, icon: '🌟', category: 'seed' },
  { id: 'lantern_blue', name: 'Azure Lantern', description: 'A cool-glow lantern for your camp.', price: 35, icon: '🏮', category: 'decor' },
  { id: 'banner_guild', name: 'Guild Banner',  description: 'A red banner for your camp walls.',    price: 45, icon: '🚩', category: 'decor' },
  { id: 'hat_scholar',  name: 'Scholar Hat',   description: 'A cosmetic for your character.',       price: 80, icon: '🎩', category: 'cosmetic' },
  { id: 'tonic_focus',  name: 'Focus Tonic',   description: 'Restores energy once consumed.',       price: 25, icon: '🧪', category: 'tool' },
]

function load(): WalletState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT
    const parsed = JSON.parse(raw) as WalletState
    return { ...DEFAULT, ...parsed, inventory: { ...(parsed.inventory ?? {}) } }
  } catch { return DEFAULT }
}

function save(s: WalletState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

export function useWallet() {
  const [state, setState] = useState<WalletState>(load)

  useEffect(() => { save(state) }, [state])

  const buy = useCallback((item: ShopItem): { ok: boolean; reason?: string } => {
    if (state.embers < item.price) return { ok: false, reason: 'Not enough embers' }
    setState(s => ({
      embers: s.embers - item.price,
      inventory: { ...s.inventory, [item.id]: (s.inventory[item.id] ?? 0) + 1 },
    }))
    return { ok: true }
  }, [state.embers])

  const reward = useCallback((amount: number) => {
    setState(s => ({ ...s, embers: s.embers + amount }))
  }, [])

  return { state, buy, reward }
}
