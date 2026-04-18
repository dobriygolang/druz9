import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel, RpgButton, PageHeader } from '@/shared/ui/pixel'
import { Hero } from '@/shared/ui/sprites'
import { isSoundEnabled, setSoundEnabled, play } from '@/shared/lib/sound'
import { notificationApi, type NotificationSettings } from '@/features/Notification/api/notificationApi'
import { addToast } from '@/shared/lib/toasts'

type Section = 'account' | 'display' | 'notifs' | 'gameplay' | 'privacy' | 'keys' | 'access' | 'language'

const ICONS: Record<Section, string> = {
  account:  '◎',
  display:  '▦',
  notifs:   '✉',
  gameplay: '⚔',
  privacy:  '⛨',
  keys:     '⌨',
  access:   '◑',
  language: '◈',
}

export function SettingsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Section>('account')

  const TABS: Array<[Section, string]> = [
    ['account',  t('settings.tab.account')],
    ['display',  t('settings.tab.display')],
    ['notifs',   t('settings.tab.notifications')],
    ['gameplay', t('settings.tab.gameplay')],
    ['privacy',  t('settings.tab.privacy')],
    ['keys',     t('settings.tab.keybindings')],
    ['access',   t('settings.tab.accessibility')],
    ['language', t('settings.tab.language')],
  ]

  return (
    <>
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
          <div style={{ borderRight: '3px dashed var(--ink-3)', padding: '14px 0' }}>
            {TABS.map(([id, label]) => (
              <div
                key={id}
                onClick={() => setTab(id)}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  background: tab === id ? 'var(--parch-2)' : 'transparent',
                  borderLeft: tab === id ? '4px solid var(--ember-1)' : '4px solid transparent',
                  fontFamily: 'Pixelify Sans, monospace',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: 'Silkscreen, monospace',
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
          <div style={{ padding: 24 }}>
            {tab === 'account'  && <SettingsAccount />}
            {tab === 'display'  && <SettingsDisplay />}
            {tab === 'notifs'   && <SettingsNotifs />}
            {tab === 'gameplay' && <SettingsGameplay />}
            {tab === 'privacy'  && <SettingsPrivacy />}
            {tab === 'keys'     && <SettingsKeybindings />}
            {tab === 'access'   && <SettingsAccessibility />}
            {tab === 'language' && <SettingsLanguage />}
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
        <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 14 }}>{label}</div>
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
}: {
  options: string[]
  active: string
}) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {options.map((s) => (
        <span
          key={s}
          className={`rpg-tweak-chip ${s === active ? 'rpg-tweak-chip--on' : ''}`}
        >
          {s}
        </span>
      ))}
    </div>
  )
}

function SettingsAccount() {
  const { t } = useTranslation()
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
          <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 22 }}>Thornmoss</div>
          <div
            className="font-silkscreen uppercase"
            style={{ fontSize: 10, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
          >
            {t('settings.account.joined')}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <RpgButton size="sm">{t('settings.account.changeName')}</RpgButton>
            <RpgButton size="sm">{t('settings.account.changeAvatar')}</RpgButton>
          </div>
        </div>
      </div>
      <Setting label={t('settings.account.email')} help={t('settings.account.emailHelp')}>
        <input
          defaultValue="thornmoss@druz9.world"
          readOnly
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '2px solid var(--ink-0)',
            background: 'var(--parch-2)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            color: 'var(--ink-0)',
          }}
        />
      </Setting>
      <Setting label={t('settings.account.twoFactor')} help={t('settings.account.twoFactorHelp')}>
        <Toggle on />
      </Setting>
      <Setting label={t('settings.account.connected')} help={t('settings.account.connectedHelp')}>
        <RpgButton size="sm">{t('settings.account.manage')}</RpgButton>
      </Setting>
      <Setting label={t('settings.account.danger')} help={t('settings.account.dangerHelp')}>
        <RpgButton
          size="sm"
          style={{
            background: 'var(--rpg-danger, #a23a2a)',
            color: 'var(--parch-0)',
            boxShadow:
              'inset -3px -3px 0 #7a2a1a, inset 3px 3px 0 #c94a3a, 3px 3px 0 var(--ink-0)',
          }}
        >
          {t('settings.account.delete')}
        </RpgButton>
      </Setting>
    </>
  )
}

function SettingsDisplay() {
  const { t } = useTranslation()
  return (
    <>
      <h3 className="font-display" style={{ fontSize: 17, marginBottom: 16 }}>
        {t('settings.display.title')}
      </h3>
      <Setting label={t('settings.display.pixelScale')} help={t('settings.display.pixelScaleHelp')}>
        <ChipGroup options={['1×', '2×', '3×', '4×']} active="2×" />
      </Setting>
      <Setting label={t('settings.display.reduceMotion')} help={t('settings.display.reduceMotionHelp')}>
        <Toggle />
      </Setting>
      <Setting label={t('settings.display.ambientSound')} help={t('settings.display.ambientSoundHelp')}>
        <Toggle on />
      </Setting>
      <Setting label={t('settings.display.uiSound')} help={t('settings.display.uiSoundHelp')}>
        <Toggle on />
      </Setting>
      <Setting label={t('settings.display.fontDensity')} help={t('settings.display.fontDensityHelp')}>
        <ChipGroup options={['S', 'M', 'L', 'XL']} active="M" />
      </Setting>
      <Setting
        label={t('settings.display.colourPalette')}
        help={t('settings.display.colourPaletteHelp')}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          {(
            [
              ['parchment', 'var(--parch-0)'],
              ['ironveil', '#2a2a38'],
              ['ember', '#7a3d12'],
            ] as const
          ).map(([n, c]) => (
            <div
              key={n}
              style={{
                width: 56,
                height: 38,
                background: c,
                border: '3px solid var(--ink-0)',
                boxShadow:
                  n === 'parchment' ? '2px 2px 0 var(--ember-1)' : '2px 2px 0 var(--ink-3)',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
      </Setting>
    </>
  )
}

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

function SettingsGameplay() {
  const { t } = useTranslation()
  return (
    <>
      <h3 className="font-display" style={{ fontSize: 17, marginBottom: 16 }}>
        {t('settings.gameplay.title')}
      </h3>
      <Setting label={t('settings.gameplay.defaultDiff')} help={t('settings.gameplay.defaultDiffHelp')}>
        <ChipGroup options={[t('settings.option.easy'), t('settings.option.medium'), t('settings.option.hard'), t('settings.option.mythic')]} active={t('settings.option.medium')} />
      </Setting>
      <Setting label={t('settings.gameplay.autoRaid')} help={t('settings.gameplay.autoRaidHelp')}>
        <Toggle />
      </Setting>
      <Setting
        label={t('settings.gameplay.streakShield')}
        help={t('settings.gameplay.streakShieldHelp')}
      >
        <Toggle on />
      </Setting>
      <Setting label={t('settings.gameplay.ideTheme')} help={t('settings.gameplay.ideThemeHelp')}>
        <ChipGroup options={[t('settings.option.ember'), t('settings.option.moss'), t('settings.option.dusk')]} active={t('settings.option.ember')} />
      </Setting>
      <Setting
        label={t('settings.gameplay.showOpponent')}
        help={t('settings.gameplay.showOpponentHelp')}
      >
        <Toggle on />
      </Setting>
      <Setting label={t('settings.gameplay.hintFreq')} help={t('settings.gameplay.hintFreqHelp')}>
        <ChipGroup options={[t('settings.option.none'), t('settings.option.rare'), t('settings.option.normal'), t('settings.option.often')]} active={t('settings.option.normal')} />
      </Setting>
    </>
  )
}

function SettingsPrivacy() {
  const { t } = useTranslation()
  return (
    <>
      <h3 className="font-display" style={{ fontSize: 17, marginBottom: 16 }}>
        {t('settings.privacy.title')}
      </h3>
      <Setting label={t('settings.privacy.leaderboard')} help={t('settings.privacy.leaderboardHelp')}>
        <Toggle on />
      </Setting>
      <Setting label={t('settings.privacy.profileVisits')} help={t('settings.privacy.profileVisitsHelp')}>
        <ChipGroup options={[t('settings.option.nobody'), t('settings.option.friends'), t('settings.option.guild'), t('settings.option.anyone')]} active={t('settings.option.guild')} />
      </Setting>
      <Setting label={t('settings.privacy.duelInvites')} help={t('settings.privacy.duelInvitesHelp')}>
        <ChipGroup
          options={[t('settings.option.friends'), t('settings.option.guild'), t('settings.option.rankRange'), t('settings.option.anyone')]}
          active={t('settings.option.rankRange')}
        />
      </Setting>
      <Setting label={t('settings.privacy.showOnline')}>
        <Toggle on />
      </Setting>
      <Setting label={t('settings.privacy.chatFilter')} help={t('settings.privacy.chatFilterHelp')}>
        <ChipGroup options={[t('settings.option.off'), t('settings.option.mild'), t('settings.option.strict')]} active={t('settings.option.mild')} />
      </Setting>
      <Setting
        label={t('settings.privacy.exportData')}
        help={t('settings.privacy.exportDataHelp')}
      >
        <RpgButton size="sm">{t('settings.privacy.requestExport')}</RpgButton>
      </Setting>
    </>
  )
}

/* ---- Keybindings ---- */
const DEFAULT_KEYS: Array<[string, string, string]> = [
  ['hub', 'g h', 'nav'],
  ['training', 'g t', 'nav'],
  ['arena', 'g a', 'nav'],
  ['profile', 'g p', 'nav'],
  ['guild', 'g g', 'nav'],
  ['search', '/', 'global'],
  ['showHints', '?', 'global'],
  ['submitCode', '⌘↵', 'editor'],
  ['runTests', '⌘r', 'editor'],
  ['toggleHint', '⌘h', 'editor'],
  ['nextHint', '⌘]', 'editor'],
]

function SettingsKeybindings() {
  const { t } = useTranslation()
  return (
    <>
      <h3 className="font-display" style={{ fontSize: 17, marginBottom: 4 }}>{t('settings.keys.title')}</h3>
      <div style={{ color: 'var(--ink-2)', fontSize: 12, marginBottom: 16 }}>
        {t('settings.keys.rebindHint')}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {(['all', 'nav', 'global', 'editor'] as const).map((cat) => (
          <span key={cat} className={`rpg-tweak-chip ${cat === 'all' ? 'rpg-tweak-chip--on' : ''}`}>{t(`settings.keys.cat.${cat}`)}</span>
        ))}
      </div>
      {DEFAULT_KEYS.map(([label, key, cat]) => (
        <div
          key={label}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto',
            alignItems: 'center',
            gap: 12,
            padding: '10px 0',
            borderBottom: '1px dashed var(--ink-3)',
          }}
        >
          <div style={{ fontSize: 13 }}>{t(`settings.keys.label.${label}`)}</div>
          <span
            className="font-silkscreen uppercase"
            style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: '0.08em' }}
          >{t(`settings.keys.cat.${cat}`)}</span>
          <span
            className="font-silkscreen"
            style={{
              background: 'var(--ink-0)',
              color: 'var(--parch-0)',
              padding: '3px 10px',
              fontSize: 10,
              border: '2px solid var(--ink-1)',
              boxShadow: '2px 2px 0 var(--ember-1)',
              cursor: 'pointer',
              minWidth: 52,
              textAlign: 'center',
            }}
          >{key}</span>
        </div>
      ))}
      <RpgButton size="sm" style={{ marginTop: 16 }}>{t('settings.keys.resetDefaults')}</RpgButton>
    </>
  )
}

/* ---- Accessibility ---- */
function SettingsAccessibility() {
  const { t } = useTranslation()
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled())
  return (
    <>
      <h3 className="font-display" style={{ fontSize: 17, marginBottom: 16 }}>{t('settings.access.title')}</h3>
      <Setting label={t('settings.access.soundEffects')} help={t('settings.access.soundEffectsHelp')}>
        <Toggle
          on={soundOn}
          onClick={() => {
            const next = !soundOn
            setSoundEnabled(next)
            setSoundOn(next)
            if (next) play('click')
          }}
        />
      </Setting>
      <Setting label={t('settings.access.reduceMotion')} help={t('settings.access.reduceMotionHelp')}>
        <Toggle />
      </Setting>
      <Setting label={t('settings.access.highContrast')} help={t('settings.access.highContrastHelp')}>
        <Toggle />
      </Setting>
      <Setting label={t('settings.access.largeText')} help={t('settings.access.largeTextHelp')}>
        <Toggle />
      </Setting>
      <Setting label={t('settings.access.keyboardOnly')} help={t('settings.access.keyboardOnlyHelp')}>
        <Toggle />
      </Setting>
      <Setting label={t('settings.access.screenReader')} help={t('settings.access.screenReaderHelp')}>
        <Toggle on />
      </Setting>
      <Setting label={t('settings.access.colourBlind')} help={t('settings.access.colourBlindHelp')}>
        <ChipGroup options={[t('settings.option.off'), t('settings.option.deuteranopia'), t('settings.option.protanopia'), t('settings.option.tritanopia')]} active={t('settings.option.off')} />
      </Setting>
      <Setting label={t('settings.access.contrastLevel')} help={t('settings.access.contrastLevelHelp')}>
        <ChipGroup options={['AA', 'AAA']} active="AA" />
      </Setting>
    </>
  )
}

/* ---- Language ---- */
const LANGS = [
  { code: 'ru', name: 'Русский',    flag: '🇷🇺', active: true },
  { code: 'en', name: 'English',    flag: '🇬🇧', active: false },
  { code: 'de', name: 'Deutsch',    flag: '🇩🇪', active: false },
  { code: 'fr', name: 'Français',   flag: '🇫🇷', active: false },
  { code: 'es', name: 'Español',    flag: '🇪🇸', active: false },
  { code: 'zh', name: '中文',       flag: '🇨🇳', active: false },
  { code: 'ja', name: '日本語',     flag: '🇯🇵', active: false },
  { code: 'pt', name: 'Português',  flag: '🇧🇷', active: false },
]

function SettingsLanguage() {
  const { t } = useTranslation()
  const [lang, setLang] = useState('ru')
  return (
    <>
      <h3 className="font-display" style={{ fontSize: 17, marginBottom: 4 }}>{t('settings.lang.title')}</h3>
      <div style={{ color: 'var(--ink-2)', fontSize: 12, marginBottom: 20 }}>
        {t('settings.lang.uiHint')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
        {LANGS.map((l) => (
          <div
            key={l.code}
            onClick={() => setLang(l.code)}
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
            <span style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 14 }}>{l.name}</span>
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
