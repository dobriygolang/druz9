import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { MapPin, Calendar, Briefcase, Edit3, Trophy, Zap, Swords, X, Check, Flame } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { authApi } from '@/features/Auth/api/authApi'
import type { User, ProfileProgress } from '@/entities/User/model/types'
import { Avatar } from '@/shared/ui/Avatar'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
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
  win_rate: number
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
  const { user: authUser } = useAuth()
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

  const targetId = userId ?? authUser?.id ?? ''
  const isOwn = !userId || userId === authUser?.id

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
        if (authUser) setUser(authUser)
        else setError('Не удалось загрузить данные')
      })
      .finally(() => setLoading(false))
  }, [targetId, authUser])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  useEffect(() => {
    if (!targetId) return
    apiClient.get(`/api/v1/arena/stats/${targetId}`)
      .then(res => {
        const s = res.data?.stats ?? res.data
        if (s && typeof s.rating === 'number') setArenaStats(s)
      })
      .catch(() => {})
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
          unlocked_at: a.unlocked_at ?? a.UnlockedAt,
        })))
      })
      .catch(() => {})
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
      .catch(() => {})
  }, [targetId])

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
      <div className="p-4 md:p-6 animate-pulse space-y-3">
        <div className="bg-white rounded-2xl border border-[#CBCCC9] h-[140px]" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-[#CBCCC9] h-16" />)}
        </div>
        <div className="bg-white rounded-2xl border border-[#CBCCC9] h-[200px]" />
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

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 max-w-3xl mx-auto w-full">
      {/* Hero card */}
      <div className="bg-white rounded-2xl border border-[#CBCCC9] overflow-hidden">
        {/* Top accent strip */}
        <div className="h-1.5 bg-gradient-to-r from-[#6366F1] via-[#818CF8] to-[#a78bfa]" />
        <div className="p-5 flex items-start gap-4">
          <Avatar name={displayName} src={user.avatarUrl || undefined} size="xl" className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold text-[#111111]">{displayName}</h1>
                  {user.isTrusted && <Badge variant="info">Trusted</Badge>}
                  {user.isAdmin && <Badge variant="warning">Admin</Badge>}
                </div>
                {user.username && <p className="text-xs text-[#94a3b8] mt-0.5">@{user.username}</p>}
              </div>
              {isOwn && (
                <Button variant="secondary" size="sm" className="flex-shrink-0" onClick={openEdit}>
                  <Edit3 className="w-3.5 h-3.5" /> Изменить
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
              {user.region && (
                <span className="flex items-center gap-1 text-xs text-[#666666]">
                  <MapPin className="w-3 h-3" /> {user.region}
                </span>
              )}
              {user.currentWorkplace && (
                <span className="flex items-center gap-1 text-xs text-[#666666]">
                  <Briefcase className="w-3 h-3" /> {user.currentWorkplace}
                </span>
              )}
              {user.createdAt && (
                <span className="flex items-center gap-1 text-xs text-[#666666]">
                  <Calendar className="w-3 h-3" /> С {formatJoinDate(user.createdAt)}
                </span>
              )}
            </div>

            {(user.connectedProviders.includes('telegram') || user.connectedProviders.includes('yandex')) && (
              <div className="flex items-center gap-1.5 mt-2.5">
                {user.connectedProviders.includes('telegram') && (
                  <span className="px-2 py-0.5 bg-[#e8f4fd] text-[#0088cc] text-[11px] font-medium rounded-full">Telegram</span>
                )}
                {user.connectedProviders.includes('yandex') && (
                  <span className="px-2 py-0.5 bg-[#fffbeb] text-[#f59e0b] text-[11px] font-medium rounded-full">Яндекс</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats strip */}
        {stats.length > 0 && (
          <div className="border-t border-[#F2F3F0] grid divide-x divide-[#F2F3F0]" style={{ gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}>
            {stats.map(s => (
              <div key={s.label} className="flex flex-col items-center justify-center gap-0.5 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>
                    {s.icon}
                  </div>
                  <span className="text-base font-bold text-[#111111] font-mono">{s.value}</span>
                </div>
                <span className="text-[11px] text-[#94a3b8]">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F2F3F0] p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-white text-[#111111] shadow-sm'
                : 'text-[#666666] dark:text-[#4d6380] hover:text-[#111111] dark:hover:text-[#e2e8f3]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-2xl border border-[#CBCCC9] p-5">
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
                  { label: 'Winrate', value: `${Math.round(arenaStats.win_rate * 100)}%` },
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
            <div className="bg-white rounded-2xl border border-[#CBCCC9] p-5">
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

          {progress && progress.companies.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#CBCCC9] p-5">
              <h3 className="text-sm font-semibold text-[#111111] mb-3">Компании</h3>
              <div className="flex flex-wrap gap-2">
                {progress.companies.map(c => (
                  <div key={c.tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F3F0] rounded-lg">
                    <span className="text-sm font-medium text-[#111111]">{c.tag}</span>
                    <span className="text-xs text-[#94a3b8]">&times;{c.sessions}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {progress && progress.checkpoints.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#CBCCC9] p-5">
              <h3 className="text-sm font-semibold text-[#111111] mb-3">Прогресс</h3>
              <div className="flex flex-col gap-2">
                {progress.checkpoints.map((cp, i) => (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${cp.done ? 'bg-[#22c55e]' : 'bg-[#E7E8E5]'}`}>
                      {cp.done && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-sm ${cp.done ? 'text-[#111111]' : 'text-[#94a3b8]'}`}>{cp.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {progress && progress.recommendations.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#CBCCC9] p-5">
              <h3 className="text-sm font-semibold text-[#111111] mb-3">Рекомендации</h3>
              <ul className="space-y-2">
                {progress.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#475569]">
                    <span className="text-[#6366F1] mt-0.5 flex-shrink-0">&rarr;</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(!progress || (progress.companies.length === 0 && progress.checkpoints.length === 0)) && (
            <div className="bg-white rounded-2xl border border-[#CBCCC9] p-12 flex flex-col items-center text-center">
              <Zap className="w-8 h-8 text-[#CBCCC9] mb-3" />
              <p className="text-sm text-[#94a3b8]">Данных о прогрессе пока нет</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="bg-white rounded-2xl border border-[#CBCCC9] p-5">
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
      {editMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl border border-[#CBCCC9] w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-[#111111]">Редактировать профиль</h2>
              <button onClick={() => setEditMode(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F3F0] text-[#666666]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#666666] mb-1 block">Имя</label>
                  <input value={editFirstName} onChange={e => setEditFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#CBCCC9] rounded-lg focus:outline-none focus:border-[#6366F1]" />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#666666] mb-1 block">Фамилия</label>
                  <input value={editLastName} onChange={e => setEditLastName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#CBCCC9] rounded-lg focus:outline-none focus:border-[#6366F1]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#666666] mb-1 block">Место работы</label>
                <input value={editWorkplace} onChange={e => setEditWorkplace(e.target.value)}
                  placeholder="Компания"
                  className="w-full px-3 py-2 text-sm border border-[#CBCCC9] rounded-lg focus:outline-none focus:border-[#6366F1]" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#666666] mb-1 block">Регион</label>
                <input value={editRegion} onChange={e => setEditRegion(e.target.value)}
                  placeholder="Москва, Санкт-Петербург..."
                  className="w-full px-3 py-2 text-sm border border-[#CBCCC9] rounded-lg focus:outline-none focus:border-[#6366F1]" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="secondary" size="sm" onClick={() => setEditMode(false)} className="flex-1 justify-center">
                Отмена
              </Button>
              <Button variant="orange" size="sm" onClick={saveEdit} loading={saving} className="flex-1 justify-center">
                <Check className="w-3.5 h-3.5" /> Сохранить
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
