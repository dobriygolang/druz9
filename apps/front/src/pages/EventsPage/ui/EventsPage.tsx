import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, MapPin, Users, Plus, Link2, User, X, Clock, Trash2 } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { eventApi, type Event, type CreateEventPayload } from '@/features/Event/api/eventApi'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Input } from '@/shared/ui/Input'
import { ErrorState } from '@/shared/ui/ErrorState'
import { useToast } from '@/shared/ui/Toast'
import { formatDate, formatTime } from '@/shared/lib/dateFormat'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { PageMeta } from '@/shared/ui/PageMeta'

function formatEventScheduleLabel(t: (key: string, params?: Record<string, unknown>) => string, scheduledAt?: string) {
  if (!scheduledAt) return t('events.scheduleUnknown')
  return `${formatDate(scheduledAt)} · ${formatTime(scheduledAt)}`
}

function EventDetailModal({ event, onClose, onJoin, onLeave, onDelete }: {
  event: Event
  onClose: () => void
  onJoin: (id: string) => Promise<void>
  onLeave: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const { t } = useTranslation()
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
        <div className="relative bg-gradient-to-br from-[#059669] to-[#0D9488] px-6 pt-6 pb-8">
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
              {t('events.joined')}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {/* Date & time */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#ecfdf5] flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-[#059669]" />
            </div>
            <div>
              <p className="text-xs text-[#94a3b8] font-medium uppercase tracking-wide">{t('events.dateTime')}</p>
              {event.scheduledAt ? (
                <>
                  <p className="text-sm font-semibold text-[#111111] mt-0.5">
                    {formatDate(event.scheduledAt)}
                  </p>
                  <p className="text-sm text-[#4B6B52]">{formatTime(event.scheduledAt)}</p>
                </>
              ) : (
                <p className="text-sm text-[#4B6B52] mt-0.5">{t('events.scheduleUnknown')}</p>
              )}
            </div>
          </div>

          {/* Location */}
          {(event.city || event.placeLabel) && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#f0fff4] flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-[#22c55e]" />
              </div>
              <div>
                <p className="text-xs text-[#94a3b8] font-medium uppercase tracking-wide">{t('events.place')}</p>
                <p className="text-sm font-semibold text-[#111111] mt-0.5">
                  {event.city || event.placeLabel}
                </p>
                {event.city && event.placeLabel && event.city !== event.placeLabel && (
                  <p className="text-xs text-[#4B6B52]">{event.placeLabel}</p>
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
              <p className="text-xs text-[#94a3b8] font-medium uppercase tracking-wide">{t('events.participants')}</p>
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
                <p className="text-xs text-[#94a3b8] font-medium uppercase tracking-wide">{t('events.organizer')}</p>
                <p className="text-sm font-semibold text-[#111111] mt-0.5">{event.creatorName}</p>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="p-4 bg-[#f8f9fa] rounded-xl">
              <p className="text-xs text-[#94a3b8] font-medium uppercase tracking-wide mb-2">{t('events.descriptionLabel')}</p>
              <p className="text-sm text-[#4B6B52] leading-relaxed whitespace-pre-wrap">{event.description}</p>
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
              <div className="w-8 h-8 rounded-lg bg-[#059669] flex items-center justify-center flex-shrink-0">
                <Link2 className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#94a3b8] font-medium">{t('events.meetingLink')}</p>
                <p className="text-sm text-[#059669] font-medium truncate group-hover:underline">{event.meetingLink}</p>
              </div>
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-[#e2e8f0] px-6 py-4 sm:flex-row">
          <Button variant="secondary" size="sm" onClick={onClose} className="flex-1 justify-center">
            {t('events.close')}
          </Button>
          {event.isCreator ? (
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 justify-center text-[#dc2626] hover:bg-[#fee2e2] hover:border-[#dc2626]"
              onClick={handleDelete}
              loading={deleting}
            >
              <Trash2 className="w-4 h-4" /> {t('events.delete')}
            </Button>
          ) : (
            <Button
              variant={event.isJoined ? 'secondary' : 'orange'}
              size="sm"
              className="flex-1 justify-center"
              onClick={handleAction}
              loading={loading}
            >
              {event.isJoined ? t('events.leave') : t('events.join')}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function EventsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const ctx = useOutletContext<{ openCreateEvent?: boolean; setOpenCreateEvent?: (v: boolean) => void } | null>()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Partial<CreateEventPayload>>({})
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [inviteInput, setInviteInput] = useState('')
  const [inviteIds, setInviteIds] = useState<string[]>([])

  const fetchEvents = useCallback(() => {
    setError(null)
    setLoading(true)
    eventApi.listEvents({ limit: 6 })
      .then(r => setEvents(r.events))
      .catch(() => setError(t('common.loadFailed')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  useEffect(() => {
    if (ctx?.openCreateEvent) {
      setShowCreate(true)
      ctx.setOpenCreateEvent?.(false)
    }
  }, [ctx?.openCreateEvent, ctx?.setOpenCreateEvent])

  const handleJoin = async (id: string) => {
    try {
      const updated = await eventApi.joinEvent(id)
      setEvents(prev => prev.map(e => e.id === id ? updated : e))
      setSelectedEvent(prev => prev?.id === id ? updated : prev)
      toast(t('events.toast.joined'), 'success')
    } catch {
      toast(t('events.toast.joinFailed'), 'error')
    }
  }

  const handleLeave = async (id: string) => {
    try {
      await eventApi.leaveEvent(id)
      setEvents(prev => prev.map(e => e.id === id ? { ...e, isJoined: false, participantCount: Math.max(e.participantCount - 1, 0) } : e))
      setSelectedEvent(prev => prev?.id === id ? { ...prev, isJoined: false, participantCount: Math.max(prev.participantCount - 1, 0) } : prev)
      toast(t('events.toast.left'), 'success')
    } catch {
      toast(t('events.toast.leaveFailed'), 'error')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await eventApi.deleteEvent(id)
      setEvents(prev => prev.filter(e => e.id !== id))
      setSelectedEvent(null)
      toast(t('events.toast.deleted'), 'success')
    } catch {
      toast(t('events.toast.deleteFailed'), 'error')
    }
  }

  const handleCreate = async () => {
    if (!form.title || !form.description) return
    setCreating(true)
    try {
      const created = await eventApi.createEvent(form as CreateEventPayload)
      setEvents(prev => [created, ...prev])
      // Send invites for collected user IDs (fire-and-forget)
      inviteIds.forEach(uid => eventApi.inviteToEvent(created.id, uid).catch(() => {}))
      setShowCreate(false)
      setForm({})
      setInviteIds([])
      setInviteInput('')
      toast(t('events.toast.created'), 'success')
    } catch {
      toast(t('events.toast.createFailed'), 'error')
    } finally { setCreating(false) }
  }

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchEvents() }} />

  const joinedCount = events.filter(event => event.isJoined).length

  return (
    <div className={isMobile ? 'px-4 pt-4 pb-6' : 'px-6 pt-4 pb-6'}>
      <PageMeta title={t('events.meta.title')} description={t('events.meta.description')} canonicalPath="/community/events" />
      {isMobile ? (
        <section className="section-enter mb-4 overflow-hidden rounded-[30px] border border-[#d8d9d6] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(239,246,255,0.94)_46%,_rgba(255,247,237,0.95))] p-5 shadow-[0_18px_36px_rgba(15,23,42,0.08)] dark:border-[#163028] dark:bg-[linear-gradient(145deg,_rgba(22,28,45,0.98),_rgba(19,25,41,0.92)_54%,_rgba(42,32,10,0.62))] md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#059669] dark:text-[#6EE7B7]">
                {t('events.boardEyebrow')}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#111111] dark:text-[#E2F0E8]">
                {t('events.hero.title')}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#4B6B52] dark:text-[#94a3b8]">
                {t('events.hero.subtitleMobile')}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-white/70 bg-white/72 px-4 py-3 backdrop-blur dark:border-[#24324f] dark:bg-[#111827]/72">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#7A9982] dark:text-[#7BA88A]">{t('events.total')}</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-[#111111] dark:text-[#E2F0E8]">{loading ? '—' : events.length}</p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/72 px-4 py-3 backdrop-blur dark:border-[#24324f] dark:bg-[#111827]/72">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#7A9982] dark:text-[#7BA88A]">{t('events.going')}</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-[#111111] dark:text-[#E2F0E8]">{loading ? '—' : joinedCount}</p>
                </div>
              </div>

              <Button variant="orange" size="lg" onClick={() => setShowCreate(true)} className="justify-center rounded-full px-5">
                <Plus className="w-4 h-4" />
                {t('events.create')}
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#111111] dark:text-[#E2F0E8]">{t('events.hero.title')}</h2>
            <p className="mt-1 text-sm text-[#4B6B52] dark:text-[#7BA88A]">{t('events.hero.subtitle')}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-sm text-[#4B6B52] dark:text-[#7BA88A]">
              <span><span className="font-semibold text-[#111111] dark:text-[#E2F0E8]">{loading ? '—' : events.length}</span> {t('events.count', { count: events.length })}</span>
              <span className="h-4 w-px bg-[#C1CFC4] dark:bg-[#1E4035]" />
              <span><span className="font-semibold text-[#111111] dark:text-[#E2F0E8]">{loading ? '—' : joinedCount}</span> {t('events.goingCount', { count: joinedCount })}</span>
            </div>
            <Button variant="orange" size="md" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" />
              {t('events.create')}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className={`grid grid-cols-1 gap-4 ${isMobile ? 'sm:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`h-[188px] animate-pulse border border-[#C1CFC4] bg-white dark:border-[#163028] dark:bg-[#132420] ${isMobile ? 'rounded-[28px]' : 'rounded-2xl'}`}
            />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className={`section-enter flex flex-col items-center justify-center border border-dashed border-[#C1CFC4] bg-white px-6 py-16 text-center dark:border-[#163028] dark:bg-[#132420] ${isMobile ? 'rounded-[30px]' : 'rounded-2xl'}`}>
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#ecfdf5] dark:bg-[#0d2a1f]">
            <Calendar className="h-8 w-8 text-[#059669]" />
          </div>
          <h3 className="text-lg font-semibold text-[#111111] dark:text-[#E2F0E8]">{t('events.empty.title')}</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#7A9982] dark:text-[#94a3b8]">
            {isMobile
              ? t('events.empty.mobile')
              : t('events.empty.desktop')}
          </p>
          <Button variant="orange" size="md" onClick={() => setShowCreate(true)} className="mt-5 rounded-full px-5">
            <Plus className="w-4 h-4" />
            {t('events.emptyCta')}
          </Button>
        </div>
      ) : (
        <div className={`grid grid-cols-1 gap-4 ${isMobile ? 'sm:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
          {events.map((event) => (
            <Card
              key={event.id}
              padding={isMobile ? 'lg' : 'md'}
              className={`stagger-item flex min-h-[188px] flex-col gap-4 border bg-white dark:border-[#163028] dark:bg-[#132420]/96 ${
                isMobile
                  ? 'rounded-[28px] border-[#d8d9d6] bg-white/96 shadow-[0_12px_28px_rgba(15,23,42,0.05)]'
                  : 'rounded-2xl border-[#C1CFC4] shadow-sm'
              } hover:border-[#059669]`}
              onClick={() => setSelectedEvent(event)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ecfdf5] dark:bg-[#0d2a1f]">
                  <Calendar className="h-5 w-5 text-[#059669]" />
                </div>
                  <div className="flex items-center gap-1.5">
                    {event.status === 'pending' && <Badge variant="warning">{t('events.pending')}</Badge>}
                    {event.status === 'rejected' && <Badge variant="danger">{t('events.rejected')}</Badge>}
                    {event.isJoined && <Badge variant="success">{t('events.joined')}</Badge>}
                  </div>
              </div>

              <div className="space-y-2">
                <h3 className="line-clamp-2 text-base font-semibold leading-snug text-[#111111] dark:text-[#E2F0E8]">{event.title}</h3>
                {event.description && (
                  <p className="line-clamp-2 text-sm leading-6 text-[#7A9982] dark:text-[#94a3b8]">
                    {event.description}
                  </p>
                )}
                <p className="text-xs font-medium text-[#7A9982] dark:text-[#94a3b8]">
                  {formatEventScheduleLabel(t, event.scheduledAt)}
                </p>
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                {(event.city || event.placeLabel) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F0F5F1] px-2.5 py-1 text-xs text-[#7A9982] dark:bg-[#162E24] dark:text-[#94a3b8]">
                    <MapPin className="h-3 w-3" />
                    {event.city || event.placeLabel}
                  </span>
                )}
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#F0F5F1] px-2.5 py-1 text-xs text-[#7A9982] dark:bg-[#162E24] dark:text-[#94a3b8]">
                  <Users className="h-3 w-3" />
                  {event.participantCount}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

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
        onClose={() => { setShowCreate(false); setForm({}); setInviteIds([]); setInviteInput('') }}
        title={t('events.modal.new')}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => { setShowCreate(false); setForm({}); setInviteIds([]); setInviteInput('') }}>{t('events.modal.cancel')}</Button>
            <Button variant="orange" size="sm" onClick={handleCreate} loading={creating} disabled={!form.title || !form.description}>{t('events.modal.create')}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Required */}
          <Input
            label={t('events.form.title')}
            value={form.title ?? ''}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder={t('events.form.titlePlaceholder')}
          />
          <div>
            <label className="block text-xs font-medium text-[#4B6B52] mb-1.5">{t('events.form.description')}</label>
            <textarea
              value={form.description ?? ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder={t('events.form.descriptionPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0B1210] text-[#111111] dark:text-[#E2F0E8] border border-[#C1CFC4] dark:border-[#1E4035] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#059669]/20 placeholder:text-[#94a3b8] resize-none"
            />
          </div>

          {/* Optional */}
          <div className="border-t border-[#F2F3F0] pt-4 flex flex-col gap-3">
            <p className="text-xs text-[#94a3b8] -mb-1">{t('events.form.optional')}</p>
            <Input label={t('events.form.dateTime')} type="datetime-local" value={form.scheduledAt ?? ''} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
            <Input label={t('events.form.place')} value={form.placeLabel ?? ''} onChange={e => setForm(f => ({ ...f, placeLabel: e.target.value }))} placeholder={t('events.form.placePlaceholder')} />
            <Input label={t('events.form.link')} value={form.meetingLink ?? ''} onChange={e => setForm(f => ({ ...f, meetingLink: e.target.value }))} placeholder="https://..." />
          </div>

          {/* Invite */}
          <div className="border-t border-[#F2F3F0] pt-4">
            <label className="block text-xs font-medium text-[#4B6B52] mb-1.5">{t('events.form.invite')}</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={inviteInput}
                onChange={e => setInviteInput(e.target.value)}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ',') && inviteInput.trim()) {
                    e.preventDefault()
                    const id = inviteInput.trim()
                    if (!inviteIds.includes(id)) setInviteIds(prev => [...prev, id])
                    setInviteInput('')
                  }
                }}
                placeholder={t('events.form.invitePlaceholder')}
                className="flex-1 px-3 py-2 text-sm border border-[#C1CFC4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
              />
              <button
                type="button"
                onClick={() => {
                  const id = inviteInput.trim()
                  if (id && !inviteIds.includes(id)) setInviteIds(prev => [...prev, id])
                  setInviteInput('')
                }}
                disabled={!inviteInput.trim()}
                className="px-3 py-2 text-sm bg-[#F0F5F1] hover:bg-[#e2e8f0] rounded-lg transition-colors disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {inviteIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {inviteIds.map(id => (
                  <span key={id} className="flex items-center gap-1 px-2 py-0.5 bg-[#ecfdf5] text-[#059669] text-xs rounded-full">
                    <User className="w-3 h-3" />
                    {id.length > 12 ? `${id.slice(0, 8)}…` : id}
                    <button type="button" onClick={() => setInviteIds(prev => prev.filter(i => i !== id))} className="ml-0.5 hover:text-[#047857]">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
