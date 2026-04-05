import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MapPin, Calendar, Briefcase, Edit3, Trophy, Zap } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { authApi } from '@/features/Auth/api/authApi'
import type { User, ProfileProgress } from '@/entities/User/model/types'
import { Avatar } from '@/shared/ui/Avatar'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'

function formatJoinDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) } catch { return '' }
}

export function ProfilePage() {
  const { userId } = useParams()
  const { user: authUser } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  const [progress, setProgress] = useState<ProfileProgress | null>(null)
  const [loading, setLoading] = useState(true)

  const targetId = userId ?? authUser?.id ?? ''
  const isOwn = !userId || userId === authUser?.id

  useEffect(() => {
    if (!targetId) return
    Promise.all([
      authApi.getProfileById(targetId),
      authApi.getProfileProgress(targetId),
    ])
      .then(([p, prog]) => { setUser(p.user); setProgress(prog) })
      .catch(() => { if (authUser) setUser(authUser) })
      .finally(() => setLoading(false))
  }, [targetId])

  if (loading) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="bg-white rounded-2xl border border-[#CBCCC9] p-5 h-[100px]" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-[#CBCCC9] h-20" />)}
        </div>
      </div>
    )
  }

  if (!user) return (
    <div className="flex items-center justify-center h-64 text-[#94a3b8] text-sm">Профиль не найден</div>
  )

  const displayName = `${user.firstName} ${user.lastName}`.trim() || user.username

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Profile header */}
      <Card padding="none">
        <div className="flex items-start gap-5 p-5 border-b border-[#CBCCC9]">
          <Avatar name={displayName} src={user.avatarUrl || undefined} size="xl" className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-[#111111]">{displayName}</h1>
              {user.isTrusted && <Badge variant="info">Trusted</Badge>}
              {user.isAdmin && <Badge variant="warning">Admin</Badge>}
            </div>
            {user.username && <p className="text-sm text-[#666666] mt-0.5">@{user.username}</p>}
            <div className="flex items-center gap-4 mt-2 flex-wrap">
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
            <div className="flex items-center gap-2 mt-3">
              {user.connectedProviders.includes('telegram') && (
                <Badge className="bg-[#e8f4fd] text-[#0088cc]">TG</Badge>
              )}
              {user.connectedProviders.includes('yandex') && (
                <Badge className="bg-[#fffbeb] text-[#f59e0b]">YA</Badge>
              )}
            </div>
          </div>
          {isOwn && (
            <Button variant="secondary" size="sm" className="flex-shrink-0">
              <Edit3 className="w-3.5 h-3.5" /> Редактировать
            </Button>
          )}
        </div>
      </Card>

      {/* Stats */}
      {progress && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Сессий', value: progress.overview.practiceSessions, icon: <Zap className="w-4 h-4 text-[#FF8400]" /> },
            { label: 'Пройдено', value: progress.overview.practicePassedSessions, icon: <Trophy className="w-4 h-4 text-[#22c55e]" /> },
            { label: 'Стрик', value: `${progress.overview.currentStreakDays}д`, icon: <Zap className="w-4 h-4 text-[#f59e0b]" /> },
            { label: 'Mock', value: progress.overview.completedMockSessions, icon: <Briefcase className="w-4 h-4 text-[#6366f1]" /> },
          ].map(s => (
            <Card key={s.label} padding="md" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F2F3F0] flex items-center justify-center">{s.icon}</div>
              <div>
                <p className="text-xl font-bold text-[#111111] leading-none">{s.value}</p>
                <p className="text-xs text-[#666666] mt-0.5">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-4">
        {/* Left column */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Companies */}
          {progress && progress.companies.length > 0 && (
            <Card padding="md">
              <h3 className="text-sm font-semibold text-[#111111] mb-3">Компании</h3>
              <div className="flex flex-wrap gap-2">
                {progress.companies.map(c => (
                  <div key={c.tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F2F3F0] rounded-lg">
                    <span className="text-sm font-medium text-[#111111]">{c.tag}</span>
                    <span className="text-xs text-[#666666]">×{c.sessions}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Checkpoints */}
          {progress && progress.checkpoints.length > 0 && (
            <Card padding="md">
              <h3 className="text-sm font-semibold text-[#111111] mb-3">Прогресс</h3>
              <div className="flex flex-col gap-2">
                {progress.checkpoints.map((cp, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${cp.done ? 'bg-[#22c55e]' : 'bg-[#E7E8E5]'}`}>
                      {cp.done && <span className="text-[8px] text-white">✓</span>}
                    </div>
                    <span className={`text-sm ${cp.done ? 'text-[#111111]' : 'text-[#94a3b8]'}`}>{cp.title}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="w-[300px] flex-shrink-0 flex flex-col gap-3">
          {/* League */}
          <Card padding="md" dark orangeBorder>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-[#FF8400]" />
              <h3 className="text-sm font-semibold text-[#CBCCC9]">Лига</h3>
            </div>
            <p className="font-mono text-2xl font-bold text-[#FF8400]">Gold</p>
            <p className="text-xs text-[#666666] mt-1">Топ 15% пользователей</p>
          </Card>

          {/* Recommendations */}
          {progress && progress.recommendations.length > 0 && (
            <Card padding="md">
              <h3 className="text-sm font-semibold text-[#111111] mb-2">Рекомендации</h3>
              <ul className="space-y-1.5">
                {progress.recommendations.slice(0, 3).map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#666666]">
                    <span className="text-[#FF8400] mt-0.5">→</span>
                    {r}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
