import { useEffect, useState, useCallback } from 'react'
import { Calendar, Users, Briefcase, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { eventApi, type Event } from '@/features/Event/api/eventApi'
import { geoApi } from '@/features/Geo/api/geoApi'
import { Card } from '@/shared/ui/Card'
import { Avatar } from '@/shared/ui/Avatar'
import { ErrorState } from '@/shared/ui/ErrorState'
import { AnimatedNumber } from '@/shared/ui/AnimatedNumber'

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

export function HomePage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [onlineCount, setOnlineCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    setError(null)
    Promise.all([
      eventApi.listEvents({ limit: 3 }).then(r => setEvents(r.events)),
      geoApi.getCommunity().then(points => setOnlineCount(points.length)),
    ]).catch(() => {
      setError('Не удалось загрузить данные')
    })
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const firstName = user?.firstName || user?.username || 'Иван'

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchData() }} />

  return (
    <div className="p-8 flex flex-col gap-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-2xl font-semibold text-[#111111]">
            Добро пожаловать, {firstName}
          </h1>
          <p className="text-sm text-[#666666] font-geist mt-1">
            Сегодня в сообществе {onlineCount} человек онлайн
          </p>
        </div>
        <Avatar name={firstName} src={user?.avatarUrl || undefined} size="md" className="bg-[#6366F1]" />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Онлайн', value: onlineCount, icon: <Users className="w-4 h-4 text-[#666666]" /> },
          { label: 'Событий', value: events.length, icon: <Calendar className="w-4 h-4 text-[#666666]" /> },
        ].map((m) => (
          <Card key={m.label} padding="lg" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#666666]">{m.label}</span>
              {m.icon}
            </div>
            <span className="font-mono text-[32px] font-bold text-[#111111] leading-none"><AnimatedNumber value={m.value} /></span>
          </Card>
        ))}
      </div>

      {/* Content row */}
      <div className="flex gap-4">
        {/* Events */}
        <Card className="flex-1" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#111111]">Ближайшие события</h2>
            <Link to="/community/events" className="text-xs text-[#6366F1] font-medium flex items-center gap-1">
              Все <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex flex-col divide-y divide-[#CBCCC9]">
            {events.length === 0
              ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F2F3F0] flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3.5 bg-[#E7E8E5] rounded w-48 mb-1.5" />
                    <div className="h-3 bg-[#E7E8E5] rounded w-32" />
                  </div>
                </div>
              ))
              : events.map((e) => (
                <div key={e.id} className="py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#fff7ed] flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-[#6366F1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#111111] truncate">{e.title}</p>
                    <p className="text-xs text-[#666666]">{formatDate(e.scheduledAt)} · {e.city || e.placeLabel}</p>
                  </div>
                  <span className="text-xs text-[#94a3b8]">{e.participantCount} чел.</span>
                </div>
              ))
            }
          </div>
        </Card>

        {/* Vacancies teaser */}
        <Link to="/community/vacancies" className="w-[340px] flex-shrink-0 no-underline">
          <Card className="h-full flex flex-col items-center justify-center gap-3 hover:border-[#6366F1] transition-colors cursor-pointer" padding="lg">
            <div className="w-12 h-12 rounded-full bg-[#fff7ed] flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-[#6366F1]" />
            </div>
            <div className="text-center">
              <h2 className="text-sm font-semibold text-[#111111]">Вакансии</h2>
              <p className="text-xs text-[#666666] mt-1">Рефералки и вакансии</p>
            </div>
            <span className="text-xs text-[#6366F1] font-medium flex items-center gap-1">
              Перейти <ChevronRight className="w-3 h-3" />
            </span>
          </Card>
        </Link>
      </div>
    </div>
  )
}
