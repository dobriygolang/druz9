import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Toggle } from '@/shared/ui/Toggle'
import { useToast } from '@/shared/ui/Toast'
import { notificationApi, type NotificationSettings } from '@/features/Notification/api/notificationApi'

export function NotificationSettings() {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    notificationApi.getSettings()
      .then(setSettings)
      .catch(() => setSettings(null))
      .finally(() => setLoading(false))
  }, [])

  const toggle = async (key: keyof Pick<NotificationSettings, 'duelsEnabled' | 'progressEnabled' | 'circlesEnabled' | 'dailyChallengeEnabled'>) => {
    if (!settings) return
    const newValue = !settings[key]
    const optimistic = { ...settings, [key]: newValue }
    setSettings(optimistic)
    try {
      await notificationApi.updateSettings({ [key]: newValue })
    } catch {
      setSettings(settings)
      toast(t('common.saveFailed'), 'error')
    }
  }

  if (loading) {
    return (
      <div className="rounded-[20px] border border-[#CBCCC9] bg-white p-5 dark:border-[#1a2540] dark:bg-[#161c2d]">
        <div className="h-4 w-40 animate-pulse rounded bg-[#e2e8f0] dark:bg-[#1e3158]" />
      </div>
    )
  }

  if (!settings) return null

  const categories = [
    { key: 'duelsEnabled' as const, emoji: '⚔️', label: t('notifications.categories.duels'), desc: t('notifications.categories.duelsDesc') },
    { key: 'progressEnabled' as const, emoji: '📈', label: t('notifications.categories.progress'), desc: t('notifications.categories.progressDesc') },
    { key: 'circlesEnabled' as const, emoji: '👥', label: t('notifications.categories.circles'), desc: t('notifications.categories.circlesDesc') },
    { key: 'dailyChallengeEnabled' as const, emoji: '🗓', label: t('notifications.categories.daily'), desc: t('notifications.categories.dailyDesc') },
  ]

  const anyEnabled = categories.some(c => settings[c.key])

  return (
    <div className="rounded-[20px] border border-[#CBCCC9] bg-white p-5 dark:border-[#1a2540] dark:bg-[#161c2d]">
      <div className="mb-4 flex items-center gap-2">
        {anyEnabled
          ? <Bell className="w-4 h-4 text-[#6366F1]" />
          : <BellOff className="w-4 h-4 text-[#94a3b8]" />
        }
        <h3 className="text-sm font-semibold text-[#1e293b] dark:text-white">
          {t('notifications.title')}
        </h3>
        {!settings.telegramLinked && (
          <span className="ml-auto text-xs text-[#94a3b8]">{t('notifications.telegramRequired')}</span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {categories.map(({ key, emoji, label, desc }) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base leading-none">{emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#1e293b] dark:text-white leading-tight">{label}</p>
                <p className="text-xs text-[#94a3b8] leading-tight mt-0.5">{desc}</p>
              </div>
            </div>
            <Toggle
              checked={settings[key]}
              onChange={() => toggle(key)}
              disabled={!settings.telegramLinked}
            />
          </div>
        ))}
      </div>

      {!settings.telegramLinked && (
        <p className="mt-4 text-xs text-[#94a3b8]">
          {t('notifications.linkTelegramHint')}
        </p>
      )}
    </div>
  )
}
