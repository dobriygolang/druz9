import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Hash, UserPlus, UserMinus, Globe, Lock, Calendar, Play, Share2, Check, Plus, ExternalLink, RefreshCw } from 'lucide-react'
import { circleApi, type CircleMember } from '@/features/Circle/api/circleApi'
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi'
import { eventApi, type Event, REPEAT_LABELS, type EventRepeat } from '@/features/Event/api/eventApi'
import type { Circle } from '@/entities/Circle/model/types'
import { Button } from '@/shared/ui/Button'
import { Avatar } from '@/shared/ui/Avatar'
import { Modal } from '@/shared/ui/Modal'
import { Input } from '@/shared/ui/Input'
import { useToast } from '@/shared/ui/Toast'

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch { return '' }
}

const CIRCLE_GRADIENTS = [
  { from: '#6366f1', to: '#8b5cf6' },
  { from: '#06b6d4', to: '#0ea5e9' },
  { from: '#f97316', to: '#f59e0b' },
  { from: '#10b981', to: '#059669' },
  { from: '#ec4899', to: '#f43f5e' },
  { from: '#8b5cf6', to: '#6366f1' },
]

function getCircleGradient(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return CIRCLE_GRADIENTS[Math.abs(hash) % CIRCLE_GRADIENTS.length]
}

type Tab = 'overview' | 'members' | 'events'

export function CirclePage() {
  const { circleId } = useParams<{ circleId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [circle, setCircle] = useState<Circle | null>(null)
  const [members, setMembers] = useState<CircleMember[]>([])
  const [loading, setLoading] = useState(true)
  const [membersLoading, setMembersLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [practiceLoading, setPracticeLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [copied, setCopied] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [eventForm, setEventForm] = useState<{ title: string; description: string; meetingLink: string; scheduledAt: string; repeat: EventRepeat }>({
    title: '', description: '', meetingLink: '', scheduledAt: '', repeat: 'none',
  })

  useEffect(() => {
    if (!circleId) return
    setLoading(true)
    circleApi.getCircle(circleId)
      .then(setCircle)
      .catch(() => navigate('/community/circles', { replace: true }))
      .finally(() => setLoading(false))
  }, [circleId])

  const loadMembers = useCallback(() => {
    if (!circleId || membersLoading) return
    setMembersLoading(true)
    circleApi.listMembers(circleId)
      .then(setMembers)
      .catch(() => {})
      .finally(() => setMembersLoading(false))
  }, [circleId])

  const loadEvents = useCallback(() => {
    if (!circleId) return
    setEventsLoading(true)
    eventApi.listCircleEvents(circleId)
      .then(setEvents)
      .catch(() => {})
      .finally(() => setEventsLoading(false))
  }, [circleId])

  useEffect(() => {
    if (activeTab === 'members') loadMembers()
    if (activeTab === 'events') loadEvents()
  }, [activeTab, loadMembers, loadEvents])

  const handleCreateEvent = async () => {
    if (!circleId || !eventForm.title || !eventForm.scheduledAt) return
    setCreatingEvent(true)
    try {
      const created = await eventApi.createCircleEvent(circleId, eventForm)
      setEvents(prev => [created, ...prev])
      setShowCreateEvent(false)
      setEventForm({ title: '', description: '', meetingLink: '', scheduledAt: '', repeat: 'none' })
      toast('Ивент создан', 'success')
    } catch {
      toast('Не удалось создать ивент', 'error')
    } finally { setCreatingEvent(false) }
  }

  const handleJoin = async () => {
    if (!circle) return
    setActionLoading(true)
    try {
      await circleApi.joinCircle(circle.id)
      setCircle(c => c ? { ...c, isJoined: true, memberCount: c.memberCount + 1 } : c)
      toast('Вы вступили в круг', 'success')
      if (activeTab === 'members') loadMembers()
    } catch {
      toast('Не удалось вступить', 'error')
    } finally { setActionLoading(false) }
  }

  const handleLeave = async () => {
    if (!circle) return
    setActionLoading(true)
    try {
      await circleApi.leaveCircle(circle.id)
      setCircle(c => c ? { ...c, isJoined: false, memberCount: Math.max(c.memberCount - 1, 0) } : c)
      toast('Вы покинули круг', 'success')
    } catch {
      toast('Не удалось покинуть круг', 'error')
    } finally { setActionLoading(false) }
  }

  const handleStartPractice = async () => {
    if (!circle) return
    setPracticeLoading(true)
    try {
      const { room } = await codeRoomApi.createRoom({ mode: 'ROOM_MODE_ALL', name: circle.name })
      const inviteUrl = `${window.location.origin}/code-rooms/${room.id}`
      await navigator.clipboard.writeText(inviteUrl)
      toast('Комната создана! Ссылка скопирована — отправь участникам круга', 'success')
      navigate(`/code-rooms/${room.id}`)
    } catch {
      toast('Не удалось создать комнату', 'error')
    } finally { setPracticeLoading(false) }
  }

  const handleShare = () => {
    const url = `${window.location.origin}/community/circles/${circleId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      toast('Ссылка скопирована', 'success')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) {
    return (
      <div className="min-h-full">
        <div className="h-14 bg-white dark:bg-[#0f1117] border-b border-[#E7E8E5] dark:border-[#1e3158] animate-pulse" />
        <div className="h-52 bg-gradient-to-br from-[#e2e8f0] to-[#cbd5e1] dark:from-[#1a2540] dark:to-[#161c2d] animate-pulse" />
        <div className="px-4 py-4 flex flex-col gap-3">
          <div className="h-24 bg-[#e2e8f0] dark:bg-[#1e3158] rounded-2xl animate-pulse" />
          <div className="h-32 bg-[#e2e8f0] dark:bg-[#1e3158] rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (!circle) return null

  const grad = getCircleGradient(circle.name)
  const initials = circle.name.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-full flex flex-col">
      {/* Top navigation bar */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#0f1117]/80 backdrop-blur-md border-b border-[#E7E8E5] dark:border-[#1e3158] px-4 h-14 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => navigate('/community/circles')}
          className="flex items-center gap-1.5 text-sm font-medium text-[#666666] dark:text-[#7e93b0] hover:text-[#111111] dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Круги
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F2F3F0] dark:hover:bg-[#1e3158] text-[#666666] dark:text-[#7e93b0] transition-colors"
            title="Поделиться"
          >
            {copied ? <Check className="w-4 h-4 text-[#22c55e]" /> : <Share2 className="w-4 h-4" />}
          </button>
          {circle.isJoined ? (
            <Button variant="secondary" size="sm" onClick={handleLeave} loading={actionLoading}>
              <UserMinus className="w-3.5 h-3.5" /> Покинуть
            </Button>
          ) : (
            <Button variant="orange" size="sm" onClick={handleJoin} loading={actionLoading}>
              <UserPlus className="w-3.5 h-3.5" /> Вступить
            </Button>
          )}
        </div>
      </div>

      {/* Hero */}
      <div
        className="relative overflow-hidden px-5 pt-7 pb-8"
        style={{ background: `linear-gradient(135deg, ${grad.from}22, ${grad.to}33)` }}
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-20" style={{ background: grad.to }} />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full blur-2xl opacity-15" style={{ background: grad.from }} />

        <div className="relative flex items-center gap-5">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})` }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                style={{ background: circle.isPublic ? `${grad.from}99` : '#64748b99' }}
              >
                {circle.isPublic
                  ? <><Globe className="w-2.5 h-2.5" /> Публичный</>
                  : <><Lock className="w-2.5 h-2.5" /> Закрытый</>
                }
              </span>
              {circle.isJoined && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#22c55e]/20 text-[#16a34a] dark:text-[#4ade80]">
                  Участник
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-[#0f172a] dark:text-[#e2e8f3] leading-tight truncate">{circle.name}</h1>
            <p className="text-sm text-[#475569] dark:text-[#7e93b0] mt-0.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 flex-shrink-0" />
              {circle.memberCount} участников
            </p>
          </div>
        </div>

        {circle.description && (
          <p className="relative mt-5 text-sm text-[#334155] dark:text-[#94a3b8] leading-relaxed bg-white/50 dark:bg-white/5 rounded-xl px-4 py-3 border border-white/60 dark:border-white/10 backdrop-blur-sm">
            {circle.description}
          </p>
        )}

        {/* Start practice CTA */}
        <div className="relative mt-4">
          <Button
            variant="orange"
            size="sm"
            onClick={handleStartPractice}
            loading={practiceLoading}
            className="shadow-sm"
          >
            <Play className="w-3.5 h-3.5" />
            Начать совместную практику
          </Button>
          <p className="text-[11px] text-[#64748b] dark:text-[#4d6380] mt-1.5">
            Создаст комнату и скопирует ссылку — отправь участникам
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4 flex gap-1 bg-transparent flex-wrap">
        {([
          { id: 'overview', label: 'Обзор' },
          { id: 'members', label: `Участники · ${circle.memberCount}` },
          { id: 'events', label: `Ивенты${events.length > 0 ? ` · ${events.length}` : ''}` },
        ] as { id: Tab; label: string }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-[#161c2d] text-[#111111] dark:text-[#e2e8f3] shadow-sm border border-[#E7E8E5] dark:border-[#1e3158]'
                : 'text-[#666666] dark:text-[#7e93b0] hover:text-[#111111] dark:hover:text-[#e2e8f3]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-4 flex flex-col gap-3">
        {activeTab === 'overview' && (
          <>
            {/* Tags */}
            {circle.tags.length > 0 && (
              <div className="bg-white dark:bg-[#161c2d] rounded-2xl border border-[#E7E8E5] dark:border-[#1e3158] px-5 py-4">
                <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Темы</p>
                <div className="flex flex-wrap gap-2">
                  {circle.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: `${grad.from}18`, color: grad.from, border: `1px solid ${grad.from}30` }}
                    >
                      <Hash className="w-2.5 h-2.5" />{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Meta */}
            {circle.createdAt && (
              <div className="flex items-center gap-2 px-1 py-1 text-xs text-[#94a3b8]">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                Создан {formatDate(circle.createdAt)}
              </div>
            )}

            {/* No tags empty state */}
            {circle.tags.length === 0 && !circle.description && (
              <div className="bg-white dark:bg-[#161c2d] rounded-2xl border border-[#E7E8E5] dark:border-[#1e3158] px-5 py-8 text-center">
                <p className="text-sm text-[#94a3b8]">Описание и темы не заданы</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'members' && (
          <div className="bg-white dark:bg-[#161c2d] rounded-2xl border border-[#E7E8E5] dark:border-[#1e3158] overflow-hidden">
            {membersLoading ? (
              <div className="divide-y divide-[#F2F3F0] dark:divide-[#1e3158]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-[#e2e8f0] dark:bg-[#1e3158]" />
                    <div className="flex-1">
                      <div className="h-3 w-32 bg-[#e2e8f0] dark:bg-[#1e3158] rounded mb-1.5" />
                      <div className="h-2.5 w-20 bg-[#e2e8f0] dark:bg-[#1e3158] rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Users className="w-8 h-8 text-[#CBCCC9] mx-auto mb-3" />
                <p className="text-sm text-[#94a3b8]">Участников пока нет</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F2F3F0] dark:divide-[#1e3158]">
                {members.map(m => {
                  const name = [m.firstName, m.lastName].filter(Boolean).join(' ') || 'Участник'
                  return (
                    <button
                      key={m.userId}
                      onClick={() => navigate(`/profile/${m.userId}`)}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#F2F3F0] dark:hover:bg-[#1a2236] transition-colors text-left"
                    >
                      <Avatar name={name} src={m.avatarUrl || undefined} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#111111] dark:text-[#e2e8f3] truncate">{name}</p>
                        {m.role === 'creator' && (
                          <p className="text-[11px] text-[#6366F1]">Создатель</p>
                        )}
                      </div>
                      <span className="text-xs text-[#94a3b8] flex-shrink-0">{formatDate(m.joinedAt)}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <>
            {circle.isJoined && (
              <div className="flex justify-end">
                <Button variant="orange" size="sm" onClick={() => setShowCreateEvent(true)}>
                  <Plus className="w-3.5 h-3.5" /> Создать ивент
                </Button>
              </div>
            )}
            <div className="flex flex-col gap-3">
              {eventsLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-24 bg-white dark:bg-[#161c2d] rounded-2xl border border-[#E7E8E5] dark:border-[#1e3158] animate-pulse" />
                ))
              ) : events.length === 0 ? (
                <div className="bg-white dark:bg-[#161c2d] rounded-2xl border border-[#E7E8E5] dark:border-[#1e3158] px-5 py-10 text-center">
                  <Calendar className="w-8 h-8 text-[#CBCCC9] mx-auto mb-3" />
                  <p className="text-sm text-[#94a3b8]">Ивентов пока нет</p>
                  {circle.isJoined && (
                    <button onClick={() => setShowCreateEvent(true)} className="mt-3 text-xs text-[#6366F1] hover:underline">
                      Создать первый ивент
                    </button>
                  )}
                </div>
              ) : events.map(ev => {
                const repeatLabel = ev.repeat && ev.repeat !== 'none' ? REPEAT_LABELS[ev.repeat as EventRepeat] : null
                return (
                  <div key={ev.id} className="bg-white dark:bg-[#161c2d] rounded-2xl border border-[#E7E8E5] dark:border-[#1e3158] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-[#111111] dark:text-[#e2e8f3]">{ev.title}</h4>
                          {repeatLabel && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-[#EEF2FF] dark:bg-[#1e1e4a] text-[#6366F1] rounded-full font-medium">
                              <RefreshCw className="w-2.5 h-2.5" />{repeatLabel}
                            </span>
                          )}
                        </div>
                        {ev.description && (
                          <p className="text-xs text-[#666666] dark:text-[#7e93b0] mt-1 line-clamp-2">{ev.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-xs text-[#94a3b8]">
                            <Calendar className="w-3 h-3" />
                            {new Date(ev.scheduledAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-[#94a3b8]">
                            <Users className="w-3 h-3" />{ev.participantCount}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {ev.meetingLink && (
                          <a href={ev.meetingLink} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-[#6366F1] hover:underline"
                            onClick={e => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3" /> Ссылка
                          </a>
                        )}
                        {ev.isJoined ? (
                          <button onClick={() => eventApi.leaveEvent(ev.id).then(loadEvents)}
                            className="text-xs text-[#94a3b8] hover:text-red-500 transition-colors">
                            Отменить
                          </button>
                        ) : (
                          <button onClick={() => eventApi.joinEvent(ev.id).then(loadEvents)}
                            className="text-xs font-medium text-[#6366F1] hover:underline">
                            Участвовать
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Create event modal */}
      <Modal
        open={showCreateEvent}
        onClose={() => setShowCreateEvent(false)}
        title="Новый ивент"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCreateEvent(false)}>Отмена</Button>
            <Button variant="orange" size="sm" onClick={handleCreateEvent} loading={creatingEvent}
              disabled={!eventForm.title || !eventForm.scheduledAt}>
              Создать
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input label="Название *" value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} placeholder="Читаем Kafka вместе" />
          <Input label="Дата и время *" type="datetime-local" value={eventForm.scheduledAt} onChange={e => setEventForm(f => ({ ...f, scheduledAt: e.target.value }))} />
          <div>
            <label className="text-xs font-medium text-[#475569] mb-1 block">Повторение</label>
            <select
              value={eventForm.repeat}
              onChange={e => setEventForm(f => ({ ...f, repeat: e.target.value as EventRepeat }))}
              className="select-field w-full"
            >
              {(Object.entries(REPEAT_LABELS) as [EventRepeat, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <Input label="Ссылка на встречу" value={eventForm.meetingLink} onChange={e => setEventForm(f => ({ ...f, meetingLink: e.target.value }))} placeholder="https://meet.google.com/..." />
          <Input label="Описание" value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} placeholder="Что будем обсуждать?" />
        </div>
      </Modal>
    </div>
  )
}
