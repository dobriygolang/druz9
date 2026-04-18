import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Hero, Torch, SlimePet, RavenPet, SpiritOrb, Fireflies, PixelCoin } from '@/shared/ui/sprites'
import { RpgButton } from '@/shared/ui/pixel'
import { NotificationBell } from '@/widgets/Overlays'
import { useGameUser, useTweaks, useLiveStats } from '@/shared/lib/gameState'
import { useActiveSeason } from '@/features/Hub/api/useActiveSeason'
import { useAuth } from '@/app/providers/AuthProvider'

const SKY: Record<string, string> = {
  cozy: 'linear-gradient(180deg, #c8a870 0%, #a8844a 55%, #7a5530 100%)',
  scholar: 'linear-gradient(180deg, #6b8a6a 0%, #3d6149 55%, #2d4a35 100%)',
  warrior: 'linear-gradient(180deg, #9a6a3a 0%, #6a4020 55%, #3b2a1a 100%)',
}

export function HeroStrip({
  onOpenTweaks,
  onToggleSidebar,
  onOpenNotifs,
}: {
  onOpenTweaks?: () => void
  onToggleSidebar?: () => void
  onOpenNotifs?: () => void
}) {
  // Stats (xp, gold, streak) live in `useGameUser` as optimistic client
  // state until profile-progress wiring lands; the displayed *identity*
  // (name / avatar) comes from useAuth and always matches the logged-in
  // account.
  const user = useGameUser()
  const live = useLiveStats()
  const season = useActiveSeason()
  const { user: authUser } = useAuth()
  const displayName =
    [authUser?.firstName, authUser?.lastName].filter(Boolean).join(' ').trim() ||
    authUser?.username ||
    authUser?.telegramUsername ||
    user.name
  const [tweaks] = useTweaks()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const currentLang = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'ru'
  const toggleLang = () => {
    void i18n.changeLanguage(currentLang === 'en' ? 'ru' : 'en')
  }

  return (
    <div
      className="rpg-hero-strip"
      style={{ background: SKY[tweaks.roomLayout] ?? SKY.cozy }}
    >
      <svg
        viewBox="0 0 800 140"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.35 }}
      >
        <polygon
          points="0,140 0,90 80,50 160,80 240,40 320,70 420,30 520,65 620,35 720,70 800,50 800,140"
          fill="#3b2a1a"
        />
        <polygon
          points="0,140 0,110 100,85 200,100 320,80 420,95 520,75 640,95 760,80 800,90 800,140"
          fill="#1a140e"
          opacity="0.6"
        />
      </svg>

      <Fireflies count={10} />

      {/* Hamburger — visible only on mobile via CSS */}
      <button
        className="rpg-hamburger"
        onClick={onToggleSidebar}
        aria-label={t('heroStrip.toggleMenu')}
        style={{
          display: 'none',
          position: 'absolute',
          top: '50%',
          left: 12,
          transform: 'translateY(-50%)',
          width: 36,
          height: 36,
          background: 'rgba(59,42,26,0.6)',
          border: '2px solid var(--parch-2)',
          color: 'var(--parch-0)',
          fontSize: 18,
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        ☰
      </button>

      <div
        style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          alignItems: 'stretch',
          padding: '0 32px',
        }}
      >
        {/* Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingRight: 28,
            borderRight: '3px dashed rgba(246,234,208,0.35)',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/hub')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                background: 'var(--ember-1)',
                border: '3px solid var(--ink-0)',
                boxShadow:
                  'inset -3px -3px 0 var(--ember-0), inset 3px 3px 0 var(--ember-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Pixelify Sans, monospace',
                fontSize: 22,
                color: 'var(--parch-0)',
              }}
            >
              D9
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'Pixelify Sans, monospace',
                  fontSize: 22,
                  color: 'var(--parch-0)',
                  lineHeight: 1,
                }}
              >
                druz9
              </div>
              <div
                className="font-silkscreen uppercase"
                style={{ color: 'var(--parch-2)', fontSize: 9, letterSpacing: '0.08em' }}
              >
                {season
                  ? t('heroStrip.seasonTagLive', {
                      roman: season.roman,
                      title: season.title,
                      defaultValue: `season ${season.roman} · ${season.title}`,
                    })
                  : t('heroStrip.seasonTagIdle', { defaultValue: 'off-season' })}
              </div>
            </div>
          </div>
        </div>

        {/* Hero scene + stats */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            position: 'relative',
          }}
        >
          <div
            className="rpg-hero-pet"
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 18,
              height: '100%',
              paddingBottom: 6,
            }}
          >
            <Torch scale={3} />
            <Hero scale={4} pose={tweaks.heroPose} />
            {tweaks.pet === 'slime' && <SlimePet scale={3} />}
            {tweaks.pet === 'raven' && <RavenPet scale={3} />}
            {tweaks.pet === 'orb' && <SpiritOrb scale={3} />}
            <Torch scale={3} />
          </div>

          <div
            className="rpg-hero-stats"
            style={{
              flex: 1,
              paddingLeft: 28,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              justifyContent: 'center',
              minWidth: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <div
                style={{
                  fontFamily: 'Pixelify Sans, monospace',
                  fontSize: 26,
                  color: 'var(--parch-0)',
                  lineHeight: 1,
                }}
              >
                {displayName}
              </div>
              <span
                className="font-silkscreen uppercase"
                style={{ color: 'var(--ember-3)', fontSize: 11, letterSpacing: '0.08em' }}
              >
                {t('heroStrip.lvl')} {live.level}
              </span>
              <span
                className="font-silkscreen uppercase"
                style={{ color: 'var(--parch-2)', fontSize: 11, letterSpacing: '0.08em' }}
              >
                · {user.title}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span className="rpg-stat-chip">{t('heroStrip.streak', { days: live.streak })}</span>
              <span className="rpg-stat-chip">
                ★ {live.achievementsEarned}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <span
                className="font-silkscreen uppercase"
                style={{ color: 'var(--parch-2)', fontSize: 11, letterSpacing: '0.08em' }}
              >
                {t('heroStrip.xp')}
              </span>
              <div className="rpg-bar" style={{ flex: 1, maxWidth: 280 }}>
                <div className="rpg-bar__fill" style={{ width: `${live.xpPct}%` }} />
              </div>
              <span
                className="font-silkscreen uppercase"
                style={{ color: 'var(--parch-0)', fontSize: 11, letterSpacing: '0.08em' }}
              >
                {live.xp} XP
              </span>
            </div>
          </div>
        </div>

        {/* Currencies */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderLeft: '3px dashed rgba(246,234,208,0.35)',
            paddingLeft: 22,
          }}
        >
          <div
            className="rpg-panel rpg-panel--dark"
            style={{ padding: '8px 12px', boxShadow: 'inset 0 0 0 3px #1a140e' }}
          >
            <div
              className="font-silkscreen uppercase"
              style={{ color: 'var(--parch-2)', fontSize: 9, letterSpacing: '0.08em' }}
            >
              {t('heroStrip.gold')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <PixelCoin scale={2} />
              <span
                style={{
                  fontFamily: 'Pixelify Sans, monospace',
                  color: 'var(--ember-3)',
                  fontSize: 18,
                }}
              >
                {live.gold.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="rpg-panel rpg-panel--dark" style={{ padding: '8px 12px' }}>
            <div
              className="font-silkscreen uppercase"
              style={{ color: 'var(--parch-2)', fontSize: 9, letterSpacing: '0.08em' }}
            >
              {t('heroStrip.gems')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  background: '#8fb8d4',
                  border: '2px solid var(--ink-0)',
                  transform: 'rotate(45deg)',
                }}
              />
              <span
                style={{
                  fontFamily: 'Pixelify Sans, monospace',
                  color: '#d4e2ec',
                  fontSize: 18,
                }}
              >
                {live.gems}
              </span>
            </div>
          </div>
          {/* Language toggle */}
          <RpgButton
            size="sm"
            onClick={toggleLang}
            aria-label={t('common.switchLanguage')}
            title={t('common.switchLanguage')}
            style={{ padding: '10px 10px', minWidth: 44, fontFamily: 'Silkscreen, monospace', fontSize: 11, letterSpacing: '0.08em' }}
          >
            {currentLang === 'en' ? 'EN' : 'RU'}
          </RpgButton>
          <RpgButton
            size="sm"
            onClick={onOpenTweaks}
            aria-label={t('heroStrip.tweaks')}
            title={t('heroStrip.tweaks')}
            style={{ padding: '10px 12px' }}
          >
            ⚙
          </RpgButton>
          {/* Notifications bell — was a floating overlay before, now
              lives inline so it doesn't fight HeroStrip's own action row. */}
          <NotificationBell onOpen={onOpenNotifs} />
        </div>
      </div>
    </div>
  )
}
