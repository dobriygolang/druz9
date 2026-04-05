import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Code2, Users, Plus, ChevronRight, Copy, Check } from 'lucide-react'
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi'
import type { Room } from '@/entities/CodeRoom/model/types'
import { Card } from '@/shared/ui/Card'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'

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
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [mode, setMode] = useState('ROOM_MODE_ALL')
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyRoomLink = (roomId: string) => {
    const url = `${window.location.origin}/code-rooms/${roomId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(roomId)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const { room } = await codeRoomApi.createRoom({ mode })
      setCreatedRoom(room)
    } catch {} finally { setCreating(false) }
  }

  const handleGoToRoom = () => {
    if (createdRoom) {
      navigate(`/code-rooms/${createdRoom.id}`)
    }
  }

  return (
    <div className="px-6 pt-4 pb-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-[#111111]">Code Rooms</h1>
          <p className="text-xs text-[#666666] mt-0.5">Совместное решение задач в реальном времени</p>
        </div>
        <Button variant="orange" size="md" className="gap-2" onClick={() => { setMode('ROOM_MODE_ALL'); setCreatedRoom(null); setShowCreate(true) }}>
          <Plus className="w-4 h-4" /> Создать комнату
        </Button>
      </div>

      {/* Room list */}
      <div className="flex flex-col gap-3">
        {rooms.length === 0 && (
          <Card padding="lg" className="text-center py-16">
            <Code2 className="w-10 h-10 mx-auto mb-3 text-[#94a3b8] opacity-40" />
            <p className="text-sm font-medium text-[#666666]">Нет активных комнат</p>
            <p className="text-xs text-[#94a3b8] mt-1">Создайте комнату или присоединитесь по ссылке</p>
          </Card>
        )}
        {rooms.map((room) => {
          const st = STATUS_LABELS[room.status] ?? { label: room.status, variant: 'default' as const }
          return (
            <div
              key={room.id}
              className="stagger-item flex items-center gap-4 p-4 bg-white rounded-2xl border border-[#CBCCC9] hover:border-[#94a3b8] transition-colors"
            >
              <Link
                to={`/code-rooms/${room.id}`}
                className="flex items-center gap-4 flex-1 min-w-0 no-underline"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F2F3F0] flex items-center justify-center flex-shrink-0">
                  <Code2 className="w-5 h-5 text-[#6366f1]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#111111]">{room.task || 'Без задачи'}</p>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-[#666666]">{MODE_LABELS[room.mode] ?? room.mode}</span>
                    <span className="flex items-center gap-1 text-xs text-[#666666]">
                      <Users className="w-3 h-3" /> {room.participants.length}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#CBCCC9]" />
              </Link>
              <button
                onClick={() => copyRoomLink(room.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#666666] hover:text-[#111111] hover:bg-[#F2F3F0] rounded-lg transition-colors"
                title="Скопировать ссылку"
              >
                {copiedId === room.id ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copiedId === room.id ? 'Скопировано' : 'Ссылка'}</span>
              </button>
            </div>
          )
        })}
      </div>

      {/* Create room modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={createdRoom ? 'Комната создана' : 'Новая комната'}
        footer={
          createdRoom ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => { copyRoomLink(createdRoom.id); }}>
                {copiedId === createdRoom.id ? <><Check className="w-3.5 h-3.5" /> Скопировано</> : <><Copy className="w-3.5 h-3.5" /> Скопировать ссылку</>}
              </Button>
              <Button variant="orange" size="sm" onClick={handleGoToRoom}>Перейти в комнату</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Отмена</Button>
              <Button variant="orange" size="sm" onClick={handleCreate} loading={creating}>Создать</Button>
            </>
          )
        }
      >
        {createdRoom ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[#666666]">Комната готова. Скопируйте ссылку и отправьте её участникам.</p>
            <div className="flex items-center gap-2 p-3 bg-[#F2F3F0] rounded-lg">
              <code className="flex-1 text-xs text-[#111111] font-mono truncate">
                {window.location.origin}/code-rooms/{createdRoom.id}
              </code>
              <button
                onClick={() => copyRoomLink(createdRoom.id)}
                className="flex-shrink-0 p-1.5 hover:bg-[#E7E8E5] rounded-md transition-colors"
              >
                {copiedId === createdRoom.id ? <Check className="w-4 h-4 text-[#22c55e]" /> : <Copy className="w-4 h-4 text-[#666666]" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Select
              label="Режим"
              options={[{ value: 'ROOM_MODE_ALL', label: 'Совместная' }, { value: 'ROOM_MODE_DUEL', label: 'Дуэль' }]}
              value={mode}
              onChange={setMode}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
