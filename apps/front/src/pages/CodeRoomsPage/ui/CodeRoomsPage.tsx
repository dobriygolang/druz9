import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Code2, Users, Plus, Swords, ChevronRight } from 'lucide-react'
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi'
import type { Room } from '@/entities/CodeRoom/model/types'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'Любая' },
  { value: 'TASK_DIFFICULTY_EASY', label: 'Easy' },
  { value: 'TASK_DIFFICULTY_MEDIUM', label: 'Medium' },
  { value: 'TASK_DIFFICULTY_HARD', label: 'Hard' },
]

const MODE_LABELS: Record<string, string> = {
  ROOM_MODE_ALL: 'Совместная',
  ROOM_MODE_DUEL: 'Дуэль',
}

const STATUS_LABELS: Record<string, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  ROOM_STATUS_WAITING: { label: 'Ожидание', variant: 'warning' },
  ROOM_STATUS_ACTIVE: { label: 'Активна', variant: 'success' },
  ROOM_STATUS_FINISHED: { label: 'Завершена', variant: 'default' },
}

export function CodeRoomsPage() {
  const navigate = useNavigate()
  const [rooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [mode, setMode] = useState('ROOM_MODE_ALL')
  const [difficulty, setDifficulty] = useState('')

  useEffect(() => {
    // Rooms are loaded per user - show empty state initially
    setLoading(false)
  }, [])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const { room } = await codeRoomApi.createRoom({ mode, difficulty: difficulty || undefined })
      navigate(`/code-rooms/${room.id}`)
    } catch {} finally { setCreating(false) }
  }

  return (
    <div className="px-6 pt-4 pb-6">
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <input
            placeholder="Поиск комнат..."
            className="w-full pl-4 pr-4 py-2 bg-[#F2F3F0] border border-[#CBCCC9] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20"
          />
        </div>
        <Select options={DIFFICULTY_OPTIONS} value={difficulty} onChange={setDifficulty} placeholder="Сложность" className="w-36" />
      </div>

      <div className="flex gap-4">
        {/* Room list */}
        <div className="flex-1 flex flex-col gap-3">
          {rooms.length === 0 && !loading && (
            <div className="text-center py-16 text-[#94a3b8]">
              <Code2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">Нет активных комнат</p>
              <p className="text-xs mt-1">Создайте новую или присоединитесь по ссылке</p>
            </div>
          )}
          {rooms.map((room) => {
            const st = STATUS_LABELS[room.status] ?? { label: room.status, variant: 'default' }
            return (
              <Link
                key={room.id}
                to={`/code-rooms/${room.id}`}
                className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-[#CBCCC9] hover:border-[#94a3b8] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#f1f5f9] flex items-center justify-center flex-shrink-0">
                  <Code2 className="w-5 h-5 text-[#6366f1]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#18181b]">{room.task || 'Без задачи'}</p>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-[#64748b]">{MODE_LABELS[room.mode] ?? room.mode}</span>
                    <span className="flex items-center gap-1 text-xs text-[#64748b]">
                      <Users className="w-3 h-3" /> {room.participants.length}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#CBCCC9]" />
              </Link>
            )
          })}
        </div>

        {/* Right sidebar */}
        <div className="w-[300px] flex-shrink-0 flex flex-col gap-3">
          {/* Solo card */}
          <Card padding="md">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center">
                <Code2 className="w-4 h-4 text-[#6366f1]" />
              </div>
              <h3 className="text-sm font-semibold text-[#18181b]">Solo практика</h3>
            </div>
            <p className="text-xs text-[#64748b] mb-3">Решай задачи в своём темпе без давления времени</p>
            <Button variant="secondary" size="sm" className="w-full justify-center" onClick={() => navigate('/practice/solo')}>
              Начать
            </Button>
          </Card>

          {/* Duel card */}
          <Card padding="md" dark orangeBorder>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#1e293b] flex items-center justify-center">
                <Swords className="w-4 h-4 text-[#FF8400]" />
              </div>
              <h3 className="text-sm font-semibold text-[#e2e8f0]">Дуэль</h3>
            </div>
            <p className="text-xs text-[#94a3b8] mb-3">Создай комнату-дуэль и пригласи соперника по ссылке</p>
            <Button
              variant="orange"
              size="sm"
              className="w-full justify-center"
              onClick={() => { setMode('ROOM_MODE_DUEL'); setShowCreate(true) }}
            >
              Создать дуэль
            </Button>
          </Card>

          {/* Create room */}
          <Button variant="secondary" className="w-full justify-center gap-2" onClick={() => { setMode('ROOM_MODE_ALL'); setShowCreate(true) }}>
            <Plus className="w-4 h-4" /> Создать комнату
          </Button>
        </div>
      </div>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Новая комнат"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Отмена</Button>
            <Button variant="orange" size="sm" onClick={handleCreate} loading={creating}>Создать</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Select
            label="Режим"
            options={[{ value: 'ROOM_MODE_ALL', label: 'Совместная' }, { value: 'ROOM_MODE_DUEL', label: 'Дуэль' }]}
            value={mode}
            onChange={setMode}
          />
          <Select label="Сложность" options={DIFFICULTY_OPTIONS} value={difficulty} onChange={setDifficulty} />
        </div>
      </Modal>
    </div>
  )
}
