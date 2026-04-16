/**
 * Home hub modals — thin presentational modals, state driven by engine.
 *
 * Each modal receives its own data + close callback; the HomePage owns
 * the orchestration. Adding a new modal is: add a case here + add an
 * `action: { type: 'modal', id: '…' }` to a POI in scene.ts.
 */

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sprite } from '@/shared/ui/Sprite'
import type { DailyMissionsResponse } from '@/features/Mission/model/types'
import { GARDEN_P, gardenStage } from '../../lib/world/sprites'
import { SHOP_CATALOG, type ShopItem, type WalletState } from '../../lib/world/wallet'

interface Base {
  onClose: () => void
}

export function ModalShell({ title, children, footer, onClose }: {
  title: string; children: React.ReactNode; footer?: React.ReactNode; onClose: () => void
}) {
  return (
    <div className="gw-modal-backdrop" onClick={onClose}>
      <div className="gw-modal" onClick={e => e.stopPropagation()}>
        <div className="gw-modal-header"><div className="gw-modal-title">{title}</div></div>
        <div className="gw-modal-body">{children}</div>
        {footer ?? (
          <div className="gw-modal-footer">
            <button className="gw-modal-btn" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Quests ─── */
export function QuestsModal({ missions, onClose }: Base & { missions: DailyMissionsResponse | null }) {
  const { t } = useTranslation()
  return (
    <ModalShell title={`📜 ${t('home.missions.title', 'Daily Quests')}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {missions?.missions.map(m => (
          <Link key={m.key} to={m.actionUrl} onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
              textDecoration: 'none', color: 'inherit', opacity: m.completed ? .5 : 1,
            }}>
            <span style={{ width: 20, textAlign: 'center', fontSize: 14 }}>{m.completed ? '✅' : '⬜'}</span>
            <span style={{
              flex: 1, fontSize: 13, fontWeight: 500,
              textDecoration: m.completed ? 'line-through' : 'none',
              color: 'var(--text-primary, #2C1810)',
            }}>{m.title}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: '#15803D' }}>
              +{m.xpReward} XP
            </span>
          </Link>
        )) ?? <div style={{ color: '#8B7355', fontSize: 12 }}>{t('common.loading', 'Loading…')}</div>}
      </div>
      {missions?.allComplete && (
        <div style={{
          marginTop: 12, padding: '8px 12px', background: 'rgba(5,150,105,.1)',
          borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#059669', textAlign: 'center',
        }}>
          ✨ {t('home.missions.allDone', 'All complete! +{{xp}} XP', { xp: missions.bonusXp })}
        </div>
      )}
    </ModalShell>
  )
}

/* ─── Weekly Boss ─── */
export function BossModal({ weeklyBoss, daysLeft, onClose }: Base & {
  weeklyBoss: { myEntry: { aiScore: number; solveTimeMs: number } | null } | null
  daysLeft: number | null
}) {
  const { t } = useTranslation()
  return (
    <ModalShell
      title={`⚔ ${t('home.weeklyBoss.title', 'Weekly Boss')}`}
      onClose={onClose}
      footer={
        <div className="gw-modal-footer">
          <button className="gw-modal-btn" onClick={onClose}>{t('common.later', 'Later')}</button>
          <Link to="/practice/weekly-boss" className="gw-modal-btn gw-modal-btn-boss" onClick={onClose}>
            {t('weeklyBoss.startChallenge', 'Enter')} →
          </Link>
        </div>
      }
    >
      <p style={{ fontSize: 13, color: 'var(--text-primary, #2C1810)', marginBottom: 8 }}>
        {weeklyBoss?.myEntry
          ? t('home.weeklyBoss.yourScore', 'Your best: {{score}}/10', { score: weeklyBoss.myEntry.aiScore })
          : t('home.weeklyBoss.notAttempted', 'Not attempted yet — take on the challenge!')}
      </p>
      {daysLeft !== null && (
        <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#D97706', fontWeight: 700 }}>
          ⏰ {daysLeft} {t('home.weeklyBoss.daysLeft', 'days left')}
        </p>
      )}
    </ModalShell>
  )
}

/* ─── Garden ─── */
export function GardenModal({ streakDays, totalXp, level, onClose }: Base & { streakDays: number; totalXp: number; level: number }) {
  const { t } = useTranslation()
  return (
    <ModalShell
      title={`🌱 ${t('home.garden.title', 'Progress Garden')}`}
      onClose={onClose}
      footer={
        <div className="gw-modal-footer">
          <button className="gw-modal-btn" onClick={onClose}>Close</button>
          <Link to="/profile" className="gw-modal-btn gw-modal-btn-primary" onClick={onClose}>
            {t('nav.profile', 'Character Sheet')} →
          </Link>
        </div>
      }
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ margin: '12px auto' }}>
          <Sprite data={gardenStage(streakDays)} palette={GARDEN_P} pixel={7} />
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-primary, #2C1810)', marginBottom: 6 }}>
          {streakDays > 0
            ? t('home.topLayer.streak', '{{count}} day streak', { count: streakDays })
            : t('home.garden.noStreak', 'Start a streak to grow!')}
        </p>
        <p style={{ fontSize: 11, color: '#8B7355' }}>XP: {totalXp} · LV.{level}</p>
      </div>
    </ModalShell>
  )
}

/* ─── Shop ─── */
export function ShopModal({ wallet, onBuy, onClose }: Base & {
  wallet: WalletState
  onBuy: (item: ShopItem) => { ok: boolean; reason?: string }
}) {
  return (
    <ModalShell
      title={`🏪 Traveling Merchant`}
      onClose={onClose}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: '#6B5A47' }}>Buy seeds, decor & more.</span>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
          color: '#D97706', background: 'rgba(217,119,6,.1)', padding: '3px 8px', borderRadius: 6,
        }}>🔥 {wallet.embers} embers</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
        {SHOP_CATALOG.map(item => {
          const owned = wallet.inventory[item.id] ?? 0
          const canAfford = wallet.embers >= item.price
          return (
            <div key={item.id} style={{
              padding: 8, border: '2px solid #C8AC7E', borderRadius: 8,
              background: 'rgba(255,255,255,.4)', display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#2C1810' }}>{item.name}</span>
              </div>
              <div style={{ fontSize: 9, color: '#6B5A47', minHeight: 24 }}>{item.description}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: '#8B7355' }}>Owned: {owned}</span>
                <button
                  disabled={!canAfford}
                  onClick={() => onBuy(item)}
                  style={{
                    padding: '3px 8px', border: '1.5px solid #C8AC7E', borderRadius: 6,
                    background: canAfford ? 'linear-gradient(180deg,#059669,#047857)' : '#DDD3BB',
                    color: canAfford ? '#FFF' : '#8B7355',
                    fontFamily: "'Press Start 2P', monospace", fontSize: 8,
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                  }}
                >{item.price}🔥</button>
              </div>
            </div>
          )
        })}
      </div>
    </ModalShell>
  )
}

/* ─── Academy ─── */
export function AcademyModal({ onClose }: Base) {
  return (
    <ModalShell
      title="📚 Academy"
      onClose={onClose}
      footer={
        <div className="gw-modal-footer">
          <button className="gw-modal-btn" onClick={onClose}>Close</button>
          <Link to="/prepare" className="gw-modal-btn gw-modal-btn-primary" onClick={onClose}>Enter →</Link>
        </div>
      }
    >
      <p style={{ fontSize: 12, color: '#2C1810', marginBottom: 8 }}>
        Study the ancient tomes: interview prep, structured lessons, guided paths.
      </p>
      <ul style={{ fontSize: 11, color: '#6B5A47', paddingLeft: 18, lineHeight: 1.6 }}>
        <li>Interview prep sessions</li>
        <li>Category-based drills</li>
        <li>Curated reading paths</li>
      </ul>
    </ModalShell>
  )
}

/* ─── Training ─── */
export function TrainingModal({ onClose }: Base) {
  return (
    <ModalShell
      title="🏹 Training Ground"
      onClose={onClose}
      footer={
        <div className="gw-modal-footer">
          <button className="gw-modal-btn" onClick={onClose}>Close</button>
          <Link to="/practice" className="gw-modal-btn gw-modal-btn-primary" onClick={onClose}>Train →</Link>
          <Link to="/practice/arena" className="gw-modal-btn gw-modal-btn-boss" onClick={onClose}>Arena →</Link>
        </div>
      }
    >
      <p style={{ fontSize: 12, color: '#2C1810', marginBottom: 8 }}>
        Sharpen your skills: code rooms, arena, daily challenge, speed runs.
      </p>
      <ul style={{ fontSize: 11, color: '#6B5A47', paddingLeft: 18, lineHeight: 1.6 }}>
        <li>Practice rooms</li>
        <li>Ranked arena matches</li>
        <li>Daily challenge & speed runs</li>
      </ul>
    </ModalShell>
  )
}

/* ─── Rest / campfire ─── */
export function RestModal({ onClose, onRest, energy }: Base & { onRest: () => void; energy: number }) {
  return (
    <ModalShell
      title="🔥 Campfire"
      onClose={onClose}
      footer={
        <div className="gw-modal-footer">
          <button className="gw-modal-btn" onClick={onClose}>Close</button>
          <button className="gw-modal-btn gw-modal-btn-primary" onClick={() => { onRest(); onClose() }}>
            Rest +5🔥
          </button>
        </div>
      }
    >
      <p style={{ fontSize: 12, color: '#2C1810' }}>
        Warm your hands by the fire. You feel rested.
      </p>
      <p style={{ fontSize: 11, color: '#6B5A47', marginTop: 6 }}>Energy: {Math.round(energy)}/100</p>
    </ModalShell>
  )
}
