import { Modal, RpgButton } from '@/shared/ui/pixel'
import { useTweaks } from '@/shared/lib/gameState'
import { addToast } from '@/shared/lib/toasts'
import type { RoomLayout, HeroPose, Pet, Season, Density } from '@/shared/lib/gameState'

interface TweaksPanelProps {
  open: boolean
  onClose: () => void
  onOpenNotifs?: () => void
  onOpenLevelUp?: () => void
  onOpenOnboarding?: () => void
  onOpenStreakRecovery?: () => void
  onOpenSeasonComplete?: () => void
  onStartTour?: () => void
  onOpenDemo?: () => void
}

export function TweaksPanel({
  open,
  onClose,
  onOpenNotifs,
  onOpenLevelUp,
  onOpenOnboarding,
  onOpenStreakRecovery,
  onOpenSeasonComplete,
  onStartTour,
  onOpenDemo,
}: TweaksPanelProps) {
  const [tweaks, update] = useTweaks()

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="font-display" style={{ fontSize: 22 }}>Tweaks</h2>
        <RpgButton size="sm" variant="ghost" onClick={onClose}>Close</RpgButton>
      </div>
      <div
        className="font-silkscreen uppercase"
        style={{ color: 'var(--ink-2)', fontSize: 10, letterSpacing: '0.08em', marginBottom: 12 }}
      >
        Dev + accessibility overlay
      </div>

      <Group label="Room layout">
        {(['cozy', 'scholar', 'warrior'] as RoomLayout[]).map((v) => (
          <Pill key={v} active={tweaks.roomLayout === v} onClick={() => update({ roomLayout: v })}>{v}</Pill>
        ))}
      </Group>

      <Group label="Hero pose">
        {(['idle', 'wave', 'trophy'] as HeroPose[]).map((v) => (
          <Pill key={v} active={tweaks.heroPose === v} onClick={() => update({ heroPose: v })}>{v}</Pill>
        ))}
      </Group>

      <Group label="Companion">
        {(['slime', 'raven', 'orb', 'none'] as Pet[]).map((v) => (
          <Pill key={v} active={tweaks.pet === v} onClick={() => update({ pet: v })}>{v}</Pill>
        ))}
      </Group>

      <Group label="Season">
        {(['day', 'dusk', 'night', 'winter'] as Season[]).map((v) => (
          <Pill key={v} active={tweaks.season === v} onClick={() => update({ season: v })}>{v}</Pill>
        ))}
      </Group>

      <Group label="Density">
        {(['compact', 'normal', 'roomy'] as Density[]).map((v) => (
          <Pill key={v} active={tweaks.density === v} onClick={() => update({ density: v })}>{v}</Pill>
        ))}
      </Group>

      <Group label="demo · overlays">
        <Chip onClick={() => addToast({ kind: 'QUEST', title: 'Quest accepted', body: 'Reverse an array · +50xp', icon: '✦', color: 'var(--ember-1)' })}>
          toast · quest
        </Chip>
        <Chip onClick={() => addToast({ kind: 'DUEL', title: 'Duel invite · Frostglade', body: 'Ranked · 5 min · accept?', icon: '⚔', color: 'var(--rpg-danger)' })}>
          toast · duel
        </Chip>
        <Chip onClick={() => addToast({ kind: 'GUILD', title: 'Guild under attack', body: 'Siege begins in 2h · join defense', icon: '⛨', color: 'var(--moss-1)' })}>
          toast · guild
        </Chip>
        <Chip onClick={() => addToast({ kind: 'LOOT', title: 'Rare drop: Moonveil shard', body: 'Added to inventory · epic', icon: '◈', color: 'var(--r-epic)' })}>
          toast · loot
        </Chip>
        {onOpenNotifs && (
          <Chip onClick={() => { onClose(); onOpenNotifs() }}>open notifications</Chip>
        )}
        {onOpenLevelUp && (
          <Chip onClick={() => { onClose(); onOpenLevelUp() }}>trigger level-up</Chip>
        )}
        {onOpenOnboarding && (
          <Chip onClick={() => { onClose(); onOpenOnboarding() }}>onboarding →</Chip>
        )}
        {onOpenStreakRecovery && (
          <Chip onClick={() => { onClose(); onOpenStreakRecovery() }}>streak broken</Chip>
        )}
        {onOpenSeasonComplete && (
          <Chip onClick={() => { onClose(); onOpenSeasonComplete() }}>season complete →</Chip>
        )}
        {onStartTour && (
          <Chip onClick={() => { onClose(); onStartTour() }}>▶ play demo (tour)</Chip>
        )}
        {onOpenDemo && (
          <Chip onClick={() => { onClose(); onOpenDemo() }}>▶ demo walkthrough</Chip>
        )}
      </Group>
    </Modal>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        className="font-silkscreen uppercase"
        style={{ color: 'var(--ink-2)', fontSize: 10, letterSpacing: '0.1em', marginBottom: 6 }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}

function Pill({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <RpgButton size="sm" variant={active ? 'primary' : 'default'} onClick={onClick}>
      {children}
    </RpgButton>
  )
}

function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <span
      className="rpg-tweak-chip"
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      {children}
    </span>
  )
}
