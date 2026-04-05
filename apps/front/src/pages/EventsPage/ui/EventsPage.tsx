import { useEffect, useState } from 'react'
import { Calendar, MapPin, Users, Plus } from 'lucide-react'
import { eventApi, type Event, type CreateEventPayload } from '@/features/Event/api/eventApi'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Input } from '@/shared/ui/Input'

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

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Partial<CreateEventPayload>>({})

  useEffect(() => {
    eventApi.listEvents({ limit: 6 })
      .then(r => setEvents(r.events))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleJoin = async (id: string) => {
    try {
      const updated = await eventApi.joinEvent(id)
      setEvents(prev => prev.map(e => e.id === id ? updated : e))
    } catch {}
  }

  const handleCreate = async () => {
    if (!form.title || !form.scheduledAt) return
    setCreating(true)
    try {
      const created = await eventApi.createEvent(form as CreateEventPayload)
      setEvents(prev => [created, ...prev])
      setShowCreate(false)
      setForm({})
    } catch {} finally { setCreating(false) }
  }

  return (
    <div className="px-6 pt-4 pb-6">
      <div className="grid grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[180px] bg-white rounded-2xl border border-[#CBCCC9] animate-pulse" />
          ))
          : events.map((e) => (
            <Card key={e.id} padding="md" className="stagger-item flex flex-col gap-3 hover:border-[#94a3b8] transition-colors cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#fff7ed] flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#FF8400]" />
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
              {!e.isJoined && (
                <Button size="sm" variant="orange" className="w-full justify-center" onClick={() => handleJoin(e.id)}>
                  Участвовать
                </Button>
              )}
            </Card>
          ))
        }
        {/* Add event card */}
        <button
          onClick={() => setShowCreate(true)}
          className="h-[180px] border-2 border-dashed border-[#CBCCC9] rounded-2xl flex flex-col items-center justify-center gap-2 text-[#94a3b8] hover:border-[#FF8400] hover:text-[#FF8400] transition-colors"
        >
          <Plus className="w-6 h-6" />
          <span className="text-sm font-medium">Создать событие</span>
        </button>
      </div>

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
        </div>
      </Modal>
    </div>
  )
}
