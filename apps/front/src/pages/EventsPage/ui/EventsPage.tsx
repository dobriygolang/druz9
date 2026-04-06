import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, MapPin, Users, Plus, Link2, User, X, Clock, Trash2 } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { eventApi, type Event, type CreateEventPayload } from '@/features/Event/api/eventApi'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Input } from '@/shared/ui/Input'
import { ErrorState } from '@/shared/ui/ErrorState'
import { useToast } from '@/shared/ui/Toast'

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('ru-RU', { month: 'long', day: 'numeric', year: 'numeric' })
  } catch { return iso }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function EventDetailModal({ event, onClose, onJoin, onLeave, onDelete }: {
  event: Event
  onClose: () => void
  onJoin: (id: string) => Promise<void>
  onLeave: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleAction = async () => {
    setLoading(true)
    try {
      if (event.isJoined) await onLeave(event.id)
      else await onJoin(event.id)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(event.id)
    } finally {
      setDeleting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-[#1e293b]/60 animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white sm:rounded-2xl rounded-t-2xl shadow-modal animate-modal-in overflow-hidden flex flex-col max-h-[90vh]">
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-[#6366F1] to-[#8b5cf6] px-6 pt-6 pb-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white pr-10 leading-snug">{event.title}</h2>
          {event.isJoined && (
            <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#22c55e]/20 text-[#86efac]">
              Вы идёте
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {/* Date & time */}
          {event.scheduledAt && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#f0f0ff] flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-[#6366F1]" />
              </div>
              <div>
                <p className="text-xs text-[#94a3b8] font-medium uppercase tracking-wide">Дата и время</p>
                <p className="text-sm font-semibold text-[#111111] mt-0.5">
                  {formatDate(event.scheduledAt)}
                </p>
                <p className="text-sm text-[#666666]">{formatTime(event.scheduledAt)}</p>
              </div>
            </div>
          )}

          {/* Location */}
          {(event.city || event.placeLabel) && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#f0fff4] flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-[#22c55e]" />
              </div>
              <div>
                <p className="text-xs text-[#94a3b8] font-medium uppercase tracking-wide">Место</p>
                <p className="text-sm font-semibold text-[#111111] mt-0.5">
                  {event.city || event.placeLabel}
                </p>
                {event.city && event.placeLabel && event.city !== event.placeLabel && (
                  <p className="text-xs text-[#666666]">{event.placeLabel}</p>
                )}
              </div>
            </div>
          )}

          {/* Participants */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#fff7ed] flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-[#f97316]" />
            </div>
            <div>
              <p className="text-xs text-[#94a3b8] font-medium uppercase tracking-wide">Участников</p>
              <p className="text-sm font-semibold text-[#111111] mt-0.5">{event.participantCount}</p>
            </div>
          </div>

          {/* Creator */}
          {event.creatorName && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#f8f8f6] flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-[#94a3b8]" />
              </div>
              <div>
                <p className="text-xs text-[#94a3b8] font-medium uppercase tracking-wide">Организатор</p>
                <p className="text-sm font-semibold text-[#111111] mt-0.5">{event.creatorName}</p>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="p-4 bg-[#f8f9fa] rounded-xl">
              <p className="text-xs text-[#94a3b8] font-medium uppercase tracking-wide mb-2">Описание</p>
              <p className="text-sm text-[#475569] leading-relaxed whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Meeting link */}
          {event.meetingLink && (
            <a
              href={event.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3.5 bg-[#eff6ff] rounded-xl hover:bg-[#dbeafe] transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#6366F1] flex items-center justify-center flex-shrink-0">
                <Link2 className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#94a3b8] font-medium">Ссылка на встречу</p>
                <p className="text-sm text-[#6366F1] font-medium truncate group-hover:underline">{event.meetingLink}</p>
              </div>
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e2e8f0] flex gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} className="flex-1 justify-center">
            Закрыть
          </Button>
          {event.isCreator ? (
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 justify-center text-[#dc2626] hover:bg-[#fee2e2] hover:border-[#dc2626]"
              onClick={handleDelete}
              loading={deleting}
            >
              <Trash2 className="w-4 h-4" /> Удалить
            </Button>
          ) : (
            <Button
              variant={event.isJoined ? 'secondary' : 'orange'}
              size="sm"
              className="flex-1 justify-center"
              onClick={handleAction}
              loading={loading}
            >
              {event.isJoined ? 'Отказаться' : 'Участвовать'}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function EventsPage() {
  const { toast } = useToast()
  const ctx = useOutletContext<{ openCreateEvent?: boolean; setOpenCreateEvent?: (v: boolean) => void } | null>()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Partial<CreateEventPayload>>({})
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  const fetchEvents = useCallback(() => {
    setError(null)
    setLoading(true)
    eventApi.listEvents({ limit: 6 })
      .then(r => setEvents(r.events))
      .catch(() => setError('Не удалось загрузить данные'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  useEffect(() => {
    if (ctx?.openCreateEvent) {
      setShowCreate(true)
      ctx.setOpenCreateEvent?.(false)
    }
  }, [ctx?.openCreateEvent])

  const handleJoin = async (id: string) => {
    try {
      const updated = await eventApi.joinEvent(id)
      setEvents(prev => prev.map(e => e.id === id ? updated : e))
      setSelectedEvent(prev => prev?.id === id ? updated : prev)
      toast('Вы записались на событие', 'success')
    } catch {
      toast('Не удалось записаться', 'error')
    }
  }

  const handleLeave = async (id: string) => {
    try {
      await eventApi.leaveEvent(id)
      setEvents(prev => prev.map(e => e.id === id ? { ...e, isJoined: false, participantCount: Math.max(e.participantCount - 1, 0) } : e))
      setSelectedEvent(prev => prev?.id === id ? { ...prev, isJoined: false, participantCount: Math.max(prev.participantCount - 1, 0) } : prev)
      toast('Вы отказались от участия', 'success')
    } catch {
      toast('Не удалось отказаться', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await eventApi.deleteEvent(id)
      setEvents(prev => prev.filter(e => e.id !== id))
      setSelectedEvent(null)
      toast('Событие удалено', 'success')
    } catch {
      toast('Не удалось удалить событие', 'error')
    }
  }

  const handleCreate = async () => {
    if (!form.title || !form.scheduledAt) return
    setCreating(true)
    try {
      let scheduledAt = form.scheduledAt ?? ''
      if (scheduledAt && !scheduledAt.match(/T\d{2}:\d{2}:\d{2}/)) scheduledAt = `${scheduledAt}:00`
      if (scheduledAt && !/[Z+\-]\d*$/.test(scheduledAt)) scheduledAt = `${scheduledAt}Z`
      const created = await eventApi.createEvent({ ...form, scheduledAt } as CreateEventPayload)
      setEvents(prev => [created, ...prev])
      setShowCreate(false)
      setForm({})
      toast('Событие создано', 'success')
    } catch {
      toast('Не удалось создать событие', 'error')
    } finally { setCreating(false) }
  }

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchEvents() }} />

  return (
    <div className="px-6 pt-4 pb-6">
      <div className="grid grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[180px] bg-white rounded-2xl border border-[#CBCCC9] animate-pulse" />
          ))
          : events.map((e) => (
            <Card
              key={e.id}
              padding="md"
              className="stagger-item flex flex-col gap-3 hover:border-[#6366F1] transition-all cursor-pointer hover:shadow-sm"
              onClick={() => setSelectedEvent(e)}
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#f0f0ff] flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#6366F1]" />
                </div>
                {e.isJoined && <Badge variant="success">Вы идёте</Badge>}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#111111] line-clamp-2">{e.title}</h3>
                {e.scheduledAt && (
                  <p className="text-xs text-[#666666] mt-1">{formatDate(e.scheduledAt)} · {formatTime(e.scheduledAt)}</p>
                )}
              </div>
              <div className="flex items-center gap-3 mt-auto">
                {(e.city || e.placeLabel) && (
                  <span className="flex items-center gap-1 text-xs text-[#666666]">
                    <MapPin className="w-3 h-3" /> {e.city || e.placeLabel}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-[#666666] ml-auto">
                  <Users className="w-3 h-3" /> {e.participantCount}
                </span>
              </div>
            </Card>
          ))
        }
        <button
          onClick={() => setShowCreate(true)}
          className="h-[180px] border-2 border-dashed border-[#CBCCC9] rounded-2xl flex flex-col items-center justify-center gap-2 text-[#94a3b8] hover:border-[#6366F1] hover:text-[#6366F1] transition-colors"
        >
          <Plus className="w-6 h-6" />
          <span className="text-sm font-medium">Создать событие</span>
        </button>
      </div>

      {/* Event detail */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onJoin={handleJoin}
          onLeave={handleLeave}
          onDelete={handleDelete}
        />
      )}

      {/* Create event modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Новое событие"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Отмена</Button>
            <Button variant="orange" size="sm" onClick={handleCreate} loading={creating}>Создать</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Название" value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Название события" />
          <Input label="Дата и время" type="datetime-local" value={form.scheduledAt ?? ''} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
          <Input label="Место" value={form.placeLabel ?? ''} onChange={e => setForm(f => ({ ...f, placeLabel: e.target.value }))} placeholder="Город, место" />
          <Input label="Ссылка на встречу" value={form.meetingLink ?? ''} onChange={e => setForm(f => ({ ...f, meetingLink: e.target.value }))} placeholder="https://..." />
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1.5">Описание</label>
            <textarea
              value={form.description ?? ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Расскажите о событии..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-[#CBCCC9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
