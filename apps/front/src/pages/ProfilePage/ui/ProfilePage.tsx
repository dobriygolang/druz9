import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { MapPin, Calendar, Briefcase, Edit3, Trophy, Zap, Swords } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { authApi } from '@/features/Auth/api/authApi'
import type { User, ProfileProgress } from '@/entities/User/model/types'
import { Avatar } from '@/shared/ui/Avatar'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { ErrorState } from '@/shared/ui/ErrorState'
import { apiClient } from '@/shared/api/base'

function formatJoinDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) } catch { return '' }
}

/* ── ELO Ring SVG ──────────────────────────────────────────── */
function EloRing({ rating, league }: { rating: number; league: string }) {
  const size = 120
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const maxElo = 3000
  const progress = Math.min(rating / maxElo, 1)
  const offset = circumference * (1 - progress)

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={stroke}
        />
        {/* Foreground ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#FF8400"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-700"
        />
        {/* Rating number */}
        <text
          x={size / 2}
          y={size / 2 - 6}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-[#FF8400]"
          style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '22px', fontWeight: 700 }}
        >
          {rating}
        </text>
        {/* League label */}
        <text
          x={size / 2}
          y={size / 2 + 16}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-[#94a3b8]"
          style={{ fontSize: '11px', fontWeight: 500 }}
        >
          {league}
        </text>
      </svg>
    </div>
  )
}

/* ── Skill Radar Chart SVG ─────────────────────────────────── */
const SKILL_LABELS = ['Go', 'SQL', 'System Design', 'Algorithms', 'Behavioral']

function SkillRadar({ values }: { values: number[] }) {
  const size = 200
  const cx = size / 2
  const cy = size / 2
  const maxR = 80
  const sides = 5
  const angleStep = (2 * Math.PI) / sides
  const offset = -Math.PI / 2

  function point(i: number, r: number): [number, number] {
    const angle = offset + i * angleStep
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
  }

  // Background pentagon outlines
  const levels = [0.25, 0.5, 0.75, 1]
  const gridLines = levels.map(l => {
    const pts = Array.from({ length: sides }, (_, i) => point(i, maxR * l))
    return pts.map(p => p.join(',')).join(' ')
  })

  // Axis lines
  const axes = Array.from({ length: sides }, (_, i) => point(i, maxR))

  // Data polygon
  const dataPoints = values.map((v, i) => point(i, maxR * Math.min(v, 1)))
  const dataPoly = dataPoints.map(p => p.join(',')).join(' ')

  // Label positions (pushed slightly outward)
  const labelPts = Array.from({ length: sides }, (_, i) => point(i, maxR + 20))

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid polygons */}
      {gridLines.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="#CBCCC9" strokeWidth={0.5} />
      ))}
      {/* Axis lines */}
      {axes.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="#CBCCC9" strokeWidth={0.5} />
      ))}
      {/* Data area */}
      <polygon points={dataPoly} fill="#FF8400" fillOpacity={0.2} stroke="#FF8400" strokeWidth={1.5} />
      {/* Data dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3} fill="#FF8400" />
      ))}
      {/* Labels */}
      {labelPts.map((p, i) => (
        <text
          key={i}
          x={p[0]}
          y={p[1]}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-[#666666]"
          style={{ fontSize: '10px', fontWeight: 500 }}
        >
          {SKILL_LABELS[i]}
        </text>
      ))}
    </svg>
  )
}

/* ── Arena stats types ─────────────────────────────────────── */
interface ArenaStats {
  rating: number
  league: string
  wins: number
  losses: number
  matches: number
  win_rate: number
}

/* ── Main component ────────────────────────────────────────── */
export function ProfilePage() {
  const { userId } = useParams()
  const { user: authUser } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  const [progress, setProgress] = useState<ProfileProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [arenaStats, setArenaStats] = useState<ArenaStats | null>(null)

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

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Fetch arena stats
  useEffect(() => {
    if (!targetId) return
    apiClient
      .get(`/api/v1/arena/stats/${targetId}`)
      .then(res => {
        const s = res.data?.stats ?? res.data
        if (s && typeof s.rating === 'number') setArenaStats(s)
      })
      .catch(() => {})
  }, [targetId])

  // Skill values (placeholder)
  const skillValues = [0.7, 0.5, 0.6, 0.8, 0.45]

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchProfile() }} />

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

      {/* Stats grid */}
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

      {/* Arena stats row */}
      {arenaStats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Побед', value: arenaStats.wins, icon: <Trophy className="w-4 h-4 text-[#FF8400]" /> },
            { label: 'Поражений', value: arenaStats.losses, icon: <Swords className="w-4 h-4 text-[#ef4444]" /> },
            { label: 'Матчей', value: arenaStats.matches, icon: <Swords className="w-4 h-4 text-[#6366f1]" /> },
            { label: 'Winrate', value: `${Math.round(arenaStats.win_rate * 100)}%`, icon: <Zap className="w-4 h-4 text-[#22c55e]" /> },
          ].map(s => (
            <Card key={s.label} padding="md" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F2F3F0] flex items-center justify-center">{s.icon}</div>
              <div>
                <p className="text-xl font-bold text-[#111111] font-mono leading-none">{s.value}</p>
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
                    <span className="text-xs text-[#666666]">&times;{c.sessions}</span>
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
                      {cp.done && <span className="text-[8px] text-white">&#10003;</span>}
                    </div>
                    <span className={`text-sm ${cp.done ? 'text-[#111111]' : 'text-[#94a3b8]'}`}>{cp.title}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Skill Radar */}
          <Card padding="md">
            <h3 className="text-sm font-semibold text-[#111111] mb-3">Навыки</h3>
            <div className="flex justify-center">
              <SkillRadar values={skillValues} />
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="w-[300px] flex-shrink-0 flex flex-col gap-3">
          {/* League with ELO ring */}
          <Card padding="md" dark orangeBorder>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-[#FF8400]" />
              <h3 className="text-sm font-semibold text-[#CBCCC9]">Лига</h3>
            </div>
            {arenaStats ? (
              <EloRing rating={arenaStats.rating} league={arenaStats.league} />
            ) : (
              <>
                <p className="font-mono text-2xl font-bold text-[#FF8400]">--</p>
                <p className="text-xs text-[#666666] mt-1">Нет данных арены</p>
              </>
            )}
          </Card>

          {/* Recommendations */}
          {progress && progress.recommendations.length > 0 && (
            <Card padding="md">
              <h3 className="text-sm font-semibold text-[#111111] mb-2">Рекомендации</h3>
              <ul className="space-y-1.5">
                {progress.recommendations.slice(0, 3).map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#666666]">
                    <span className="text-[#FF8400] mt-0.5">&rarr;</span>
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
