import { useEffect, useState, useCallback } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ChevronRight, MapPin } from 'lucide-react'
import { Avatar } from '@/shared/ui/Avatar'
import { ErrorState } from '@/shared/ui/ErrorState'
import { geoApi, type CommunityPoint } from '@/features/Geo/api/geoApi'

const STATUS_COLORS: Record<string, string> = {
  online: 'bg-[#22c55e]',
  recently_active: 'bg-[#f59e0b]',
  offline: 'bg-[#94a3b8]',
}

export function UsersPage() {
  const navigate = useNavigate()
  const { search = '' } = useOutletContext<{ search: string }>()
  const [users, setUsers] = useState<CommunityPoint[]>([])
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(() => {
    setError(null)
    geoApi.getCommunity()
      .then(setUsers)
      .catch(() => setError('Не удалось загрузить данные'))
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchUsers() }} />

  const filtered = users.filter(u => {
    if (!search) return true
    const name = `${u.firstName} ${u.lastName} ${u.username}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  return (
    <div className="px-6 pt-4 pb-6 flex flex-col gap-2">
      {filtered.map((user) => {
        const name = `${user.firstName} ${user.lastName}`.trim()
        return (
          <div
            key={user.userId}
            onClick={() => navigate(`/profile/${user.userId}`)}
            className="stagger-item flex items-center gap-3.5 px-4 py-3 bg-white rounded-xl border border-[#CBCCC9] hover:border-[#6366F1] cursor-pointer transition-colors"
          >
            <div className="relative">
              <Avatar name={name} src={user.avatarUrl || undefined} size="md" />
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${STATUS_COLORS[user.activityStatus] ?? STATUS_COLORS.offline}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#111111]">{name}</p>
                <span className="text-xs text-[#94a3b8]">@{user.username}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {user.region && (
                  <span className="flex items-center gap-1 text-xs text-[#666666]">
                    <MapPin className="w-3 h-3" /> {user.region}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#CBCCC9] flex-shrink-0" />
          </div>
        )
      })}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-[#94a3b8] text-sm">Ничего не найдено</div>
      )}
    </div>
  )
}
