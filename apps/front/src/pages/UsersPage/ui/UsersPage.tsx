import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ChevronRight, MapPin, Briefcase } from 'lucide-react'
import { Avatar } from '@/shared/ui/Avatar'
import type { User } from '@/entities/User/model/types'

const STATUS_COLORS: Record<string, string> = {
  online: 'bg-[#22c55e]',
  recently_active: 'bg-[#f59e0b]',
  offline: 'bg-[#94a3b8]',
}

export function UsersPage() {
  const { search = '' } = useOutletContext<{ search: string }>()
  const [users] = useState<User[]>([])

  // Placeholder users for design matching
  const displayUsers: Partial<User>[] = users.length > 0 ? users : [
    { id: '1', firstName: 'Алексей', lastName: 'Иванов', username: 'alexei_ivan', region: 'Москва', currentWorkplace: 'Яндекс', activityStatus: 'online' },
    { id: '2', firstName: 'Мария', lastName: 'Петрова', username: 'maria_p', region: 'Санкт-Петербург', currentWorkplace: 'Сбер', activityStatus: 'recently_active' },
    { id: '3', firstName: 'Дмитрий', lastName: 'Смирнов', username: 'dsmirn', region: 'Казань', currentWorkplace: 'VK', activityStatus: 'offline' },
    { id: '4', firstName: 'Анна', lastName: 'Козлова', username: 'ann_k', region: 'Новосибирск', currentWorkplace: 'Ozon', activityStatus: 'online' },
    { id: '5', firstName: 'Игорь', lastName: 'Фёдоров', username: 'ifed', region: 'Москва', currentWorkplace: 'Тинькофф', activityStatus: 'recently_active' },
  ]

  const filtered = displayUsers.filter(u => {
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
            key={user.id}
            className="flex items-center gap-3.5 px-4 py-3 bg-white rounded-xl border border-[#CBCCC9] hover:border-[#94a3b8] cursor-pointer transition-colors"
          >
            <div className="relative">
              <Avatar name={name} size="md" />
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${STATUS_COLORS[user.activityStatus ?? 'offline']}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-[#18181b]">{name}</p>
                <span className="text-xs text-[#94a3b8]">@{user.username}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {user.region && (
                  <span className="flex items-center gap-1 text-xs text-[#64748b]">
                    <MapPin className="w-3 h-3" /> {user.region}
                  </span>
                )}
                {user.currentWorkplace && (
                  <span className="flex items-center gap-1 text-xs text-[#64748b]">
                    <Briefcase className="w-3 h-3" /> {user.currentWorkplace}
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
