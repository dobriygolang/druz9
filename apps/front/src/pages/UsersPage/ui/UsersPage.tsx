import { useEffect, useState, useCallback } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ChevronRight, MapPin, X, ExternalLink } from 'lucide-react'
import { Avatar } from '@/shared/ui/Avatar'
import { Button } from '@/shared/ui/Button'
import { ErrorState } from '@/shared/ui/ErrorState'
import { geoApi, type CommunityPoint } from '@/features/Geo/api/geoApi'
import { useIsMobile } from '@/shared/hooks/useIsMobile'

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

function UserMiniProfile({ user, onClose, onNavigate, isMobile }: {
  user: CommunityPoint
  onClose: () => void
  onNavigate: () => void
  isMobile: boolean
}) {
  const name = `${user.firstName} ${user.lastName}`.trim()
  const status = user.activityStatus ?? 'offline'

  if (isMobile) {
    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-[#1e293b]/40 animate-fade-in"
          onClick={onClose}
        />

        <div className="fixed inset-x-0 bottom-0 z-50 max-h-[82vh] rounded-t-[30px] bg-white shadow-modal animate-modal-in overflow-hidden flex flex-col">
          <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-[#d7dce5]" />

          <button
            onClick={onClose}
            className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] transition-colors z-10"
          >
            <X className="w-4 h-4 text-[#94a3b8]" />
          </button>

          <div className="bg-gradient-to-br from-[#6366F1]/12 to-[#8b5cf6]/8 px-6 pt-6 pb-5 flex flex-col items-center text-center border-b border-[#f1f5f9]">
            <div className="relative mb-3">
              <Avatar name={name} src={user.avatarUrl || undefined} size="xl" />
              <span
                className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${STATUS_COLORS[status] ?? STATUS_COLORS.offline}`}
              />
            </div>
            <h2 className="text-lg font-bold text-[#111111]">{name}</h2>
            <div className="mt-1 flex flex-col items-center gap-0.5">
              {user.username && <p className="text-sm text-[#94a3b8]">@{user.username}</p>}
              {user.telegramUsername && (
                <p className="text-xs text-[#64748b]">TG: @{user.telegramUsername}</p>
              )}
            </div>
            <span className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              status === 'online' ? 'bg-[#e8f9ef] text-[#166534]' :
              status === 'recently_active' ? 'bg-[#fef3c7] text-[#92400e]' :
              'bg-[#f1f5f9] text-[#94a3b8]'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[status] ?? STATUS_COLORS.offline}`} />
              {STATUS_LABELS[status] ?? 'Оффлайн'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3">
            {user.region && (
              <div className="flex items-center gap-3 text-sm rounded-2xl bg-[#f8fafc] px-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-[#f0f0ff] flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-[#6366F1]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#94a3b8] uppercase tracking-wide font-medium">Регион</p>
                  <p className="text-sm font-medium text-[#111111]">{user.region}</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[#f1f5f9] px-6 pb-6 pt-4 flex flex-col gap-2">
            <Button variant="secondary" size="sm" className="justify-center" onClick={onClose}>
              Закрыть
            </Button>
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
          <div className="flex flex-col items-center gap-0.5 mt-0.5">
            {user.username && <p className="text-sm text-[#94a3b8]">@{user.username}</p>}
            {user.telegramUsername && (
              <p className="text-xs text-[#64748b]">TG: @{user.telegramUsername}</p>
            )}
          </div>
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
  const isMobile = useIsMobile()
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
    const name = `${u.firstName} ${u.lastName} ${u.username} ${u.telegramUsername}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  return (
    <>
      <div className={isMobile ? 'px-4 pt-4 pb-6' : 'px-6 pt-4 pb-6'}>
        {isMobile && (
          <div className="section-enter mb-4 rounded-[28px] border border-[#d8d9d6] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(239,246,255,0.94)_52%,_rgba(255,247,237,0.94))] p-5 shadow-[0_16px_32px_rgba(15,23,42,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6366F1]">People Directory</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-2xl font-bold text-[#111111]">{filtered.length}</p>
                <p className="mt-1 text-sm leading-6 text-[#475569]">Открой карточку и быстро проверь, кто рядом и чем живёт.</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/72 px-4 py-3 text-right shadow-sm backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#667085]">Людей</p>
                <p className="mt-2 font-mono text-xl font-bold text-[#111111]">{users.length}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
        {filtered.map((user) => {
          const name = `${user.firstName} ${user.lastName}`.trim()
          return (
            <div
              key={user.userId}
              onClick={() => setSelectedUser(user)}
              className={`stagger-item flex items-center gap-3.5 px-4 py-3 cursor-pointer transition-colors ${
                isMobile
                  ? 'rounded-[22px] border border-[#d8d9d6] bg-white/94 shadow-[0_10px_24px_rgba(15,23,42,0.05)] active:scale-[0.99]'
                  : 'bg-white rounded-xl border border-[#CBCCC9] hover:border-[#6366F1]'
              }`}
            >
              <div className="relative">
                <Avatar name={name} src={user.avatarUrl || undefined} size="md" />
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${STATUS_COLORS[user.activityStatus] ?? STATUS_COLORS.offline}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[#111111]">{name}</p>
                  {user.username && <span className="text-xs text-[#94a3b8]">@{user.username}</span>}
                  {user.telegramUsername && <span className="text-xs text-[#64748b]">TG: @{user.telegramUsername}</span>}
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
      </div>

      {selectedUser && (
        <UserMiniProfile
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          isMobile={isMobile}
          onNavigate={() => {
            setSelectedUser(null)
            navigate(`/profile/${selectedUser.userId}`)
          }}
        />
      )}
    </>
  )
}
