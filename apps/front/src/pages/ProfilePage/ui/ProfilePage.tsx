import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, Calendar, Briefcase, Edit3, Trophy, Zap, Swords, Flame, ChevronRight, Check, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { i18n } from '@/shared/i18n'
import { useAuth } from '@/app/providers/AuthProvider'
import { authApi } from '@/features/Auth/api/authApi'
import type { User, ProfileProgress } from '@/entities/User/model/types'
import { Avatar } from '@/shared/ui/Avatar'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Input } from '@/shared/ui/Input'
import { useToast } from '@/shared/ui/Toast'
import { ErrorState } from '@/shared/ui/ErrorState'
import { ActivityHeatmap } from '@/shared/ui/ActivityHeatmap'
import { AchievementBadges } from '@/shared/ui/AchievementBadges'
import type { Achievement } from '@/shared/ui/AchievementBadges'
import { SkillRing } from '@/shared/ui/SkillRing'
import { NextActionCard } from '@/shared/ui/NextActionCard'
import { GoalSelector } from '@/shared/ui/GoalSelector'
import { apiClient } from '@/shared/api/base'
import { PageMeta } from '@/shared/ui/PageMeta'

function formatJoinDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'ru-RU', { month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

interface ArenaStats {
  rating: number
  league: string
  wins: number
  losses: number
  matches: number
  winRate: number
}

function computeLeague(rating: number): string {
  if (rating < 1000) return 'Bronze'
  if (rating < 1500) return 'Silver'
  if (rating < 2000) return 'Gold'
  if (rating < 2500) return 'Platinum'
  return 'Diamond'
}

function companyReadiness(progress: ProfileProgress) {
  const sessions = progress.mockSessions ?? []
  const byCompany = new Map<string, { name: string; total: number; completed: number; active: number }>()

  for (const name of progress.companies) {
    byCompany.set(name, { name, total: 0, completed: 0, active: 0 })
  }

  for (const session of sessions) {
    const key = session.companyTag || 'Unknown'
    const existing = byCompany.get(key) ?? { name: key, total: 0, completed: 0, active: 0 }
    existing.total += Math.max(session.totalStages || 1, 1)
    existing.completed += Math.min(session.currentStageIndex, Math.max(session.totalStages || 1, 1))
    if (session.status === 'active') existing.active += 1
    if (session.status === 'finished') existing.completed = Math.max(existing.completed, Math.max(session.totalStages || 1, 1))
    byCompany.set(key, existing)
  }

  return Array.from(byCompany.values())
    .map(item => {
      const denominator = Math.max(item.total, item.completed, 1)
      const percent = Math.min(100, Math.round((item.completed / denominator) * 100))
      const tone = percent >= 75 ? 'success' : percent >= 40 ? 'warning' : 'danger'
      return {
        ...item,
        percent,
        tone,
      }
    })
    .sort((a, b) => b.percent - a.percent)
}

type Tab = 'activity' | 'progress' | 'achievements'

export function ProfilePage() {
  const { t } = useTranslation()
  const { userId } = useParams()
  const { user: authUser, refresh } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [progress, setProgress] = useState<ProfileProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [arenaStats, setArenaStats] = useState<ArenaStats | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [activity, setActivity] = useState<{ date: string; count: number }[]>([])
  const [activeTab, setActiveTab] = useState<Tab>('activity')
  const [editMode, setEditMode] = useState(false)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editWorkplace, setEditWorkplace] = useState('')
  const [editRegion, setEditRegion] = useState('')
  const [saving, setSaving] = useState(false)
  const [bindingProvider, setBindingProvider] = useState<'telegram' | 'yandex' | null>(null)
  const [bindError, setBindError] = useState('')
  const [tgToken, setTgToken] = useState('')
  const [tgCode, setTgCode] = useState('')
  const [showTgCodeModal, setShowTgCodeModal] = useState(false)
  const [submittingTgCode, setSubmittingTgCode] = useState(false)

  const targetId = userId ?? authUser?.id ?? ''
  const isOwn = !userId || userId === authUser?.id

  const authUserRef = useRef(authUser)
  useEffect(() => { authUserRef.current = authUser }, [authUser])

  const fetchProfile = useCallback(() => {
    if (!targetId) return
    setError(null)
    setLoading(true)
    Promise.all([
      authApi.getProfileById(targetId),
      authApi.getProfileProgress(targetId),
    ])
      .then(([p, prog]) => { setUser(p.user); setProgress(prog) })
      .catch(() => {
        if (authUserRef.current) setUser(authUserRef.current)
        else setError(t('common.loadFailed'))
      })
      .finally(() => setLoading(false))
  }, [targetId, t])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  useEffect(() => {
    if (!targetId) return
    apiClient.get(`/api/v1/arena/stats/${targetId}`)
      .then(res => {
        const s = res.data?.stats ?? res.data
        if (s && typeof s.rating === 'number') setArenaStats(s)
      })
      .catch((err) => { console.error('ProfilePage arena stats fetch error:', err) })
  }, [targetId])

  useEffect(() => {
    if (!targetId) return
    apiClient.get(`/api/v1/profile/${targetId}/achievements`)
      .then(res => {
        const raw = res.data
        const arr: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.achievements) ? raw.achievements : []
        setAchievements(arr.map((a: any, i: number) => ({
          id: a.id ?? a.ID ?? String(i),
          title: a.title ?? a.Title ?? '',
          description: a.description ?? a.Description ?? '',
          icon: a.icon ?? a.Icon ?? '🏅',
          unlocked: a.unlocked ?? a.Unlocked ?? false,
          category: a.category ?? a.Category ?? '',
          unlockedAt: a.unlockedAt,
        })))
      })
      .catch((err) => { console.error('ProfilePage achievements fetch error:', err) })
  }, [targetId])

  useEffect(() => {
    if (!targetId) return
    apiClient.get(`/api/v1/profile/${targetId}/activity`)
      .then(res => {
        const raw = res.data
        const arr: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.activity) ? raw.activity : []
        setActivity(arr.map((a: any) => ({
          date: a.date ?? a.Date ?? '',
          count: a.count ?? a.Count ?? 0,
        })))
      })
      .catch((err) => { console.error('ProfilePage activity fetch error:', err) })
  }, [targetId])

  const bindTelegram = async () => {
    setBindingProvider('telegram'); setBindError('')
    try {
      const { token, botStartUrl } = await authApi.createTelegramAuthChallenge()
      setTgToken(token)
      setTgCode('')
      window.open(botStartUrl, '_blank')
      setShowTgCodeModal(true)
    } catch {
      setBindError(t('profile.bind.telegramOpenFailed'))
    } finally {
      setBindingProvider(null)
    }
  }

  const submitTgCode = async () => {
    if (!tgCode.trim() || !tgToken) return
    setSubmittingTgCode(true)
    try {
      await authApi.bindTelegram(tgToken, tgCode.trim())
      await refresh()
      fetchProfile()
      setShowTgCodeModal(false)
      setTgCode('')
      setTgToken('')
      toast(t('profile.bind.telegramLinked'), 'success')
    } catch {
      toast(t('profile.bind.telegramCodeInvalid'), 'error')
    } finally {
      setSubmittingTgCode(false)
    }
  }

  const bindYandex = async () => {
    setBindingProvider('yandex'); setBindError('')
    try {
      const { authUrl } = await authApi.startYandexAuth()
      window.location.href = authUrl
    } catch {
      setBindError(t('profile.bind.yandexOpenFailed'))
      setBindingProvider(null)
    }
  }

  const openEdit = () => {
    if (!user) return
    setEditFirstName(user.firstName ?? '')
    setEditLastName(user.lastName ?? '')
    setEditWorkplace(user.currentWorkplace ?? '')
    setEditRegion(user.region ?? '')
    setEditMode(true)
  }

  const saveEdit = async () => {
    if (!targetId) return
    setSaving(true)
    try {
      await apiClient.patch(`/api/v1/profile/${targetId}`, {
        firstName: editFirstName,
        lastName: editLastName,
        currentWorkplace: editWorkplace,
        region: editRegion,
      })
      setUser(prev => prev ? { ...prev, firstName: editFirstName, lastName: editLastName, currentWorkplace: editWorkplace, region: editRegion } : prev)
      setEditMode(false)
    } catch {
      // keep modal open
    } finally {
      setSaving(false)
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchProfile() }} />

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 px-4 pb-6 pt-4 md:p-6">
        <div className="h-[220px] rounded-[32px] border border-[#CBCCC9] bg-white" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-2xl border border-[#CBCCC9] bg-white" />)}
        </div>
        <div className="h-[240px] rounded-[28px] border border-[#CBCCC9] bg-white" />
      </div>
    )
  }

  if (!user) return (
    <div className="flex items-center justify-center h-64 text-[#94a3b8] text-sm">{t('profile.notFound')}</div>
  )

  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.username

  const stats = [
    ...(progress ? [
      { label: t('profile.stats.sessions'), value: progress.overview.practiceSessions, icon: <Zap className="w-3.5 h-3.5 text-[#6366F1]" />, bg: '#EEF2FF' },
      { label: t('profile.stats.streak'), value: `${progress.overview.currentStreakDays}d`, icon: <Flame className="w-3.5 h-3.5 text-[#f59e0b]" />, bg: '#FFFBEB' },
    ] : []),
    ...(arenaStats ? [
      { label: t('profile.stats.rating'), value: arenaStats.rating, icon: <Trophy className="w-3.5 h-3.5 text-[#6366F1]" />, bg: '#EEF2FF' },
      { label: t('profile.stats.wins'), value: arenaStats.wins, icon: <Swords className="w-3.5 h-3.5 text-[#22c55e]" />, bg: '#F0FDF4' },
    ] : []),
  ]

  const tabs: { id: Tab; label: string }[] = [
    { id: 'activity', label: t('profile.tabs.activity') },
    { id: 'progress', label: t('profile.tabs.progress') },
    { id: 'achievements', label: t('profile.tabs.achievements') },
  ]
  const statsGridClass = stats.length > 2 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'
  const readiness = progress ? companyReadiness(progress) : []
  const leagueLabel = t(`profile.leagueLabel.${computeLeague(arenaStats?.rating ?? 0).toLowerCase()}`)

  const handleGoalChange = async (newGoal: { kind: string; company?: string }) => {
    try {
      const saved = await authApi.setUserGoal(newGoal)
      if (progress) {
        setProgress({ ...progress, goal: saved })
        authApi.getProfileProgress(targetId).then(setProgress)
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-6 pt-4 md:gap-5 md:p-6">
      <PageMeta title={t('profile.meta.title')} description={t('profile.meta.description')} canonicalPath={userId ? `/profile/${userId}` : '/profile'} />
      <section className="section-enter relative overflow-hidden rounded-[34px] border border-[#d8d9d6] bg-[linear-gradient(135deg,_#0f172a_0%,_#1e1b4b_38%,_#7c2d12_100%)] shadow-[0_26px_64px_rgba(15,23,42,0.16)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.24),_transparent_32%),radial-gradient(circle_at_80%_20%,_rgba(129,140,248,0.35),_transparent_26%),radial-gradient(circle_at_75%_80%,_rgba(251,191,36,0.18),_transparent_28%)]" />
        <div className="relative p-5 md:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end">
            <Avatar
              name={displayName}
              src={user.avatarUrl || undefined}
              size="xl"
              className="ring-4 ring-white/25 shadow-[0_16px_32px_rgba(15,23,42,0.24)]"
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c7d2fe]">{t('profile.hero.eyebrow')}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-bold text-white">{displayName}</h1>
                    {user.isTrusted && <Badge variant="info">{t('profile.badge.trusted')}</Badge>}
                    {user.isAdmin && <Badge variant="warning">{t('profile.badge.admin')}</Badge>}
                  </div>
                  {user.username && <p className="mt-1 text-xs text-[#cbd5e1]">@{user.username}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
                      <Trophy className="h-3.5 w-3.5 text-[#fbbf24]" />
                      {t('profile.league')}: {leagueLabel}
                    </span>
                    {arenaStats && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur">
                        <Sparkles className="h-3.5 w-3.5 text-[#a5b4fc]" />
                        {arenaStats.rating} ELO
                      </span>
                    )}
                  </div>
                </div>

                {isOwn && (
                  <Button variant="secondary" size="sm" className="w-full justify-center rounded-full border-white/20 bg-white/12 text-white hover:bg-white/18 sm:w-auto" onClick={openEdit}>
                    <Edit3 className="w-3.5 h-3.5" /> {t('profile.edit')}
                  </Button>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {user.region && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/85 backdrop-blur">
                    <MapPin className="w-3 h-3" /> {user.region}
                  </span>
                )}
                {user.currentWorkplace && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/85 backdrop-blur">
                    <Briefcase className="w-3 h-3" /> {user.currentWorkplace}
                  </span>
                )}
                {user.createdAt && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/85 backdrop-blur">
                    <Calendar className="w-3 h-3" /> {t('profile.since', { date: formatJoinDate(user.createdAt) })}
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {user.connectedProviders.includes('telegram') && (
                  <span className="rounded-full bg-[#e8f4fd] px-2.5 py-1 text-[11px] font-medium text-[#0088cc]">Telegram</span>
                )}
                {user.connectedProviders.includes('yandex') && (
                  <span className="rounded-full bg-[#fff7ed] px-2.5 py-1 text-[11px] font-medium text-[#ea580c]">Yandex</span>
                )}
                {isOwn && !user.connectedProviders.includes('telegram') && (
                  <button
                    onClick={bindTelegram}
                    disabled={!!bindingProvider}
                    className="rounded-full border border-[#0088cc]/20 bg-[#e8f4fd] px-2.5 py-1 text-[11px] font-medium text-[#0088cc] transition-colors hover:bg-[#cce9fa] disabled:opacity-50"
                  >
                    {bindingProvider === 'telegram' ? t('profile.bind.opening') : t('profile.bind.linkTelegram')}
                  </button>
                )}
                {isOwn && !user.connectedProviders.includes('yandex') && (
                  <button
                    onClick={bindYandex}
                    disabled={!!bindingProvider}
                    className="rounded-full border border-[#ea580c]/20 bg-[#fff7ed] px-2.5 py-1 text-[11px] font-medium text-[#ea580c] transition-colors hover:bg-[#ffe4cc] disabled:opacity-50"
                  >
                    {bindingProvider === 'yandex' ? t('profile.bind.redirecting') : t('profile.bind.linkYandex')}
                  </button>
                )}
                {bindError && <span className="text-[11px] text-red-500">{bindError}</span>}
              </div>
            </div>
          </div>
        </div>

        {stats.length > 0 && (
          <div className={`grid ${statsGridClass} gap-3 border-t border-white/10 px-5 pb-5 pt-4 md:px-6 md:pb-6`}>
            {stats.map(s => (
              <div key={s.label} className="flex flex-col justify-between rounded-[24px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: s.bg }}>
                    {s.icon}
                  </div>
                  <span className="font-mono text-base font-bold text-white">{s.value}</span>
                </div>
                <span className="mt-3 text-[11px] uppercase tracking-[0.16em] text-white/60">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="-mx-4 overflow-x-auto px-4 no-scrollbar md:mx-0 md:px-0">
        <div className="inline-flex min-w-full gap-2 rounded-[24px] border border-[#d8d9d6] bg-white/72 p-1.5 shadow-[0_18px_34px_rgba(15,23,42,0.06)] backdrop-blur dark:border-[#1a2540] dark:bg-[#10192b]/72 md:min-w-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap rounded-[18px] px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#111111] text-white shadow-[0_14px_24px_rgba(15,23,42,0.14)] dark:bg-white dark:text-[#08101f]'
                  : 'text-[#666666] dark:text-[#4d6380] hover:bg-white/80 hover:text-[#111111] dark:hover:bg-[#161f34] dark:hover:text-[#e2e8f3]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'activity' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
          <div className="section-enter rounded-[28px] border border-[#CBCCC9] bg-white p-5 dark:border-[#1a2540] dark:bg-[#161c2d]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#111111]">{t('profile.activity.title')}</h3>
                <p className="mt-1 text-xs text-[#94a3b8]">{t('profile.activity.subtitle')}</p>
              </div>
              {progress && (
                <div className="rounded-2xl bg-[#f8fafc] px-3 py-2 text-right">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">{t('profile.activity.activeDays')}</p>
                  <p className="font-mono text-lg font-bold text-[#0f172a]">{progress.overview.practiceActiveDays}</p>
                </div>
              )}
            </div>
            {activity.length > 0 ? (
              <ActivityHeatmap activity={activity} />
            ) : (
              <div className="flex h-20 items-center justify-center rounded-xl bg-[#F2F3F0]">
                <p className="text-xs text-[#94a3b8]">{t('profile.activity.empty')}</p>
              </div>
            )}
          </div>

          <div className="section-enter rounded-[28px] border border-[#CBCCC9] bg-white p-5 dark:border-[#1a2540] dark:bg-[#161c2d]">
            <h3 className="text-sm font-semibold text-[#111111]">{t('profile.arena.title')}</h3>
            <p className="mt-1 text-xs text-[#94a3b8]">{t('profile.arena.subtitle')}</p>

            {arenaStats ? (
              <>
                <div className="mt-5 rounded-[24px] bg-[linear-gradient(135deg,_#eef2ff,_#fff7ed)] p-4">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[#64748b]">{t('profile.stats.rating')}</p>
                      <p className="mt-2 font-mono text-3xl font-bold text-[#111827]">{arenaStats.rating}</p>
                    </div>
                    <Badge variant="info">{t(`profile.leagueLabel.${computeLeague(arenaStats.rating).toLowerCase()}`)}</Badge>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-white/80">
                    <div
                      className="h-2 rounded-full bg-[#6366F1]"
                      style={{ width: `${Math.min((arenaStats.rating / 3000) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { label: t('profile.arena.matches'), value: arenaStats.matches },
                    { label: t('profile.stats.wins'), value: arenaStats.wins },
                    { label: t('profile.arena.losses'), value: arenaStats.losses },
                    { label: t('profile.arena.winrate'), value: `${Math.round(arenaStats.winRate * 100)}%` },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl bg-[#f8fafc] px-4 py-3">
                      <p className="font-mono text-xl font-bold text-[#0f172a]">{s.value}</p>
                      <p className="mt-1 text-xs text-[#64748b]">{s.label}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-5 flex min-h-[180px] items-center justify-center rounded-[24px] bg-[#F2F3F0] text-center">
                <p className="text-xs text-[#94a3b8]">{t('profile.arena.empty')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="flex flex-col gap-4">
          {/* Skill Map */}
          {progress && progress.competencies.length > 0 && (
            <div className="section-enter rounded-[28px] border border-[#CBCCC9] bg-white p-5 dark:border-[#1a2540] dark:bg-[#161c2d]">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#111111] dark:text-[#e2e8f3]">{t('profile.progress.skillMap')}</h3>
                  <p className="mt-1 text-xs text-[#94a3b8]">{t('profile.progress.skillMapSubtitle')}</p>
                </div>
                {progress.overview.practiceSessions > 0 && (
                  <div className="rounded-2xl bg-[#fff7ed] px-3 py-2 text-right dark:bg-[#2a200a]">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#c2410c]">{t('profile.progress.averageScore')}</p>
                    <p className="font-mono text-lg font-bold text-[#9a3412]">{Math.round(progress.overview.averageStageScore)}</p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-1 sm:justify-start sm:gap-2">
                {progress.competencies.map(c => (
                  <SkillRing
                    key={c.key}
                    score={c.score}
                    level={c.level || 'beginner'}
                    label={c.label}
                    size="md"
                  />
                ))}
              </div>
              {isOwn && progress.goal && (
                <GoalSelector
                  goal={progress.goal}
                  companies={progress.companies}
                  onChange={handleGoalChange}
                  className="mt-4 border-t border-[#e2e8f0] pt-4 dark:border-[#1e3158]"
                />
              )}
            </div>
          )}

          {/* Next Actions */}
          {progress && (progress.nextActions?.length ?? 0) > 0 && (
            <div className="section-enter rounded-[28px] border border-[#CBCCC9] bg-white p-5 dark:border-[#1a2540] dark:bg-[#161c2d]">
              <h3 className="text-sm font-semibold text-[#111111] dark:text-[#e2e8f3]">{t('profile.progress.nextSteps')}</h3>
              <p className="mt-1 mb-4 text-xs text-[#94a3b8]">{t('profile.progress.nextStepsSubtitle')}</p>
              <div className="flex flex-col gap-2">
                {progress.nextActions!.map((action, i) => (
                  <NextActionCard
                    key={`${action.skillKey}-${i}`}
                    title={action.title}
                    description={action.description}
                    actionType={action.actionType}
                    href={action.actionUrl}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Overview metrics */}
          {progress && progress.overview.practiceSessions > 0 && (
            <div className="section-enter rounded-[28px] border border-[#CBCCC9] bg-white p-5 dark:border-[#1a2540] dark:bg-[#161c2d]">
              <h3 className="mb-3 text-sm font-semibold text-[#111111] dark:text-[#e2e8f3]">{t('profile.progress.overview')}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: t('profile.stats.sessions'), value: progress.overview.practiceSessions },
                  { label: t('profile.progress.passed'), value: progress.overview.practicePassedSessions },
                  { label: t('profile.stats.streak'), value: `${progress.overview.currentStreakDays}d` },
                  { label: t('profile.progress.mock'), value: progress.overview.completedMockSessions },
                ].map(s => (
                  <div key={s.label} className="rounded-[22px] bg-[#F8FAFC] px-4 py-4 dark:bg-[#0f1117]">
                    <p className="font-mono text-2xl font-bold text-[#111111] dark:text-[#e2e8f3]">{s.value}</p>
                    <p className="mt-1 text-xs text-[#666666] dark:text-[#7e93b0]">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Company readiness + Mock sessions */}
          {progress && (readiness.length > 0 || (progress.mockSessions && progress.mockSessions.length > 0)) && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              {readiness.length > 0 && (
                <div className="section-enter rounded-[28px] border border-[#CBCCC9] bg-white p-5 dark:border-[#1a2540] dark:bg-[#161c2d]">
                  <h3 className="text-sm font-semibold text-[#111111] dark:text-[#e2e8f3]">{t('profile.progress.companyReadiness')}</h3>
                  <p className="mb-4 mt-1 text-xs text-[#94a3b8]">{t('profile.progress.companyReadinessSubtitle')}</p>
                  <div className="space-y-3">
                    {readiness.map(company => (
                      <div key={company.name} className="rounded-[22px] border border-[#e2e8f0] bg-[#f8fafc] p-4 dark:border-[#1e3158] dark:bg-[#0f1117]">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold capitalize text-[#111111] dark:text-[#e2e8f3]">{company.name}</p>
                            <p className="mt-1 text-xs text-[#64748b] dark:text-[#7e93b0]">
                              {t('profile.progress.completedStages', { completed: company.completed, total: Math.max(company.total, 1) })}
                              {company.active > 0 ? ` · ${t('profile.progress.activeCount', { count: company.active })}` : ''}
                            </p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            company.tone === 'success' ? 'bg-[#dcfce7] text-[#15803d]' : company.tone === 'warning' ? 'bg-[#fef3c7] text-[#b45309]' : 'bg-[#fee2e2] text-[#dc2626]'
                          }`}>
                            {company.percent}%
                          </span>
                        </div>
                        <div className="mt-3 h-2.5 rounded-full bg-white dark:bg-[#161c2d]">
                          <div
                            className={`h-2.5 rounded-full ${company.tone === 'success' ? 'bg-[#22c55e]' : company.tone === 'warning' ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'}`}
                            style={{ width: `${company.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {progress.mockSessions && progress.mockSessions.length > 0 && (
                <div className="section-enter rounded-[28px] border border-[#CBCCC9] bg-white p-5 dark:border-[#1a2540] dark:bg-[#161c2d]">
                  <h3 className="text-sm font-semibold text-[#111111] dark:text-[#e2e8f3]">{t('profile.progress.latestMocks')}</h3>
                  <p className="mt-1 mb-3 text-xs text-[#94a3b8]">{t('profile.progress.latestMocksSubtitle')}</p>
                  <div className="flex flex-col gap-2">
                    {progress.mockSessions.map(s => {
                      const isActive = s.status === 'active'
                      const stageKindLabel: Record<string, string> = {
                        coding: t('profile.stage.coding'), slices: t('profile.stage.algorithms'), concurrency: t('profile.stage.coding'),
                        sql: 'SQL', architecture: t('profile.stage.codeReview'), system_design: t('profile.stage.systemDesign'),
                      }
                      const kindLabel = stageKindLabel[s.currentStageKind] ?? s.currentStageKind
                      const stageNum = Math.min(s.currentStageIndex + 1, s.totalStages || 1)
                      return (
                        <button
                          key={s.id}
                          onClick={() => navigate(`/growth/interview-prep/mock/${s.id}`)}
                          className="flex w-full items-center gap-3 rounded-[22px] border border-[#e2e8f0] bg-[#F8FAFC] px-4 py-3 text-left transition-colors hover:bg-[#eef2ff] dark:border-[#1e3158] dark:bg-[#0f1117] dark:hover:bg-[#1a2540]"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <span className="text-sm font-semibold capitalize text-[#111111] dark:text-[#e2e8f3]">{s.companyTag}</span>
                              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${isActive ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#E7E8E5] text-[#666666] dark:bg-[#1e3158] dark:text-[#94a3b8]'}`}>
                                {isActive ? t('profile.progress.inProgress') : t('profile.progress.completed')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
                              {s.totalStages > 0 && (
                                <>
                                  <span>{t('profile.progress.stageOf', { current: stageNum, total: s.totalStages })}</span>
                                  {kindLabel && <><span>·</span><span>{kindLabel}</span></>}
                                </>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#94a3b8]" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {(!progress || (progress.competencies.length === 0 && readiness.length === 0)) && (
            <div className="section-enter flex flex-col items-center rounded-[28px] border border-[#CBCCC9] bg-white p-12 text-center dark:border-[#1a2540] dark:bg-[#161c2d]">
              <Zap className="mb-3 h-8 w-8 text-[#CBCCC9]" />
              <p className="text-sm text-[#94a3b8]">{t('profile.progress.empty')}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="section-enter bg-white rounded-[28px] border border-[#CBCCC9] p-5 dark:border-[#1a2540] dark:bg-[#161c2d]">
          {achievements.length > 0 ? (
            <AchievementBadges achievements={achievements} />
          ) : (
            <div className="flex flex-col items-center py-10 text-center">
              <Trophy className="w-8 h-8 text-[#CBCCC9] mb-3" />
              <p className="text-sm text-[#94a3b8]">{t('profile.achievements.empty')}</p>
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
      <Modal
        open={editMode}
        onClose={() => setEditMode(false)}
        title={t('profile.editModal.title')}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditMode(false)} className="justify-center sm:min-w-[120px]">
              {t('common.cancel')}
            </Button>
            <Button variant="orange" size="sm" onClick={saveEdit} loading={saving} className="justify-center sm:min-w-[140px]">
              <Check className="w-3.5 h-3.5" /> {t('profile.editModal.save')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label={t('profile.editModal.firstName')} value={editFirstName} onChange={e => setEditFirstName(e.target.value)} />
            <Input label={t('profile.editModal.lastName')} value={editLastName} onChange={e => setEditLastName(e.target.value)} />
          </div>
          <Input
            label={t('profile.editModal.workplace')}
            value={editWorkplace}
            onChange={e => setEditWorkplace(e.target.value)}
            placeholder={t('profile.editModal.workplacePlaceholder')}
          />
          <Input
            label={t('profile.editModal.region')}
            value={editRegion}
            onChange={e => setEditRegion(e.target.value)}
            placeholder={t('profile.editModal.regionPlaceholder')}
          />
        </div>
      </Modal>

      {/* Telegram code modal */}
      <Modal
        open={showTgCodeModal}
        onClose={() => { setShowTgCodeModal(false); setTgCode('') }}
        title={t('profile.telegramModal.title')}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => { setShowTgCodeModal(false); setTgCode('') }}>{t('common.cancel')}</Button>
            <Button variant="orange" size="sm" onClick={submitTgCode} loading={submittingTgCode} disabled={!tgCode.trim()}>{t('common.confirm')}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[#666666] dark:text-[#7e93b0]">
            {t('profile.telegramModal.body')}
          </p>
          <Input
            label={t('profile.telegramModal.code')}
            value={tgCode}
            onChange={e => setTgCode(e.target.value)}
            placeholder={t('profile.telegramModal.codePlaceholder')}
            onKeyDown={e => { if (e.key === 'Enter') submitTgCode() }}
          />
        </div>
      </Modal>
    </div>
  )
}
