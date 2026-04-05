import { useEffect, useState } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { Avatar } from '@/shared/ui/Avatar'
import { apiClient } from '@/shared/api/base'

const TABS = [
  { id: 'code-rooms', label: 'Code Rooms', href: '/practice/code-rooms' },
  { id: 'arena', label: 'Arena', href: '/practice/arena' },
  { id: 'solo', label: 'Solo Practice', href: '/practice/solo' },
]

interface LeaderboardUser {
  userId: string
  username: string
  avatarUrl?: string
  wins: number
}


export function PracticeHubPage() {
  const location = useLocation()
  const active = TABS.find(t => location.pathname.startsWith(t.href))?.id ?? 'code-rooms'

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
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-0 bg-[#F2F3F0]">
        {/* Page heading */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-[#111111]">Practice</h1>
            <p className="text-sm text-[#666666] mt-0.5">Практикуйся и соревнуйся с другими</p>
          </div>
        </div>

        {/* Leaderboard row */}
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-[#111111] mb-3">Топ игроков</h2>
          {leadersLoading ? (
            <div className="flex gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-[#CBCCC9] animate-pulse w-40 h-12" />
              ))}
            </div>
          ) : leaders.length > 0 ? (
            <div className="flex gap-3 flex-wrap">
              {leaders.map((u, idx) => (
                <div
                  key={u.userId}
                  className="flex items-center gap-2.5 px-4 py-2 bg-white rounded-xl border border-[#CBCCC9]"
                >
                  <span className="text-xs font-mono font-bold text-[#6366F1] w-4 text-center">{idx + 1}</span>
                  <Avatar name={u.username} src={u.avatarUrl} size="xs" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#111111] truncate">{u.username}</p>
                    <p className="text-[10px] text-[#666666]">{u.wins} побед</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#666666]">Пока нет данных о лидерах</p>
          )}
        </div>

        {/* Pill tabs for mode selection */}
        <div className="flex items-center gap-1 p-1 bg-[#E7E8E5] border border-[#CBCCC9] rounded-full w-fit">
          {TABS.map(tab => (
            <Link
              key={tab.id}
              to={tab.href}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-full transition-colors',
                active === tab.id ? 'bg-white text-[#111111] shadow-sm' : 'text-[#666666] hover:text-[#111111]'
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  )
}
