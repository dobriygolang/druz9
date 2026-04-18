import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Panel, RpgButton, Bar, Badge, PageHeader } from '@/shared/ui/pixel'
import {
  Statue,
  Torch,
  Banner,
  Trophy,
  Hero,
  Fireflies,
  RoomScene,
  RavenPet,
} from '@/shared/ui/sprites'
import { guildApi, type GuildMember } from '@/features/Guild/api/guildApi'
import type { Guild } from '@/entities/Guild/model/types'

type HallTheme = 'moss' | 'ember' | 'stone'

// Loaded via guildApi.listMembers(guildId). Members arrive with {userId,
// firstName, lastName, avatarUrl, role, joinedAt} — displayName is derived
// client-side from first+last.
type MemberRow = [string, string, number, boolean, string]
function memberToRow(m: GuildMember): MemberRow {
  const name = m.firstName
    ? `${m.firstName}${m.lastName ? ' ' + m.lastName : ''}`.trim()
    : m.userId.slice(0, 8)
  // Level + online/activity status aren't yet on the member payload — fill
  // defaults; profile progress wiring is a follow-up.
  return [name, m.role ?? 'member', 1, false, 'member']
}

const GUILD_ACHIEVEMENTS = [
  { t: 'Siegebreaker', d: 'won a seasonal guild war', r: 'legendary' as const },
  { t: 'United Front', d: '10 duels won in same hour', r: 'epic' as const },
  { t: 'Tavernkeepers', d: 'hosted 5 book clubs', r: 'rare' as const },
  { t: 'Trailblazers', d: 'topped weekly leaderboard', r: 'epic' as const },
]

const HALL_ITEMS = [
  { t: 'Mossfall theme', r: 'epic' as const, owned: true },
  { t: 'Ember braziers', r: 'rare' as const, owned: true },
  { t: 'Raven banner', r: 'epic' as const, owned: false, p: 1200 },
  { t: 'Victory pillar', r: 'legendary' as const, owned: false, p: 3600 },
]

const CAMPAIGN_REWARDS = [
  { t: 'Seasonal relic', r: 'legendary' as const, icon: <Trophy scale={2} tier="gold" /> },
  { t: 'Hall banner skin', r: 'epic' as const, icon: <Banner scale={2} color="#7a3d12" /> },
  { t: 'Raven totem', r: 'rare' as const, icon: <RavenPet scale={2} /> },
  {
    t: '500 ember shards',
    r: 'uncommon' as const,
    icon: (
      <div style={{ width: 18, height: 18, background: 'var(--ember-2)', border: '2px solid var(--ink-0)' }} />
    ),
  },
]

const HALL_COLORS: Record<HallTheme, { wall: string; floor: string }> = {
  moss: { wall: '#3d6149', floor: '#2d4a35' },
  ember: { wall: '#7a3d12', floor: '#5a2808' },
  stone: { wall: '#5a5a5a', floor: '#3a3a3a' },
}

export function GuildPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [hallTheme] = useState<HallTheme>('moss')
  const { wall: wallColor, floor: floorColor } = HALL_COLORS[hallTheme]

  // Only load the user's own guild. If they aren't in one, render the
  // onboarding screen (join existing / create new) instead of showing
  // someone else's hall. That was the staging complaint — hardcoded
  // Mossveil always appeared.
  const [guild, setGuild] = useState<Guild | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [hallEditOpen, setHallEditOpen] = useState(false)

  const reloadMine = () => {
    setLoaded(false)
    guildApi
      .listGuilds({ limit: 50 })
      .then((r) => {
        const mine = r.guilds.find((g) => g.isJoined) ?? null
        setGuild(mine)
        return mine ? guildApi.listMembers(mine.id) : null
      })
      .then((list) => {
        if (list) setMembers(list.map(memberToRow))
        else setMembers([])
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }

  useEffect(() => {
    let cancelled = false
    guildApi
      .listGuilds({ limit: 50 })
      .then((r) => {
        if (cancelled) return
        const mine = r.guilds.find((g) => g.isJoined) ?? null
        setGuild(mine)
        return mine ? guildApi.listMembers(mine.id) : null
      })
      .then((list) => {
        if (cancelled) return
        if (list) setMembers(list.map(memberToRow))
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

  // No joined guild yet → onboarding screen.
  if (loaded && !guild) {
    return <GuildOnboarding onJoined={reloadMine} />
  }

  if (!loaded || !guild) {
    return (
      <Panel>
        <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink-2)' }}>
          {t('guild.page.loading', { defaultValue: 'Loading your guild…' })}
        </div>
      </Panel>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow={t('guild.page.eyebrow')}
        title={t('guild.page.title')}
        subtitle={t('guild.page.subtitle')}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <RpgButton size="sm" onClick={() => setInviteOpen(true)}>{t('guild.page.invite')}</RpgButton>
            <RpgButton size="sm" variant="primary" onClick={() => setHallEditOpen(true)}>
              {t('guild.page.customizeHall')}
            </RpgButton>
          </div>
        }
      />

      {/* Hall scene */}
      <Panel nailed style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
        <div
          style={{
            height: 360,
            position: 'relative',
            background: `linear-gradient(180deg, ${wallColor} 0%, ${wallColor} 58%, ${floorColor} 58%, ${floorColor} 100%)`,
            borderBottom: '4px solid var(--ink-0)',
            overflow: 'hidden',
          }}
        >
          {/* wall pattern */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: '58%',
              backgroundImage:
                'repeating-linear-gradient(90deg, transparent 0 58px, rgba(0,0,0,0.18) 58px 60px)',
            }}
          />
          {/* floor tiles */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '58%',
              bottom: 0,
              backgroundImage:
                'repeating-linear-gradient(90deg, transparent 0 72px, rgba(0,0,0,0.3) 72px 74px), repeating-linear-gradient(0deg, transparent 0 40px, rgba(0,0,0,0.2) 40px 42px)',
            }}
          />

          {/* left column */}
          <div
            style={{
              position: 'absolute',
              left: 30,
              bottom: 14,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 14,
            }}
          >
            <Statue scale={4} color="#c7ab6e" />
            <Torch scale={4} />
          </div>

          {/* central banner */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 20,
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Banner scale={4} color={hallTheme === 'moss' ? '#2d4a35' : wallColor} crest="✦" />
            <div
              className="font-silkscreen uppercase"
              style={{
                marginTop: 6,
                fontSize: 10,
                color: 'var(--parch-0)',
                letterSpacing: '0.1em',
              }}
            >
              {t('guild.page.bannerLabel')}
            </div>
          </div>

          {/* war table */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 16,
              transform: 'translateX(-50%)',
            }}
          >
            <div
              style={{
                width: 180,
                height: 60,
                background: '#5a3f27',
                border: '4px solid var(--ink-0)',
                boxShadow: 'inset 4px 4px 0 #7a593a, inset -4px -4px 0 #3b2a1a',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 8,
                  background: '#dcc690',
                  border: '2px solid var(--ink-0)',
                }}
              >
                <svg viewBox="0 0 100 40" style={{ width: '100%', height: '100%' }}>
                  <path
                    d="M 10 30 Q 30 10 50 20 T 90 15"
                    fill="none"
                    stroke="#7a3d12"
                    strokeWidth="2"
                    strokeDasharray="3 2"
                  />
                  <circle cx="10" cy="30" r="3" fill="#3d6149" stroke="#3b2a1a" strokeWidth="1" />
                  <circle cx="50" cy="20" r="3" fill="#b8692a" stroke="#3b2a1a" strokeWidth="1" />
                  <circle cx="90" cy="15" r="4" fill="#a23a2a" stroke="#3b2a1a" strokeWidth="1" />
                </svg>
              </div>
              <div
                className="font-silkscreen uppercase"
                style={{
                  position: 'absolute',
                  top: -18,
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  fontSize: 9,
                  color: 'var(--parch-0)',
                  letterSpacing: '0.08em',
                }}
              >
                {t('guild.page.warTable')}
              </div>
            </div>
          </div>

          {/* right column — trophies */}
          <div
            style={{
              position: 'absolute',
              right: 30,
              bottom: 14,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 14,
            }}
          >
            <Torch scale={4} />
            <Trophy scale={4} tier="gold" />
            <Trophy scale={4} tier="silver" />
            <Statue scale={4} color="#c7ab6e" />
          </div>

          {/* sitting members */}
          <div style={{ position: 'absolute', left: '32%', bottom: 10 }}>
            <Hero scale={3} />
          </div>
          <div style={{ position: 'absolute', right: '32%', bottom: 10 }}>
            <Hero scale={3} pose="wave" />
          </div>

          <Fireflies count={12} />

          <div style={{ position: 'absolute', left: 16, bottom: 12 }}>
            <Badge variant="dark">{t('guild.page.hallTheme', { theme: hallTheme })}</Badge>
          </div>
        </div>
      </Panel>

      <div className="rpg-grid-2col rpg-guild-grid" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18 }}>
        {/* Left: campaign + members */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Panel>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 10,
              }}
            >
              <h3 className="font-display" style={{ fontSize: 17 }}>
                {t('guild.page.campaignTitle')}
              </h3>
              <span
                className="font-silkscreen uppercase"
                style={{ fontSize: 11, letterSpacing: '0.08em' }}
              >
                {t('guild.page.campaignTimeLeft')}
              </span>
            </div>
            <div
              className="font-silkscreen uppercase"
              style={{
                fontSize: 10,
                color: 'var(--ink-2)',
                letterSpacing: '0.08em',
                marginBottom: 12,
              }}
            >
              {t('guild.page.rivalGuildMeta')}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 40px 1fr',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontFamily: 'Pixelify Sans, monospace',
                    fontSize: 18,
                    color: 'var(--moss-1)',
                  }}
                >
                  {t('guild.page.guildName')}
                </div>
                <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 36 }}>2150</div>
                <div
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                >
                  {t('guild.page.you')}
                </div>
              </div>
              <div
                style={{
                  fontFamily: 'Pixelify Sans, monospace',
                  fontSize: 24,
                  textAlign: 'center',
                }}
              >
                ⚔
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'Pixelify Sans, monospace',
                    fontSize: 18,
                    color: 'var(--rpg-danger, #a23a2a)',
                  }}
                >
                  {t('guild.page.redRavens')}
                </div>
                <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 36 }}>1920</div>
                <div
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                >
                  {t('guild.page.rival')}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <Bar value={53} variant="moss" />
            </div>
            <div className="rpg-divider" />
            <div
              className="font-silkscreen uppercase"
              style={{
                fontSize: 10,
                color: 'var(--ink-2)',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}
            >
              {t('guild.page.rewardChest')}
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              {CAMPAIGN_REWARDS.map((r, index) => (
                <div
                  key={r.t}
                  className={`rpg-item-card rpg-rarity-border--${r.r}`}
                  style={{ flex: 1 }}
                >
                  <div className="rpg-item-card__art">{r.icon}</div>
                  <div
                    style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 11, marginTop: 4 }}
                  >
                    {t(`guild.page.reward.${index}`)}
                  </div>
                  <div className={`rpg-rarity rpg-rarity--${r.r}`}>{t(`profile.rare.${r.r}`)}</div>
                </div>
              ))}
            </div>
            <RpgButton variant="primary" style={{ width: '100%' }} onClick={() => navigate('/war')}>
              {t('guild.page.enterWarRoom')}
            </RpgButton>
          </Panel>

          <Panel>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 12,
              }}
            >
              <h3 className="font-display" style={{ fontSize: 17 }}>
                {t('guild.page.membersTitle')}
              </h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <Badge>{t('guild.page.onlineCount')}</Badge>
                <Badge variant="moss">{t('guild.page.inArenaCount')}</Badge>
              </div>
            </div>
            <div
              className="rpg-guild-members"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8,
              }}
            >
              {members.map(([n, role, lvl, on, s]) => (
                <div
                  key={n}
                  style={{
                    padding: 8,
                    background: 'var(--parch-0)',
                    border: '2px solid var(--ink-0)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        background: 'var(--parch-2)',
                        border: '2px solid var(--ink-0)',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          inset: 2,
                          background: 'var(--moss-1)',
                        }}
                      />
                      {on && (
                        <div
                          style={{
                            position: 'absolute',
                            right: -3,
                            bottom: -3,
                            width: 8,
                            height: 8,
                            background: 'var(--success, #5a7f4c)',
                            border: '2px solid var(--ink-0)',
                          }}
                        />
                      )}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 12 }}>
                        {n}
                      </div>
                      <div
                        className="font-silkscreen uppercase"
                        style={{ fontSize: 8, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                      >
                        {role} · {t('guild.page.level', { level: lvl })}
                      </div>
                    </div>
                  </div>
                  <div
                    className="font-silkscreen uppercase"
                    style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                  >
                    {s}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Right: achievements + customization */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Panel>
            <h3 className="font-display" style={{ fontSize: 17 }}>
              {t('guild.page.achievements')}
            </h3>
            <div
              className="font-silkscreen uppercase"
              style={{
                fontSize: 10,
                color: 'var(--ink-2)',
                letterSpacing: '0.08em',
                marginBottom: 12,
              }}
            >
              {t('guild.page.achievementsProgress')}
            </div>
            {GUILD_ACHIEVEMENTS.map((a, index) => (
              <div
                key={a.t}
                className={`rpg-rarity-border--${a.r}`}
                style={{
                  padding: '10px 12px',
                  marginBottom: 6,
                  border: '3px solid var(--ink-0)',
                  background: 'var(--parch-0)',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <Trophy scale={2} tier={a.r === 'legendary' ? 'gold' : 'silver'} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 13 }}>{t(`guild.page.achievement.${index}.title`)}</div>
                  <div
                    className="font-silkscreen uppercase"
                    style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                  >
                    {t(`guild.page.achievement.${index}.desc`)}
                  </div>
                </div>
                <span className={`rpg-rarity rpg-rarity--${a.r}`}>{t(`profile.rare.${a.r}`)}</span>
              </div>
            ))}
          </Panel>

          <Panel variant="wood">
            <h3 className="font-display" style={{ fontSize: 17, color: 'var(--parch-0)' }}>
              {t('guild.page.hallCustomization')}
            </h3>
            <div
              className="font-silkscreen uppercase"
              style={{
                color: 'var(--parch-2)',
                marginBottom: 10,
                fontSize: 10,
                letterSpacing: '0.08em',
              }}
            >
              {t('guild.page.applyWithGuildGold')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {HALL_ITEMS.map((it, i) => (
                <div
                  key={it.t}
                  className={`rpg-item-card rpg-rarity-border--${it.r}`}
                  style={{ background: 'var(--parch-0)' }}
                >
                  <div className="rpg-item-card__art" style={{ overflow: 'hidden' }}>
                    {i === 0 && (
                      <RoomScene variant="scholar" height={70}>
                        <div style={{ position: 'absolute', left: 10, bottom: 2 }}>
                          <Torch scale={2} />
                        </div>
                      </RoomScene>
                    )}
                    {i === 1 && <Torch scale={3} />}
                    {i === 2 && <Banner scale={2} color="#a23a2a" />}
                    {i === 3 && <Trophy scale={3} tier="gold" />}
                  </div>
                  <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 11, marginTop: 4 }}>
                    {t(`guild.page.hallItem.${i}`)}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span className={`rpg-rarity rpg-rarity--${it.r}`}>{t(`profile.rare.${it.r}`)}</span>
                    {it.owned ? (
                      <span
                        className="font-silkscreen uppercase"
                        style={{ color: 'var(--moss-1)', fontSize: 10, letterSpacing: '0.08em' }}
                      >
                        {t('guild.page.equipped')}
                      </span>
                    ) : (
                      <span className="rpg-coin">
                        <span className="rpg-coin-icon" />
                        {it.p}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {inviteOpen && (
        <InviteModal
          guild={guild}
          onClose={() => setInviteOpen(false)}
        />
      )}

      {hallEditOpen && (
        <HallEditModal onClose={() => setHallEditOpen(false)} />
      )}
    </>
  )
}

function InviteModal({ guild, onClose }: { guild: Guild | null; onClose: () => void }) {
  const inviteLink = guild
    ? `${window.location.origin}/guild?invite=${guild.id}`
    : `${window.location.origin}/guild`
  const [copied, setCopied] = useState(false)
  const copy = () => {
    try {
      navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* best effort */
    }
  }
  return (
    <div className="rpg-modal-backdrop" onClick={onClose}>
      <div
        className="rpg-panel rpg-panel--nailed"
        style={{ padding: 24, maxWidth: 440, width: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display" style={{ fontSize: 20, marginBottom: 8 }}>
          Invite to {guild?.name || 'guild'}
        </h3>
        <div style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 12 }}>
          Share this link with a friend. They'll land on the guild page and see a join button.
        </div>
        <div
          style={{
            padding: '10px 12px',
            border: '2px solid var(--ink-0)',
            background: 'var(--parch-2)',
            fontFamily: 'Pixelify Sans, monospace',
            fontSize: 12,
            wordBreak: 'break-all',
            marginBottom: 12,
          }}
        >
          {inviteLink}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <RpgButton variant="primary" onClick={copy}>
            {copied ? 'Copied!' : 'Copy link'}
          </RpgButton>
          <RpgButton onClick={onClose}>Close</RpgButton>
        </div>
      </div>
    </div>
  )
}

function HallEditModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="rpg-modal-backdrop" onClick={onClose}>
      <div
        className="rpg-panel rpg-panel--nailed"
        style={{ padding: 24, maxWidth: 440, width: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display" style={{ fontSize: 20, marginBottom: 8 }}>
          Hall customisation
        </h3>
        <div style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 12 }}>
          Hall themes, banners and torches unlock through guild XP and seasonal
          cosmetics from the shop. The editor ships together with the cosmetics
          inventory — track its progress in the tavern's guild section.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <RpgButton variant="primary" onClick={onClose}>Got it</RpgButton>
        </div>
      </div>
    </div>
  )
}

// Shown when the signed-in user is not a member of any guild. Has two
// paths: join an existing public guild (search + join) or create your
// own. Replaces the old behaviour of rendering some other guild's hall
// as if it were the user's.
function GuildOnboarding({ onJoined }: { onJoined: () => void }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'browse' | 'create'>('browse')
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Create-guild form state.
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    let cancelled = false
    guildApi.listGuilds({ limit: 100 })
      .then((r) => { if (!cancelled) setGuilds(r.guilds.filter((g) => g.isPublic)) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = guilds.filter((g) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return g.name.toLowerCase().includes(q) || (g.description ?? '').toLowerCase().includes(q)
  })

  const join = async (g: Guild) => {
    setBusyId(g.id)
    try {
      await guildApi.joinGuild(g.id)
      onJoined()
    } catch (e) {
      setBusyId(null)
    }
  }

  const createGuild = async () => {
    const trimmed = name.trim()
    if (trimmed.length < 3) {
      setCreateError('Name must be at least 3 characters')
      return
    }
    setCreateError('')
    setCreating(true)
    try {
      await guildApi.createGuild({
        name: trimmed,
        description: description.trim(),
        isPublic: true,
      })
      onJoined()
    } catch (e) {
      setCreateError('Could not create guild — maybe the name is taken.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Guild · onboarding"
        title="Find your guild"
        subtitle="Guilds unlock campaigns, wars and shared buffs. Join an existing one or start your own — you can always switch later."
        right={
          <RpgButton size="sm" onClick={() => navigate('/hub')}>
            Back to hub
          </RpgButton>
        }
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <RpgButton
          size="sm"
          variant={mode === 'browse' ? 'primary' : 'default'}
          onClick={() => setMode('browse')}
        >
          Browse guilds
        </RpgButton>
        <RpgButton
          size="sm"
          variant={mode === 'create' ? 'primary' : 'default'}
          onClick={() => setMode('create')}
        >
          Create your own
        </RpgButton>
      </div>

      {mode === 'browse' && (
        <Panel>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search by name or description…"
              style={{
                flex: 1,
                padding: '8px 10px',
                border: '3px solid var(--ink-0)',
                background: 'var(--parch-2)',
                fontFamily: 'IBM Plex Sans, system-ui',
                color: 'var(--ink-0)',
                outline: 'none',
              }}
            />
            <span
              className="font-silkscreen uppercase"
              style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em' }}
            >
              {loading ? 'loading…' : `${filtered.length} of ${guilds.length} guilds`}
            </span>
          </div>
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-2)', fontSize: 13 }}>
              No guilds match that query. Try a different word — or start your own.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {filtered.map((g) => (
              <div
                key={g.id}
                style={{
                  padding: 12,
                  border: '3px solid var(--ink-0)',
                  background: 'var(--parch-0)',
                  boxShadow: '3px 3px 0 var(--ink-0)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 16 }}>{g.name}</div>
                  <span
                    className="font-silkscreen uppercase"
                    style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}
                  >
                    {g.memberCount} members
                  </span>
                </div>
                {g.description && (
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', minHeight: 28 }}>{g.description}</div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <RpgButton
                    size="sm"
                    variant="primary"
                    disabled={busyId === g.id}
                    onClick={() => join(g)}
                  >
                    {busyId === g.id ? 'Joining…' : 'Join'}
                  </RpgButton>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {mode === 'create' && (
        <Panel>
          <div style={{ maxWidth: 520, margin: '0 auto', padding: 8 }}>
            <h3 className="font-display" style={{ fontSize: 20, marginBottom: 6 }}>
              Start your own guild
            </h3>
            <div style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 16 }}>
              You'll be the creator — members join with a shareable link.
              Pick a name that's easy to remember.
            </div>
            <div style={{ marginBottom: 12 }}>
              <div
                className="font-silkscreen uppercase"
                style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 4 }}
              >
                guild name
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="The Ember Pact"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '3px solid var(--ink-0)',
                  background: 'var(--parch-2)',
                  fontFamily: 'Pixelify Sans, monospace',
                  fontSize: 18,
                  color: 'var(--ink-0)',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div
                className="font-silkscreen uppercase"
                style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.1em', marginBottom: 4 }}
              >
                description (optional)
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={240}
                rows={3}
                placeholder="what the guild is about, tags, playstyle…"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '3px solid var(--ink-0)',
                  background: 'var(--parch-2)',
                  fontFamily: 'IBM Plex Sans, system-ui',
                  fontSize: 13,
                  color: 'var(--ink-0)',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>
            {createError && (
              <div style={{ color: 'var(--rpg-danger, #a23a2a)', fontSize: 12, marginBottom: 12 }}>
                {createError}
              </div>
            )}
            <RpgButton
              variant="primary"
              disabled={creating || name.trim().length < 3}
              onClick={createGuild}
            >
              {creating ? 'Forging…' : 'Create guild'}
            </RpgButton>
          </div>
        </Panel>
      )}
    </>
  )
}
