import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Code2, Swords, Target } from 'lucide-react'
import { Avatar } from '@/shared/ui/Avatar'
import { apiClient } from '@/shared/api/base'


interface LeaderboardUser {
  userId: string
  username: string
  avatarUrl?: string
  wins: number
}


export function PracticeHubPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const [leaders, setLeaders] = useState<LeaderboardUser[]>([])
  const [leadersLoading, setLeadersLoading] = useState(true)

  useEffect(() => {
    apiClient
      .get('/api/v1/code-editor/leaderboard', { params: { limit: 5 } })
      .then(res => {
        const data = res.data?.leaderboard ?? res.data?.users ?? res.data ?? []
        setLeaders(Array.isArray(data) ? data.slice(0, 5) : [])
      })
      .catch(() => setLeaders([]))
      .finally(() => setLeadersLoading(false))
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-0 bg-[#F2F3F0] dark:bg-[#0b0d16]">
        {/* Page heading */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-[#111111] dark:text-[#e2e8f3]">Practice</h1>
            <p className="text-sm text-[#666666] dark:text-[#4d6380] mt-0.5">Практикуйся и соревнуйся с другими</p>
          </div>
        </div>

        {/* Mode cards — also serve as navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {[
            { icon: Code2, title: 'Code Rooms', sub: 'Совместный кодинг', href: '/practice/code-rooms' },
            { icon: Swords, title: 'Arena Duels', sub: '1-на-1 за ELO', href: '/practice/arena' },
            { icon: Target, title: 'Solo Practice', sub: 'В своём темпе', href: '/practice/solo' },
          ].map(f => {
            const Icon = f.icon
            const isAct = location.pathname.startsWith(f.href)
            return (
              <button
                key={f.title}
                onClick={() => navigate(f.href)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-left ${
                  isAct
                    ? 'bg-white dark:bg-[#161c2d] border-[#6366F1] shadow-sm'
                    : 'bg-white dark:bg-[#161c2d] border-[#CBCCC9] dark:border-[#1a2540] hover:border-[#6366F1]/40 hover:shadow-sm'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isAct ? 'bg-[#EEF2FF] dark:bg-[#1e1e4a]' : 'bg-[#F2F3F0] dark:bg-[#1a2236]'}`}>
                  <Icon className="w-4 h-4 text-[#6366F1]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#111111] dark:text-[#c8d8ec] leading-tight">{f.title}</p>
                  <p className="text-xs text-[#666666] dark:text-[#4d6380] leading-tight mt-0.5">{f.sub}</p>
                </div>
                {isAct && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#6366F1] flex-shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* Leaderboard row */}
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-[#111111] dark:text-[#c8d8ec] mb-3">Топ игроков</h2>
          {leadersLoading ? (
            <div className="flex gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#161c2d] rounded-xl border border-[#CBCCC9] dark:border-[#1a2540] animate-pulse w-40 h-12" />
              ))}
            </div>
          ) : leaders.length > 0 ? (
            <div className="flex gap-3 flex-wrap">
              {leaders.map((u, idx) => (
                <div
                  key={u.userId}
                  className="flex items-center gap-2.5 px-4 py-2 bg-white dark:bg-[#161c2d] rounded-xl border border-[#CBCCC9] dark:border-[#1a2540]"
                >
                  <span className="text-xs font-mono font-bold text-[#6366F1] w-4 text-center">{idx + 1}</span>
                  <Avatar name={u.username} src={u.avatarUrl} size="xs" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#111111] dark:text-[#c8d8ec] truncate">{u.username}</p>
                    <p className="text-[10px] text-[#666666] dark:text-[#4d6380]">{u.wins} побед</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#666666] dark:text-[#4d6380]">Пока нет данных о лидерах</p>
          )}
        </div>

      </div>
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  )
}
