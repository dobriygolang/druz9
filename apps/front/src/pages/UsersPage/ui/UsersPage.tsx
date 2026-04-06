import { useEffect, useState, useCallback } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ChevronRight, MapPin, X, ExternalLink } from 'lucide-react'
import { Avatar } from '@/shared/ui/Avatar'
import { Button } from '@/shared/ui/Button'
import { ErrorState } from '@/shared/ui/ErrorState'
import { geoApi, type CommunityPoint } from '@/features/Geo/api/geoApi'

const STATUS_COLORS: Record<string, string> = {
  online: 'bg-[#22c55e]',
  recently_active: 'bg-[#f59e0b]',
  offline: 'bg-[#94a3b8]',
}

const STATUS_LABELS: Record<string, string> = {
  online: 'Онлайн',
  recently_active: 'Недавно был',
  offline: 'Оффлайн',
}

function UserMiniProfile({ user, onClose, onNavigate }: {
  user: CommunityPoint
  onClose: () => void
  onNavigate: () => void
}) {
  const name = `${user.firstName} ${user.lastName}`.trim()
  const status = user.activityStatus ?? 'offline'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-[#1e293b]/40 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer — slides from right */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[320px] bg-white shadow-modal flex flex-col animate-modal-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] transition-colors z-10"
        >
          <X className="w-4 h-4 text-[#94a3b8]" />
        </button>

        {/* Header gradient */}
        <div className="bg-gradient-to-br from-[#6366F1]/10 to-[#8b5cf6]/5 pt-10 pb-6 px-6 flex flex-col items-center text-center border-b border-[#f1f5f9]">
          <div className="relative mb-3">
            <Avatar name={name} src={user.avatarUrl || undefined} size="xl" />
            <span
              className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${STATUS_COLORS[status] ?? STATUS_COLORS.offline}`}
            />
          </div>
          <h2 className="text-base font-bold text-[#111111]">{name}</h2>
          <p className="text-sm text-[#94a3b8] mt-0.5">@{user.username}</p>
          <span className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            status === 'online' ? 'bg-[#e8f9ef] text-[#166534]' :
            status === 'recently_active' ? 'bg-[#fef3c7] text-[#92400e]' :
            'bg-[#f1f5f9] text-[#94a3b8]'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[status] ?? STATUS_COLORS.offline}`} />
            {STATUS_LABELS[status] ?? 'Оффлайн'}
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 px-6 py-5 flex flex-col gap-3">
          {user.region && (
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-[#f0f0ff] flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-[#6366F1]" />
              </div>
              <div>
                <p className="text-[10px] text-[#94a3b8] uppercase tracking-wide font-medium">Регион</p>
                <p className="text-sm font-medium text-[#111111]">{user.region}</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          <Button
            variant="orange"
            size="md"
            className="w-full justify-center"
            onClick={onNavigate}
          >
            <ExternalLink className="w-4 h-4" />
            Перейти в профиль
          </Button>
        </div>
      </div>
    </>
  )
}

export function UsersPage() {
  const navigate = useNavigate()
  const { search = '' } = useOutletContext<{ search: string }>()
  const [users, setUsers] = useState<CommunityPoint[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<CommunityPoint | null>(null)

  const fetchUsers = useCallback(() => {
    setError(null)
    geoApi.getCommunity()
      .then(setUsers)
      .catch(() => setError('Не удалось загрузить данные'))
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchUsers() }} />

  const filtered = users.filter(u => {
    if (!search) return true
    const name = `${u.firstName} ${u.lastName} ${u.username}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  return (
    <>
      <div className="px-6 pt-4 pb-6 flex flex-col gap-2">
        {filtered.map((user) => {
          const name = `${user.firstName} ${user.lastName}`.trim()
          return (
            <div
              key={user.userId}
              onClick={() => setSelectedUser(user)}
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

      {selectedUser && (
        <UserMiniProfile
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onNavigate={() => {
            setSelectedUser(null)
            navigate(`/profile/${selectedUser.userId}`)
          }}
        />
      )}
    </>
  )
}
