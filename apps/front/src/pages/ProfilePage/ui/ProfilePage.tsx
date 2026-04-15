import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, Calendar, Briefcase, Edit3, Trophy, Zap, Swords, Flame, ChevronRight, Check } from 'lucide-react'
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
import { apiClient } from '@/shared/api/base'

function formatJoinDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) } catch { return '' }
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
  if (rating < 1000) return 'Бронза'
  if (rating < 1500) return 'Серебро'
  if (rating < 2000) return 'Золото'
  if (rating < 2500) return 'Платина'
  return 'Алмаз'
}

type Tab = 'activity' | 'progress' | 'achievements'

export function ProfilePage() {
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
        else setError('Не удалось загрузить данные')
      })
      .finally(() => setLoading(false))
  }, [targetId])

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
      setBindError('Не удалось открыть Telegram. Попробуйте ещё раз.')
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
      toast('Telegram привязан', 'success')
    } catch {
      toast('Неверный код. Проверьте и попробуйте снова.', 'error')
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
      setBindError('Не удалось открыть Яндекс. Попробуйте ещё раз.')
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
    <div className="flex items-center justify-center h-64 text-[#94a3b8] text-sm">Профиль не найден</div>
  )

  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.username

  const stats = [
    ...(progress ? [
      { label: 'Сессий', value: progress.overview.practiceSessions, icon: <Zap className="w-3.5 h-3.5 text-[#6366F1]" />, bg: '#EEF2FF' },
      { label: 'Стрик', value: `${progress.overview.currentStreakDays}д`, icon: <Flame className="w-3.5 h-3.5 text-[#f59e0b]" />, bg: '#FFFBEB' },
    ] : []),
    ...(arenaStats ? [
      { label: 'Рейтинг', value: arenaStats.rating, icon: <Trophy className="w-3.5 h-3.5 text-[#6366F1]" />, bg: '#EEF2FF' },
      { label: 'Побед', value: arenaStats.wins, icon: <Swords className="w-3.5 h-3.5 text-[#22c55e]" />, bg: '#F0FDF4' },
    ] : []),
  ]

  const tabs: { id: Tab; label: string }[] = [
    { id: 'activity', label: 'Активность' },
    { id: 'progress', label: 'Прогресс' },
    { id: 'achievements', label: 'Достижения' },
  ]
  const statsGridClass = stats.length > 2 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pb-6 pt-4 md:gap-5 md:p-6">
      <section className="section-enter relative overflow-hidden rounded-[32px] border border-[#d8d9d6] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(238,242,255,0.94)_44%,_rgba(255,247,237,0.92))] shadow-[0_22px_52px_rgba(15,23,42,0.08)] dark:border-[#1a2540] dark:bg-[linear-gradient(145deg,_rgba(22,28,45,0.98),_rgba(19,25,41,0.92)_52%,_rgba(42,32,10,0.42))]">
        <div className="pointer-events-none absolute inset-y-0 right-[-12%] w-[46%] rounded-full bg-[radial-gradient(circle,_rgba(99,102,241,0.24),_transparent_70%)] blur-3xl dark:bg-[radial-gradient(circle,_rgba(129,140,248,0.18),_transparent_72%)]" />
        <div className="relative p-5 md:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <Avatar
              name={displayName}
              src={user.avatarUrl || undefined}
              size="xl"
              className="ring-4 ring-white/80 shadow-[0_16px_32px_rgba(15,23,42,0.12)] dark:ring-[#121b30]"
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6366F1] dark:text-[#a5b4fc]">
                    Profile
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold text-[#111111] dark:text-[#f8fafc]">{displayName}</h1>
                    {user.isTrusted && <Badge variant="info">Trusted</Badge>}
                    {user.isAdmin && <Badge variant="warning">Admin</Badge>}
                  </div>
                  {user.username && <p className="mt-1 text-xs text-[#94a3b8]">@{user.username}</p>}
                </div>

                {isOwn && (
                  <Button variant="secondary" size="sm" className="w-full justify-center rounded-full sm:w-auto" onClick={openEdit}>
                    <Edit3 className="w-3.5 h-3.5" /> Изменить
                  </Button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {user.region && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/76 px-3 py-1 text-xs text-[#475569] backdrop-blur dark:bg-[#10192b]/78 dark:text-[#94a3b8]">
                    <MapPin className="w-3 h-3" /> {user.region}
                  </span>
                )}
                {user.currentWorkplace && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/76 px-3 py-1 text-xs text-[#475569] backdrop-blur dark:bg-[#10192b]/78 dark:text-[#94a3b8]">
                    <Briefcase className="w-3 h-3" /> {user.currentWorkplace}
                  </span>
                )}
                {user.createdAt && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/76 px-3 py-1 text-xs text-[#475569] backdrop-blur dark:bg-[#10192b]/78 dark:text-[#94a3b8]">
                    <Calendar className="w-3 h-3" /> С {formatJoinDate(user.createdAt)}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {user.connectedProviders.includes('telegram') && (
                  <span className="rounded-full bg-[#e8f4fd] px-2.5 py-1 text-[11px] font-medium text-[#0088cc]">Telegram</span>
                )}
                {user.connectedProviders.includes('yandex') && (
                  <span className="rounded-full bg-[#fff7ed] px-2.5 py-1 text-[11px] font-medium text-[#ea580c]">Яндекс</span>
                )}
                {isOwn && !user.connectedProviders.includes('telegram') && (
                  <button
                    onClick={bindTelegram}
                    disabled={!!bindingProvider}
                    className="rounded-full border border-[#0088cc]/20 bg-[#e8f4fd] px-2.5 py-1 text-[11px] font-medium text-[#0088cc] transition-colors hover:bg-[#cce9fa] disabled:opacity-50"
                  >
                    {bindingProvider === 'telegram' ? 'Открываем...' : '+ Привязать Telegram'}
                  </button>
                )}
                {isOwn && !user.connectedProviders.includes('yandex') && (
                  <button
                    onClick={bindYandex}
                    disabled={!!bindingProvider}
                    className="rounded-full border border-[#ea580c]/20 bg-[#fff7ed] px-2.5 py-1 text-[11px] font-medium text-[#ea580c] transition-colors hover:bg-[#ffe4cc] disabled:opacity-50"
                  >
                    {bindingProvider === 'yandex' ? 'Перенаправляем...' : '+ Привязать Яндекс'}
                  </button>
                )}
                {bindError && <span className="text-[11px] text-red-500">{bindError}</span>}
              </div>
            </div>
          </div>
        </div>

        {stats.length > 0 && (
          <div className={`grid ${statsGridClass} gap-px border-t border-[#d8d9d6]/70 bg-[#d8d9d6]/70 dark:border-[#1a2540] dark:bg-[#1a2540]`}>
            {stats.map(s => (
              <div key={s.label} className="flex flex-col items-center justify-center gap-1 bg-white/84 px-4 py-4 backdrop-blur dark:bg-[#10192b]/84">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: s.bg }}>
                    {s.icon}
                  </div>
                  <span className="font-mono text-base font-bold text-[#111111] dark:text-[#f8fafc]">{s.value}</span>
                </div>
                <span className="text-[11px] text-[#94a3b8]">{s.label}</span>
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
        <div className="section-enter bg-white rounded-[28px] border border-[#CBCCC9] p-5 dark:border-[#1a2540] dark:bg-[#161c2d]">
          <h3 className="text-sm font-semibold text-[#111111] mb-4">Активность за год</h3>
          {activity.length > 0 ? (
            <ActivityHeatmap activity={activity} />
          ) : (
            <div className="h-20 bg-[#F2F3F0] rounded-xl flex items-center justify-center">
              <p className="text-xs text-[#94a3b8]">Нет данных об активности</p>
            </div>
          )}

          {arenaStats && (
            <div className="mt-5 pt-5 border-t border-[#F2F3F0]">
              <h3 className="text-sm font-semibold text-[#111111] mb-3">Арена</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Матчей', value: arenaStats.matches },
                  { label: 'Побед', value: arenaStats.wins },
                  { label: 'Поражений', value: arenaStats.losses },
                  { label: 'Winrate', value: `${Math.round(arenaStats.winRate * 100)}%` },
                ].map(s => (
                  <div key={s.label} className="bg-[#F2F3F0] rounded-xl px-3 py-2.5 text-center">
                    <p className="text-lg font-bold text-[#111111] font-mono">{s.value}</p>
                    <p className="text-xs text-[#666666] mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 bg-[#F2F3F0] rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-[#6366F1]"
                    style={{ width: `${Math.min(arenaStats.rating / 3000 * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-[#6366F1] font-mono">{arenaStats.rating} ELO</span>
                <span className="text-xs text-[#94a3b8]">· {computeLeague(arenaStats.rating)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="flex flex-col gap-4">
          {progress && progress.overview.practiceSessions > 0 && (
            <div className="section-enter bg-white rounded-[28px] border border-[#CBCCC9] p-5 dark:border-[#1a2540] dark:bg-[#161c2d]">
              <h3 className="text-sm font-semibold text-[#111111] mb-3">Обзор</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Сессий', value: progress.overview.practiceSessions },
                  { label: 'Пройдено', value: progress.overview.practicePassedSessions },
                  { label: 'Стрик', value: `${progress.overview.currentStreakDays}д` },
                  { label: 'Mock', value: progress.overview.completedMockSessions },
                ].map(s => (
                  <div key={s.label} className="bg-[#F2F3F0] rounded-xl px-3 py-2.5 text-center">
                    <p className="text-lg font-bold text-[#111111] font-mono">{s.value}</p>
                    <p className="text-xs text-[#666666] mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {progress && (
            <div className="section-enter bg-white rounded-[28px] border border-[#CBCCC9] p-5 dark:border-[#1a2540] dark:bg-[#161c2d]">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-sm font-semibold text-[#111111]">Компании</h3>
              </div>
              <p className="text-xs text-[#94a3b8] mb-3">
                Компании, по которым ты проходил mock-интервью. Чтобы добавить — начни сессию в разделе <span className="text-[#6366F1]">Growth Hub</span> и укажи целевую компанию.
              </p>
              {(progress.mockSessions && progress.mockSessions.length > 0) ? (
                <div className="flex flex-col gap-2">
                  {progress.mockSessions.map(s => {
                    const isActive = s.status === 'active'
                    const stageKindLabel: Record<string, string> = {
                      coding: 'Кодинг', slices: 'Алгоритмы', concurrency: 'Кодинг',
                      sql: 'SQL', architecture: 'Code Review', system_design: 'System Design',
                    }
                    const kindLabel = stageKindLabel[s.currentStageKind] ?? s.currentStageKind
                    const stageNum = Math.min(s.currentStageIndex + 1, s.totalStages || 1)
                    return (
                      <button
                        key={s.id}
                        onClick={() => navigate(`/growth/interview-prep/mock/${s.id}`)}
                        className="flex items-center gap-3 px-4 py-3 bg-[#F2F3F0] rounded-xl hover:bg-[#E7E8E5] transition-colors text-left w-full"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-semibold text-[#111111] capitalize">{s.companyTag}</span>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isActive ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#E7E8E5] text-[#666666]'}`}>
                              {isActive ? 'В процессе' : 'Завершено'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
                            {s.totalStages > 0 && (
                              <>
                                <span>Этап {stageNum} из {s.totalStages}</span>
                                {kindLabel && <><span>·</span><span>{kindLabel}</span></>}
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#94a3b8] flex-shrink-0" />
                      </button>
                    )
                  })}
                </div>
              ) : progress.companies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {progress.companies.map(c => (
                    <div key={c} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F3F0] rounded-lg">
                      <span className="text-sm font-medium text-[#111111]">{c}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[#F2F3F0] rounded-lg text-xs text-[#94a3b8]">
                  Пока нет пройденных сессий по компаниям
                </div>
              )}
            </div>
          )}

          {progress && progress.recommendations.length > 0 && (
            <div className="section-enter bg-white rounded-[28px] border border-[#CBCCC9] p-5 dark:border-[#1a2540] dark:bg-[#161c2d]">
              <h3 className="text-sm font-semibold text-[#111111] mb-3">Рекомендации</h3>
              <ul className="space-y-2">
                {progress.recommendations.map((r, i) => {
                  if (typeof r === 'string') {
                    return (
                      <li key={i} className="flex items-start gap-2 text-sm text-[#475569]">
                        <span className="text-[#6366F1] mt-0.5 flex-shrink-0">&rarr;</span>
                        {r}
                      </li>
                    )
                  }
                  return (
                    <li key={r.key ?? i} className="flex items-start gap-2 text-sm text-[#475569]">
                      <span className="text-[#6366F1] mt-0.5 flex-shrink-0">&rarr;</span>
                      <div>
                        {r.title && <span className="font-medium text-[#111111] dark:text-[#f8fafc]">{r.title}</span>}
                        {r.description && <span className="ml-1">{r.description}</span>}
                        {r.href && (
                          <a href={r.href} className="ml-1 text-[#6366F1] underline underline-offset-2">{r.href}</a>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {(!progress || progress.companies.length === 0) && (
            <div className="section-enter bg-white rounded-[28px] border border-[#CBCCC9] p-12 flex flex-col items-center text-center dark:border-[#1a2540] dark:bg-[#161c2d]">
              <Zap className="w-8 h-8 text-[#CBCCC9] mb-3" />
              <p className="text-sm text-[#94a3b8]">Данных о прогрессе пока нет</p>
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
              <p className="text-sm text-[#94a3b8]">Достижения пока не получены</p>
            </div>
          )}
        </div>
      )}

      {/* Edit modal */}
      <Modal
        open={editMode}
        onClose={() => setEditMode(false)}
        title="Редактировать профиль"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditMode(false)} className="justify-center sm:min-w-[120px]">
              Отмена
            </Button>
            <Button variant="orange" size="sm" onClick={saveEdit} loading={saving} className="justify-center sm:min-w-[140px]">
              <Check className="w-3.5 h-3.5" /> Сохранить
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Имя" value={editFirstName} onChange={e => setEditFirstName(e.target.value)} />
            <Input label="Фамилия" value={editLastName} onChange={e => setEditLastName(e.target.value)} />
          </div>
          <Input
            label="Место работы"
            value={editWorkplace}
            onChange={e => setEditWorkplace(e.target.value)}
            placeholder="Компания"
          />
          <Input
            label="Регион"
            value={editRegion}
            onChange={e => setEditRegion(e.target.value)}
            placeholder="Москва, Санкт-Петербург..."
          />
        </div>
      </Modal>

      {/* Telegram code modal */}
      <Modal
        open={showTgCodeModal}
        onClose={() => { setShowTgCodeModal(false); setTgCode('') }}
        title="Введите код из Telegram"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => { setShowTgCodeModal(false); setTgCode('') }}>Отмена</Button>
            <Button variant="orange" size="sm" onClick={submitTgCode} loading={submittingTgCode} disabled={!tgCode.trim()}>Подтвердить</Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[#666666] dark:text-[#7e93b0]">
            Бот отправил вам код в Telegram. Введите его ниже для привязки аккаунта.
          </p>
          <Input
            label="Код"
            value={tgCode}
            onChange={e => setTgCode(e.target.value)}
            placeholder="123456"
            onKeyDown={e => { if (e.key === 'Enter') submitTgCode() }}
          />
        </div>
      </Modal>
    </div>
  )
}
