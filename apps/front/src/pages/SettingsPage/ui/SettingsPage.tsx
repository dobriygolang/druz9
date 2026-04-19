import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { i18n, SUPPORTED_LANGUAGES } from '@/shared/i18n'
import { Panel, PageHeader } from '@/shared/ui/pixel'
import { Hero } from '@/shared/ui/sprites'
import { notificationApi, type NotificationSettings } from '@/features/Notification/api/notificationApi'
import { preferencesApi } from '@/features/UserPreferences/api/preferencesApi'
import { premiumApi, type PremiumStatus } from '@/features/Premium/api/premiumApi'
import { RpgButton } from '@/shared/ui/pixel'
import { addToast } from '@/shared/lib/toasts'
import { useTweaks, type Density } from '@/shared/lib/gameState'
import { useAuth } from '@/app/providers/AuthProvider'
import { Tour } from '@/features/Tour/ui/Tour'

// Gameplay / Privacy / Keybindings / Accessibility tabs were removed —
// the toggles didn't persist anywhere (no backend, no local storage).
// Leaving them in would keep suggesting to users that preferences are
// being saved when they aren't. They'll come back when each has a
// real UserPreferences RPC backing it.
type Section = 'account' | 'tweaks' | 'notifs' | 'language' | 'premium'

const ICONS: Record<Section, string> = {
  account:  '◎',
  tweaks:   '✦',
  notifs:   '✉',
  language: '◈',
  premium:  '★',
}

export function SettingsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Section>('account')

  const TABS: Array<[Section, string]> = [
    ['account',  t('settings.tab.account')],
    ['tweaks',   t('settings.tab.tweaks', { defaultValue: 'Flavour & tweaks' })],
    ['notifs',   t('settings.tab.notifications')],
    ['language', t('settings.tab.language')],
    ['premium',  'Premium'],
  ]

  return (
    <>
      <Tour
        tourId="settings_intro"
        steps={[
          { selector: '[data-tour=settings-tabs]', title: t('settings.tour.tabsTitle', { defaultValue: 'Разделы' }), body: t('settings.tour.tabsBody', { defaultValue: 'Настройки разделены на аккаунт, оформление, уведомления и язык.' }) },
          { selector: '[data-tour=settings-content]', title: t('settings.tour.contentTitle', { defaultValue: 'Сохранение' }), body: t('settings.tour.contentBody', { defaultValue: 'Изменения в подключённых разделах сразу отправляются в backend.' }) },
        ]}
      />
      <PageHeader
        eyebrow={t('settings.eyebrow')}
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
      />
      <Panel style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '220px 1fr',
            minHeight: 480,
          }}
        >
          <div data-tour="settings-tabs" style={{ borderRight: '3px dashed var(--ink-3)', padding: '14px 0' }}>
            {TABS.map(([id, label]) => (
              <div
                key={id}
                onClick={() => setTab(id)}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  background: tab === id ? 'var(--parch-2)' : 'transparent',
                  borderLeft: tab === id ? '4px solid var(--ember-1)' : '4px solid transparent',
                  fontFamily: 'Pixelify Sans, Unbounded, monospace',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: 'Silkscreen, Unbounded, monospace',
                    fontSize: 16,
                    color: 'var(--ember-1)',
                  }}
                >
                  {ICONS[id]}
                </span>
                {label}
              </div>
            ))}
          </div>
          <div data-tour="settings-content" style={{ padding: 24 }}>
            {tab === 'account'  && <SettingsAccount />}
            {tab === 'tweaks'   && <SettingsTweaks />}
            {tab === 'notifs'   && <SettingsNotifs />}
            {tab === 'language' && <SettingsLanguage />}
            {tab === 'premium'  && <SettingsPremium />}
          </div>
        </div>
      </Panel>
    </>
  )
}

function Setting({
  label,
  help,
  children,
}: {
  label: string
  help?: string
  children: ReactNode
}) {
  return (
    <div
      style={{
        padding: '14px 0',
        borderBottom: '1px dashed var(--ink-3)',
        display: 'grid',
        gridTemplateColumns: '1fr 220px',
        gap: 20,
        alignItems: 'start',
      }}
    >
      <div>
        <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 14 }}>{label}</div>
        {help && (
          <div style={{ color: 'var(--ink-2)', fontSize: 11, marginTop: 2 }}>{help}</div>
        )}
      </div>
      <div>{children}</div>
    </div>
  )
}

function Toggle({ on: initial = false, onClick }: { on?: boolean; onClick?: () => void }) {
  const [v, setV] = useState(initial)
  // Parent-controlled toggles pass both `on` (current) and `onClick`; internal
  // toggles just use local state and no callback.
  const controlled = onClick != null
  const current = controlled ? initial : v
  return (
    <div
      onClick={() => {
        if (controlled) onClick?.()
        else setV(!v)
      }}
      style={{
        width: 56,
        height: 28,
        border: '3px solid var(--ink-0)',
        background: current ? 'var(--moss-1)' : 'var(--parch-3)',
        position: 'relative',
        cursor: 'pointer',
        boxShadow: '2px 2px 0 var(--ink-0)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: current ? 28 : 2,
          width: 18,
          height: 18,
          background: 'var(--parch-0)',
          border: '2px solid var(--ink-0)',
          transition: 'left 0.1s',
        }}
      />
    </div>
  )
}

function ChipGroup({
  options,
  active,
  onChange,
}: {
  options: string[]
  active: string
  onChange?: (value: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {options.map((s) => (
        <span
          key={s}
          className={`rpg-tweak-chip ${s === active ? 'rpg-tweak-chip--on' : ''}`}
          onClick={() => onChange?.(s)}
          style={onChange ? { cursor: 'pointer' } : undefined}
        >
          {s}
        </span>
      ))}
    </div>
  )
}

function SettingsAccount() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.username || user?.telegramUsername || 'Hero'
  const joinedAt = user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'
  return (
    <>
      <h3 className="font-display" style={{ fontSize: 17, marginBottom: 16 }}>
        {t('settings.account.title')}
      </h3>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
        <div
          style={{
            width: 80,
            height: 80,
            background: 'var(--ember-1)',
            border: '3px solid var(--ink-0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Hero scale={3} pose="wave" />
        </div>
        <div>
          <div style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 22 }}>{displayName}</div>
          <div
            className="font-silkscreen uppercase"
            style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
          >
            {t('settings.account.joinedOn', { date: joinedAt, defaultValue: `joined ${joinedAt}` })}
          </div>
          <div
            className="font-silkscreen uppercase"
            style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em', marginTop: 4 }}
          >
            {user?.primaryProvider ? `via ${user.primaryProvider}` : ''}
          </div>
        </div>
      </div>
      <Setting label={t('settings.account.connected')} help={t('settings.account.connectedHelp')}>
        <span className="font-silkscreen uppercase" style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>
          {user?.connectedProviders?.length ? user.connectedProviders.join(' · ') : '—'}
        </span>
      </Setting>
    </>
  )
}

// SettingsDisplay was removed together with the Display tab — every
// control in it was non-persisting. Tweaks tab covers actual visual
// knobs (pixel scale, colour palette are folded into season/density).

function SettingsNotifs() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    notificationApi.getSettings().then(setSettings).catch(() => {})
  }, [])

  const patch = async (key: keyof NotificationSettings, value: boolean) => {
    if (!settings || busy) return
    setBusy(true)
    const prev = settings
    setSettings({ ...settings, [key]: value })
    try {
      await notificationApi.updateSettings({ [key]: value })
    } catch {
      setSettings(prev)
      addToast({ kind: 'QUEST', title: t('settings.notifs.saveFailed', { defaultValue: 'Could not save' }), body: '', icon: '!', color: 'var(--rpg-danger)' })
    } finally {
      setBusy(false)
    }
  }

  if (!settings) {
    return (
      <>
        <h3 className="font-display" style={{ fontSize: 17, marginBottom: 16 }}>
          {t('settings.notifs.title')}
        </h3>
        <div style={{ color: 'var(--ink-2)', fontSize: 12 }}>
          {t('settings.notifs.loading', { defaultValue: 'Loading…' })}
        </div>
      </>
    )
  }

  return (
    <>
      <h3 className="font-display" style={{ fontSize: 17, marginBottom: 16 }}>
        {t('settings.notifs.title')}
      </h3>
      <Setting label={t('settings.notifs.duelInvites')} help={t('settings.notifs.duelInvitesHelp')}>
        <Toggle on={settings.duelsEnabled} onClick={() => patch('duelsEnabled', !settings.duelsEnabled)} />
      </Setting>
      <Setting label={t('settings.notifs.guildWar')} help={t('settings.notifs.guildWarHelp')}>
        <Toggle on={settings.guildsEnabled} onClick={() => patch('guildsEnabled', !settings.guildsEnabled)} />
      </Setting>
      <Setting label={t('settings.notifs.progress', { defaultValue: 'Progress updates' })} help={t('settings.notifs.progressHelp', { defaultValue: 'Level-ups, season tiers, achievements' })}>
        <Toggle on={settings.progressEnabled} onClick={() => patch('progressEnabled', !settings.progressEnabled)} />
      </Setting>
      <Setting label={t('settings.notifs.dailyChallenge', { defaultValue: 'Daily challenge reminder' })} help={t('settings.notifs.dailyChallengeHelp', { defaultValue: 'One nudge a day if you haven\'t played' })}>
        <Toggle on={settings.dailyChallengeEnabled} onClick={() => patch('dailyChallengeEnabled', !settings.dailyChallengeEnabled)} />
      </Setting>
      <Setting label={t('settings.notifs.telegramLinked', { defaultValue: 'Telegram linked' })} help={t('settings.notifs.telegramLinkedHelp', { defaultValue: 'Notifications are sent via the Telegram bot' })}>
        <span className="font-silkscreen uppercase" style={{ fontSize: 10, color: settings.telegramLinked ? 'var(--moss-1)' : 'var(--ink-2)', letterSpacing: '0.08em' }}>
          {settings.telegramLinked ? t('settings.notifs.linked', { defaultValue: 'linked' }) : t('settings.notifs.notLinked', { defaultValue: 'not linked' })}
        </span>
      </Setting>
    </>
  )
}

// SettingsGameplay / SettingsPrivacy / SettingsKeybindings /
// SettingsAccessibility were removed — none of their controls persisted.
// They'll come back when each ships on top of a real UserPreferences RPC.

/* ---- Language ---- */
// Languages come from /shared/i18n SUPPORTED_LANGUAGES — adding a code that
// has no translation file made the UI render empty strings. The picker now
// shows only languages we actually ship.

function SettingsLanguage() {
  const { t, i18n: i18nInst } = useTranslation()
  const [lang, setLang] = useState<string>(i18nInst.resolvedLanguage ?? 'ru')

  const onPick = (code: string) => {
    setLang(code)
    void i18n.changeLanguage(code)
  }
  return (
    <>
      <h3 className="font-display" style={{ fontSize: 17, marginBottom: 4 }}>{t('settings.lang.title')}</h3>
      <div style={{ color: 'var(--ink-2)', fontSize: 12, marginBottom: 20 }}>
        {t('settings.lang.uiHint')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
        {SUPPORTED_LANGUAGES.map((l) => (
          <div
            key={l.code}
            onClick={() => onPick(l.code)}
            style={{
              padding: '12px 14px',
              border: '3px solid',
              borderColor: lang === l.code ? 'var(--ember-1)' : 'var(--ink-0)',
              background: lang === l.code ? 'var(--parch-2)' : 'var(--parch-0)',
              boxShadow: lang === l.code ? '3px 3px 0 var(--ember-1)' : '2px 2px 0 var(--ink-0)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 20 }}>{l.flag}</span>
            <span style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace', fontSize: 14 }}>{l.name}</span>
            {lang === l.code && (
              <span className="font-silkscreen" style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--ember-1)' }}>{t('settings.lang.active')}</span>
            )}
          </div>
        ))}
      </div>
      <Setting label={t('settings.lang.dateFormat')} help={t('settings.lang.dateFormatHelp')}>
        <ChipGroup options={['DD/MM/YY', 'MM/DD/YY', 'YYYY-MM-DD']} active="DD/MM/YY" />
      </Setting>
      <Setting label={t('settings.lang.timeFormat')}>
        <ChipGroup options={[t('settings.option.12h'), t('settings.option.24h')]} active={t('settings.option.24h')} />
      </Setting>
    </>
  )
}

// Flavour knobs that used to live behind a gear-icon overlay (TweaksPanel).
// We folded them into Settings so there's one place for "how do I make the
// app feel a certain way", and removed the floating overlay entirely.
function SettingsTweaks() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [tweaks, update] = useTweaks()

  // Only the built-in defaults live in Settings. Extra room layouts,
  // hero poses, pets and time-of-day skins are cosmetic unlocks that
  // come through the tavern or the season pass — the user asked us to
  // stop exposing all options here and surface them as earned content.
  // `density` stays because it's a pure accessibility toggle (UI
  // compactness), not a cosmetic.
  const densities: Density[] = ['compact', 'normal', 'roomy']

  return (
    <>
      <h3 className="font-display" style={{ fontSize: 17, marginBottom: 16 }}>
        {t('settings.tweaks.title', { defaultValue: 'Flavour & tweaks' })}
      </h3>

      <Panel variant="recessed" style={{ padding: 14, marginBottom: 18 }}>
        <div
          className="font-silkscreen uppercase"
          style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--ember-1)', marginBottom: 6 }}
        >
          unlock cosmetics
        </div>
        <div style={{ color: 'var(--ink-2)', fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
          Room layouts (Scholar, Warrior), hero poses (Wave, Trophy), companions
          (Raven, Spirit orb) and time-of-day skins (Dusk, Night, Winter) now live
          in the tavern and season pass. Earn or buy them, equip from the
          inventory, and they'll render everywhere you appear.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="rpg-btn rpg-btn--sm"
            onClick={() => navigate('/tavern')}
            style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace' }}
          >
            Browse tavern →
          </button>
          <button
            className="rpg-btn rpg-btn--sm rpg-btn--primary"
            onClick={() => navigate('/seasonpass')}
            style={{ fontFamily: 'Pixelify Sans, Unbounded, monospace' }}
          >
            Season pass →
          </button>
        </div>
      </Panel>

      <Setting
        label={t('settings.tweaks.density', { defaultValue: 'Layout density' })}
        help={t('settings.tweaks.densityHelp', {
          defaultValue: 'Accessibility toggle — how tightly the UI packs.',
        })}
      >
        <ChipGroup options={densities} active={tweaks.density} onChange={(v) => {
          update({ density: v as Density })
          // Mirror the local tweak to the server so it carries across devices
          // (ADR-005). The local-state path is the source of truth for the
          // current page; the server call is fire-and-forget — we don't
          // block the UI on the round-trip.
          const serverDensity = (v === 'compact') ? 'compact' : 'comfortable'
          void preferencesApi.update({ layoutDensity: serverDensity }).catch(() => { /* anonymous user / offline */ })
        }} />
      </Setting>

      <div
        style={{
          marginTop: 16,
          padding: 10,
          fontSize: 11,
          color: 'var(--ink-3)',
          borderTop: '1px dashed var(--ink-3)',
        }}
      >
        Active cosmetic: {tweaks.roomLayout} room · {tweaks.heroPose} pose · {tweaks.pet} pet · {tweaks.season} time.
      </div>
    </>
  )
}

function SettingsPremium() {
  const [status, setStatus] = useState<PremiumStatus | null>(null)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    premiumApi.getStatus().then(setStatus).catch(() => {})
  }, [])

  const link = async () => {
    if (!email.trim() || busy) return
    setBusy(true)
    setMsg(null)
    try {
      const s = await premiumApi.linkBoosty(email.trim())
      setStatus(s)
      setEmail('')
      setMsg({ ok: true, text: 'Premium активирован! Спасибо за поддержку.' })
    } catch (e: any) {
      const code = e?.response?.data?.code
      if (code === 'NOT_SUBSCRIBED')
        setMsg({ ok: false, text: 'Этот email не найден среди подписчиков Boosty. Убедись, что подписка активна.' })
      else if (code === 'NOT_CONFIGURED')
        setMsg({ ok: false, text: 'Интеграция с Boosty пока не настроена.' })
      else
        setMsg({ ok: false, text: 'Не удалось проверить подписку. Попробуй позже.' })
    } finally {
      setBusy(false)
    }
  }

  const unlink = async () => {
    if (busy) return
    setBusy(true)
    try {
      await premiumApi.unlinkBoosty()
      setStatus({ active: false, source: null, boostyEmail: null, expiresAt: null })
      setMsg({ ok: true, text: 'Boosty отвязан.' })
    } catch {
      setMsg({ ok: false, text: 'Не удалось отвязать.' })
    } finally {
      setBusy(false)
    }
  }

  const isActive = status?.active === true

  return (
    <>
      <h3 className="font-display" style={{ fontSize: 17, marginBottom: 6 }}>Premium</h3>
      <div style={{ color: 'var(--ink-2)', fontSize: 12, marginBottom: 20, lineHeight: 1.6 }}>
        Подпишись на{' '}
        <a href="https://boosty.to" target="_blank" rel="noreferrer"
          style={{ color: 'var(--ember-1)' }}>Boosty</a>
        {' '}и введи email, чтобы разблокировать Premium-менторов в интервью.
      </div>

      {/* Status card */}
      <div style={{
        padding: 16, marginBottom: 20,
        border: `3px solid ${isActive ? 'var(--moss-1)' : 'var(--ink-3)'}`,
        background: isActive ? 'rgba(80,140,80,0.08)' : 'var(--parch-0)',
        boxShadow: '3px 3px 0 var(--ink-0)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isActive ? 8 : 0 }}>
          <span className="font-silkscreen uppercase" style={{
            fontSize: 11, letterSpacing: '0.1em',
            color: isActive ? 'var(--moss-1)' : 'var(--ink-2)',
          }}>
            {isActive ? '★ premium активен' : '○ premium не активен'}
          </span>
        </div>
        {isActive && status && (
          <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>
            <span>Boosty: <b>{status.boostyEmail}</b></span>
            {status.expiresAt && (
              <span style={{ marginLeft: 12 }}>
                до {new Date(status.expiresAt).toLocaleDateString('ru')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Link form */}
      {!isActive && (
        <Setting label="Email на Boosty" help="Тот же email, с которым ты подписан на Boosty">
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void link()}
              placeholder="you@example.com"
              style={{
                flex: 1, padding: '6px 8px', border: '2px solid var(--ink-0)',
                background: 'var(--parch-0)', fontFamily: 'monospace', fontSize: 12,
                outline: 'none',
              }}
            />
            <RpgButton size="sm" variant="primary" disabled={busy || !email.trim()} onClick={link}>
              {busy ? '…' : 'Привязать'}
            </RpgButton>
          </div>
        </Setting>
      )}

      {/* Unlink */}
      {isActive && (
        <Setting label="Отвязать Boosty" help="Premium деактивируется немедленно">
          <RpgButton size="sm" disabled={busy} onClick={unlink}>Отвязать</RpgButton>
        </Setting>
      )}

      {/* Message */}
      {msg && (
        <div style={{
          marginTop: 14, padding: '8px 12px', fontSize: 12,
          color: msg.ok ? 'var(--moss-1)' : 'var(--rpg-danger, #a23a2a)',
          border: `2px solid ${msg.ok ? 'var(--moss-1)' : 'var(--rpg-danger, #a23a2a)'}`,
        }}>
          {msg.text}
        </div>
      )}
    </>
  )
}
