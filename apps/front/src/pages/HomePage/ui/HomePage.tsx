import { useEffect, useState, useCallback } from 'react'
import { Briefcase, Calendar, ChevronRight, Code2, Users, Map } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { eventApi, type Event } from '@/features/Event/api/eventApi'
import { geoApi } from '@/features/Geo/api/geoApi'
import { Card } from '@/shared/ui/Card'
import { Avatar } from '@/shared/ui/Avatar'
import { ErrorState } from '@/shared/ui/ErrorState'
import { AnimatedNumber } from '@/shared/ui/AnimatedNumber'
import { formatDateShort } from '@/shared/lib/dateFormat'

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
    <div className="flex min-h-full flex-col gap-4 px-4 pb-6 pt-4 md:gap-6 md:p-8">
      <section className="section-enter relative overflow-hidden rounded-[32px] border border-[#d8d9d6] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(238,242,255,0.92)_48%,_rgba(255,247,237,0.95))] p-5 shadow-[0_24px_60px_rgba(99,102,241,0.12)] dark:border-[#1e3158] dark:bg-[linear-gradient(145deg,_rgba(11,13,22,0.96),_rgba(29,36,63,0.92)_52%,_rgba(46,26,38,0.88))] dark:shadow-[0_28px_70px_rgba(2,6,23,0.45)] md:p-7">
        <div className="pointer-events-none absolute inset-y-0 right-[-14%] w-[58%] rounded-full bg-[radial-gradient(circle,_rgba(99,102,241,0.24),_transparent_66%)] blur-2xl dark:bg-[radial-gradient(circle,_rgba(129,140,248,0.2),_transparent_70%)]" />

        <div className="relative flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="max-w-[20ch] font-mono text-[32px] font-semibold leading-[1.02] text-[#111111] dark:text-[#f8fafc] sm:text-[40px]">
                Добро пожаловать, {firstName}
              </h1>
              <p className="mt-3 max-w-[30rem] text-sm leading-6 text-[#475569] dark:text-[#94a3b8]">
                Кто онлайн, что происходит в сообществе и куда двигаться дальше.
              </p>
            </div>
            <Avatar
              name={firstName}
              src={user?.avatarUrl || undefined}
              size="lg"
              className="ring-4 ring-white/80 shadow-[0_16px_32px_rgba(15,23,42,0.12)] dark:ring-[#121b30]"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              to="/community/events"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#111111] px-4 py-3 text-sm font-semibold text-white transition-transform duration-200 active:scale-[0.98] dark:bg-white dark:text-[#08101f]"
            >
              Смотреть события
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              to="/practice/code-rooms"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#CBCCC9] bg-white/70 px-4 py-3 text-sm font-semibold text-[#111111] backdrop-blur transition-transform duration-200 active:scale-[0.98] dark:border-[#24324f] dark:bg-[#10192b]/70 dark:text-[#f8fafc]"
            >
              В practice
              <Code2 className="h-4 w-4 text-[#6366F1]" />
            </Link>
            <Link
              to="/community/map"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#CBCCC9] bg-white/70 px-4 py-3 text-sm font-semibold text-[#111111] backdrop-blur transition-transform duration-200 active:scale-[0.98] dark:border-[#24324f] dark:bg-[#10192b]/70 dark:text-[#f8fafc]"
            >
              Карта сообщества
              <Map className="h-4 w-4 text-[#6366F1]" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'Онлайн', value: onlineCount, icon: <Users className="h-4 w-4 text-[#6366F1]" /> },
              { label: 'Событий', value: events.length, icon: <Calendar className="h-4 w-4 text-[#6366F1]" /> },
            ].map((metric) => (
              <div
                key={metric.label}
                className="rounded-[24px] border border-white/60 bg-white/70 px-4 py-4 backdrop-blur dark:border-[#24324f] dark:bg-[#0f1729]/72"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#667085] dark:text-[#7e93b0]">
                    {metric.label}
                  </span>
                  {metric.icon}
                </div>
                <div className="mt-4 font-mono text-[30px] font-bold leading-none text-[#111111] dark:text-[#f8fafc]">
                  <AnimatedNumber value={metric.value} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="section-enter" padding="lg">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#111111] dark:text-[#f8fafc]">Ближайшие события</h2>
              <p className="mt-1 text-xs text-[#667085] dark:text-[#7e93b0]">Не пропустите самое важное в сообществе.</p>
            </div>
            <Link to="/community/events" className="inline-flex items-center gap-1 text-xs font-semibold text-[#6366F1]">
              Все
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex flex-col divide-y divide-[#CBCCC9] dark:divide-[#1a2540]">
            {events.length === 0
              ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="stagger-item flex items-center gap-3 py-3">
                  <div className="h-10 w-10 flex-shrink-0 rounded-2xl bg-[#F2F3F0] dark:bg-[#1a2236]" />
                  <div className="flex-1">
                    <div className="mb-1.5 h-3.5 w-40 rounded bg-[#E7E8E5] dark:bg-[#1e3158]" />
                    <div className="h-3 w-28 rounded bg-[#E7E8E5] dark:bg-[#1e3158]" />
                  </div>
                </div>
              ))
              : events.map((event) => (
                <div key={event.id} className="stagger-item flex items-center gap-3 py-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#fff7ed] dark:bg-[#2a200a]">
                    <Calendar className="h-4 w-4 text-[#6366F1]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#111111] dark:text-[#f8fafc]">{event.title}</p>
                    <p className="text-xs text-[#667085] dark:text-[#7e93b0]">
                      {formatDateShort(event.scheduledAt)} · {event.city || event.placeLabel}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#F2F3F0] px-2.5 py-1 text-[11px] font-medium text-[#667085] dark:bg-[#1a2236] dark:text-[#94a3b8]">
                    {event.participantCount} чел.
                  </span>
                </div>
              ))}
          </div>
        </Card>

        <Link to="/community/vacancies" className="no-underline">
          <Card
            className="section-enter h-full overflow-hidden border-[#d8d9d6] bg-[linear-gradient(180deg,_#111827,_#1f2937_46%,_#312e81)] text-white hover:border-[#6366F1] dark:border-[#24324f]"
            padding="lg"
          >
            <div className="flex h-full flex-col justify-between gap-8">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                  <Briefcase className="h-6 w-6 text-[#f8fafc]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Вакансии и рефералки</h2>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    Отдельный поток с ролями, рекомендациями и быстрым входом в тёплые контакты.
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                Перейти
                <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  )
}
