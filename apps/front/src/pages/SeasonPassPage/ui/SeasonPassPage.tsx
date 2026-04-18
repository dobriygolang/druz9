import { useCallback, useEffect, useState } from 'react'
import { Panel, RpgButton, Bar, Badge, PageHeader } from '@/shared/ui/pixel'
import { addToast } from '@/shared/lib/toasts'
import {
  seasonPassApi,
  RewardKind,
  RewardTrack,
  type SeasonPassTier,
  type SeasonPassProgress,
  type SeasonPass,
} from '@/features/SeasonPass'

// ---------- visual tokens ----------

const KIND_COLOR: Record<RewardKind, string> = {
  [RewardKind.UNSPECIFIED]: 'var(--ink-3)',
  [RewardKind.GOLD]:        '#dcc690',
  [RewardKind.GEMS]:        '#8fb8d4',
  [RewardKind.XP]:          '#9fb89a',
  [RewardKind.FRAME]:       '#b8692a',
  [RewardKind.PET]:         '#3d6149',
  [RewardKind.EMOTE]:       '#a27ac8',
  [RewardKind.BANNER]:      '#a23a2a',
  [RewardKind.AURA]:        '#e9b866',
  [RewardKind.COSMETIC]:    '#c7ab6e',
}

const KIND_LABEL: Record<RewardKind, string> = {
  [RewardKind.UNSPECIFIED]: '—',
  [RewardKind.GOLD]:        'gold',
  [RewardKind.GEMS]:        'gems',
  [RewardKind.XP]:          'xp',
  [RewardKind.FRAME]:       'frame',
  [RewardKind.PET]:         'pet',
  [RewardKind.EMOTE]:       'emote',
  [RewardKind.BANNER]:      'banner',
  [RewardKind.AURA]:        'aura',
  [RewardKind.COSMETIC]:    'cosmetic',
}

// ---------- page ----------

export function SeasonPassPage() {
  const [pass, setPass] = useState<SeasonPass | null>(null)
  const [tiers, setTiers] = useState<SeasonPassTier[]>([])
  const [progress, setProgress] = useState<SeasonPassProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const resp = await seasonPassApi.getActive()
      setPass(resp.pass)
      setTiers(resp.tiers)
      setProgress(resp.progress)
      setError(null)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'No active season pass')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onClaim = async (tier: number, track: RewardTrack) => {
    try {
      const resp = await seasonPassApi.claim(tier, track)
      setProgress(resp.progress)
      addToast({
        kind: 'LOOT',
        title: 'Reward claimed',
        body: `${resp.claimedLabel} · ${KIND_LABEL[resp.claimedKind]}`,
        icon: '◈',
        color: 'var(--r-epic)',
      })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      addToast({
        kind: 'QUEST',
        title: 'Claim failed',
        body: msg ?? 'Что-то пошло не так',
        icon: '!',
        color: 'var(--rpg-danger)',
      })
    }
  }

  const onPurchasePremium = async () => {
    if (purchasing) return
    setPurchasing(true)
    try {
      const resp = await seasonPassApi.purchasePremium()
      setProgress(resp.progress)
      addToast({
        kind: 'LOOT',
        title: 'Premium unlocked',
        body: 'The Ember Pact — premium track active',
        icon: '⛨',
        color: 'var(--ember-1)',
      })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      addToast({
        kind: 'QUEST',
        title: 'Purchase failed',
        body: msg ?? 'Что-то пошло не так',
        icon: '!',
        color: 'var(--rpg-danger)',
      })
    } finally {
      setPurchasing(false)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader eyebrow="Season · ledger" title="Season Pass" />
        <Panel>
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-2)' }}>Loading…</div>
        </Panel>
      </>
    )
  }

  if (error || !pass || !progress) {
    return (
      <>
        <PageHeader eyebrow="Season · ledger" title="Season Pass" />
        <Panel>
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-2)' }}>
            {error ?? 'No active season'}
          </div>
        </Panel>
      </>
    )
  }

  const nextTierIdx = Math.min(progress.currentTier + 1, pass.maxTier)
  const xpInTier = progress.xp % pass.xpPerTier
  const xpPct = (xpInTier / pass.xpPerTier) * 100
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(pass.endsAt).getTime() - Date.now()) / 86_400_000),
  )

  return (
    <>
      <PageHeader
        eyebrow={`Season ${romanize(pass.seasonNumber)} · ledger`}
        title={pass.title}
        subtitle={pass.subtitle}
        right={
          <span
            className="font-silkscreen uppercase"
            style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
          >
            {daysLeft}d left
          </span>
        }
      />

      {/* Progress summary */}
      <Panel style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div
              className="font-silkscreen uppercase"
              style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
            >
              current tier
            </div>
            <div
              style={{
                fontFamily: 'Pixelify Sans, monospace',
                fontSize: 42,
                color: 'var(--ember-1)',
                lineHeight: 1,
              }}
            >
              {progress.currentTier}
              <span style={{ color: 'var(--ink-3)', fontSize: 22 }}> / {pass.maxTier}</span>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div
              className="font-silkscreen uppercase"
              style={{
                fontSize: 9,
                color: 'var(--ink-2)',
                letterSpacing: '0.08em',
                marginBottom: 4,
              }}
            >
              xp to tier {nextTierIdx}
            </div>
            <Bar value={xpPct} />
            <div
              className="font-silkscreen uppercase"
              style={{
                fontSize: 9,
                color: 'var(--ink-2)',
                letterSpacing: '0.08em',
                marginTop: 4,
              }}
            >
              {xpInTier} / {pass.xpPerTier} xp · {progress.xp.toLocaleString()} total
            </div>
          </div>

          {progress.hasPremium ? (
            <Badge variant="ember">premium active</Badge>
          ) : (
            <RpgButton variant="primary" onClick={() => void onPurchasePremium()} disabled={purchasing}>
              {purchasing ? 'Purchasing…' : `Buy premium · ${pass.premiumPriceGems} 💎`}
            </RpgButton>
          )}
        </div>
      </Panel>

      {/* Tier ladder */}
      <Panel style={{ marginBottom: 18, padding: '16px 20px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 12,
          }}
        >
          <h3 className="font-display" style={{ fontSize: 17 }}>
            Reward track
          </h3>
          <span
            className="font-silkscreen uppercase"
            style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
          >
            scroll ▸ claim rewards as you climb
          </span>
        </div>

        {/* Header: free ↕ premium rows with tier numbers below */}
        <div
          style={{
            display: 'grid',
            gridTemplateRows: 'auto auto auto',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 8,
          }}
        >
          {/* FREE row */}
          <div style={{ display: 'flex', gap: 6 }}>
            {tiers.map((t) => (
              <TierCell
                key={`f-${t.tier}`}
                tier={t.tier}
                currentTier={progress.currentTier}
                maxTier={pass.maxTier}
                kind={t.freeRewardKind}
                label={t.freeRewardLabel}
                claimed={progress.claimedFree.includes(t.tier)}
                reachable={progress.currentTier >= t.tier}
                track={RewardTrack.FREE}
                onClick={() => void onClaim(t.tier, RewardTrack.FREE)}
              />
            ))}
          </div>

          {/* TIER number strip */}
          <div style={{ display: 'flex', gap: 6 }}>
            {tiers.map((t) => (
              <div
                key={`n-${t.tier}`}
                style={{
                  width: 56,
                  textAlign: 'center',
                  fontFamily: 'Pixelify Sans, monospace',
                  fontSize: 13,
                  color: progress.currentTier >= t.tier ? 'var(--ember-1)' : 'var(--ink-3)',
                  flexShrink: 0,
                }}
              >
                {t.tier}
              </div>
            ))}
          </div>

          {/* PREMIUM row */}
          <div style={{ display: 'flex', gap: 6 }}>
            {tiers.map((t) => (
              <TierCell
                key={`p-${t.tier}`}
                tier={t.tier}
                currentTier={progress.currentTier}
                maxTier={pass.maxTier}
                kind={t.premiumRewardKind}
                label={t.premiumRewardLabel}
                claimed={progress.claimedPremium.includes(t.tier)}
                reachable={progress.currentTier >= t.tier}
                track={RewardTrack.PREMIUM}
                locked={!progress.hasPremium}
                onClick={() => void onClaim(t.tier, RewardTrack.PREMIUM)}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 14,
            flexWrap: 'wrap',
            fontSize: 10,
            color: 'var(--ink-2)',
          }}
          className="font-silkscreen uppercase"
        >
          <span>▸ top row: free · bottom row: premium</span>
          <span>▸ gold border = claimed</span>
          <span>▸ dimmed = locked (premium) or not reached</span>
        </div>
      </Panel>
    </>
  )
}

// ---------- tier cell ----------

function TierCell({
  tier,
  currentTier,
  maxTier,
  kind,
  label,
  claimed,
  reachable,
  track,
  locked = false,
  onClick,
}: {
  tier: number
  currentTier: number
  maxTier: number
  kind: RewardKind
  label: string
  claimed: boolean
  reachable: boolean
  track: RewardTrack
  locked?: boolean
  onClick: () => void
}) {
  const isMilestone = tier % 10 === 0 || tier === maxTier
  const isCurrent = tier === currentTier + 1
  const canClaim = reachable && !claimed && !locked
  const bg = claimed
    ? track === RewardTrack.PREMIUM
      ? 'var(--ember-2)'
      : 'var(--moss-2)'
    : 'var(--parch-2)'

  return (
    <button
      type="button"
      onClick={canClaim ? onClick : undefined}
      disabled={!canClaim}
      title={`Tier ${tier} · ${label || KIND_LABEL[kind]}`}
      style={{
        width: 56,
        height: 68,
        background: bg,
        border: claimed
          ? '3px solid var(--ember-1)'
          : isMilestone
          ? '3px solid var(--ember-1)'
          : isCurrent
          ? '3px dashed var(--ember-1)'
          : '2px solid var(--ink-0)',
        boxShadow: reachable && !locked ? '2px 2px 0 var(--ink-0)' : 'none',
        opacity: locked || !reachable ? 0.45 : 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        flexShrink: 0,
        padding: 4,
        cursor: canClaim ? 'pointer' : 'default',
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          background: KIND_COLOR[kind] ?? 'var(--ink-3)',
          border: '2px solid var(--ink-0)',
        }}
      />
      <div
        className="font-silkscreen uppercase"
        style={{
          fontSize: 7,
          color: 'var(--ink-2)',
          letterSpacing: '0.06em',
          textAlign: 'center',
          lineHeight: 1.1,
          maxWidth: 48,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        {KIND_LABEL[kind]}
      </div>
    </button>
  )
}

function romanize(n: number): string {
  const table: Array<[number, string]> = [
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let out = ''
  for (const [v, s] of table) {
    while (n >= v) {
      out += s
      n -= v
    }
  }
  return out || String(n)
}
