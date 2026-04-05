import { useEffect, useState, useCallback } from 'react'
import { Users, Plus, Hash, Search } from 'lucide-react'
import { circleApi, type CreateCirclePayload } from '@/features/Circle/api/circleApi'
import type { Circle } from '@/entities/Circle/model/types'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Input } from '@/shared/ui/Input'
import { ErrorState } from '@/shared/ui/ErrorState'
import { useToast } from '@/shared/ui/Toast'

export function CirclesPage() {
  const { toast } = useToast()
  const [circles, setCircles] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<Partial<CreateCirclePayload & { tagsInput: string }>>({})

  const fetchCircles = useCallback(() => {
    setError(null)
    setLoading(true)
    circleApi.listCircles({ limit: 20 })
      .then(r => setCircles(r.circles))
      .catch(() => setError('Не удалось загрузить круги'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchCircles()
  }, [fetchCircles])

  const handleJoin = async (id: string) => {
    try {
      await circleApi.joinCircle(id)
      setCircles(prev => prev.map(c => c.id === id ? { ...c, isJoined: true, memberCount: c.memberCount + 1 } : c))
      toast('Вы вступили в круг', 'success')
    } catch {
      toast('Не удалось вступить', 'error')
    }
  }

  const handleLeave = async (id: string) => {
    try {
      await circleApi.leaveCircle(id)
      setCircles(prev => prev.map(c => c.id === id ? { ...c, isJoined: false, memberCount: Math.max(c.memberCount - 1, 0) } : c))
      toast('Вы покинули круг', 'success')
    } catch {
      toast('Не удалось покинуть круг', 'error')
    }
  }

  const handleCreate = async () => {
    if (!form.name) return
    setCreating(true)
    try {
      const tags = (form.tagsInput ?? '').split(',').map(t => t.trim()).filter(Boolean)
      const created = await circleApi.createCircle({
        name: form.name,
        description: form.description ?? '',
        tags,
      })
      setCircles(prev => [created, ...prev])
      setShowCreate(false)
      setForm({})
      toast('Круг создан', 'success')
    } catch {
      toast('Не удалось создать круг', 'error')
    } finally { setCreating(false) }
  }

  const filtered = search
    ? circles.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase()) ||
        c.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
      )
    : circles

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchCircles() }} />

  return (
    <div className="px-4 md:px-6 pt-4 pb-4 md:pb-6">
      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск кругов..."
          className="pl-9 pr-4 py-2 w-full max-w-[320px] bg-white border border-[#CBCCC9] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[220px] bg-white rounded-2xl border border-[#CBCCC9] animate-pulse" />
          ))
          : filtered.length === 0
            ? (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#f0f0ee] flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-[#94a3b8]" />
                </div>
                <p className="text-base font-semibold text-[#111111] mb-1">Кругов пока нет</p>
                <p className="text-sm text-[#666666] mb-4">Создайте первый круг по интересам</p>
                <Button variant="orange" size="sm" onClick={() => setShowCreate(true)}>
                  Создать круг
                </Button>
              </div>
            )
            : filtered.map(c => (
              <Card key={c.id} padding="md" className="stagger-item flex flex-col gap-3 hover:border-[#94a3b8] transition-colors">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#eff6ff] flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#6366f1]" />
                  </div>
                  {c.isJoined && <Badge variant="success">Участник</Badge>}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#111111] line-clamp-1">{c.name}</h3>
                  {c.description && (
                    <p className="text-xs text-[#666666] mt-1 line-clamp-2">{c.description}</p>
                  )}
                </div>
                {c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {c.tags.slice(0, 4).map(tag => (
                      <span key={tag} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-[#f0f0ee] rounded-full text-[11px] text-[#666666]">
                        <Hash className="w-2.5 h-2.5" />{tag}
                      </span>
                    ))}
                    {c.tags.length > 4 && (
                      <span className="px-2 py-0.5 text-[11px] text-[#94a3b8]">+{c.tags.length - 4}</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-auto">
                  <span className="flex items-center gap-1 text-xs text-[#666666]">
                    <Users className="w-3 h-3" /> {c.memberCount} участников
                  </span>
                </div>
                {c.isJoined ? (
                  <Button size="sm" variant="secondary" className="w-full justify-center" onClick={() => handleLeave(c.id)}>
                    Покинуть
                  </Button>
                ) : (
                  <Button size="sm" variant="orange" className="w-full justify-center" onClick={() => handleJoin(c.id)}>
                    Вступить
                  </Button>
                )}
              </Card>
            ))
        }
        {/* Add circle card */}
        {!loading && filtered.length > 0 && (
          <button
            onClick={() => setShowCreate(true)}
            className="h-[220px] border-2 border-dashed border-[#CBCCC9] rounded-2xl flex flex-col items-center justify-center gap-2 text-[#94a3b8] hover:border-[#6366F1] hover:text-[#6366F1] transition-colors"
          >
            <Plus className="w-6 h-6" />
            <span className="text-sm font-medium">Создать круг</span>
          </button>
        )}
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Новый круг"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Отмена</Button>
            <Button variant="orange" size="sm" onClick={handleCreate} loading={creating}>Создать</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Название" value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Название круга" />
          <Input label="Описание" value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Краткое описание" />
          <Input label="Теги (через запятую)" value={form.tagsInput ?? ''} onChange={e => setForm(f => ({ ...f, tagsInput: e.target.value }))} placeholder="golang, backend, карьера" />
        </div>
      </Modal>
    </div>
  )
}
