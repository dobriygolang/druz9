import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Code2, Users, Plus, ChevronRight, Copy, Check, EyeOff } from 'lucide-react'
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
  const [rooms, setRooms] = useState<Room[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [mode, setMode] = useState('ROOM_MODE_ALL')
  const [isPrivate, setIsPrivate] = useState(false)
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    codeRoomApi.listRooms().then(setRooms).catch(() => {})
  }, [])

  const getRoomShareUrl = (room: Room) =>
    room.isPrivate && room.inviteCode
      ? `${window.location.origin}/code-rooms/join/${room.inviteCode}`
      : `${window.location.origin}/code-rooms/${room.id}`

  const copyRoomLink = (room: Room) => {
    navigator.clipboard.writeText(getRoomShareUrl(room)).then(() => {
      setCopiedId(room.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const { room } = await codeRoomApi.createRoom({ mode, isPrivate })
      setCreatedRoom(room)
      setRooms(prev => [room, ...prev])
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
        <Button variant="orange" size="md" className="gap-2" onClick={() => { setMode('ROOM_MODE_ALL'); setIsPrivate(false); setCreatedRoom(null); setShowCreate(true) }}>
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
                    {room.isPrivate && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-[#f1f5f9] text-[#64748b] rounded-full">
                        <EyeOff className="w-3 h-3" /> Приват
                      </span>
                    )}
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
                onClick={() => copyRoomLink(room)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#666666] dark:text-[#4d6380] hover:text-[#111111] dark:hover:text-[#c8d8ec] hover:bg-[#F2F3F0] dark:hover:bg-[#1a2236] rounded-lg transition-colors"
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
              <Button variant="secondary" size="sm" onClick={() => { copyRoomLink(createdRoom); }}>
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
                {getRoomShareUrl(createdRoom)}
              </code>
              <button
                onClick={() => copyRoomLink(createdRoom)}
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
            <button
              type="button"
              onClick={() => setIsPrivate(prev => !prev)}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-colors text-left ${
                isPrivate ? 'border-[#6366F1] bg-[#f0f0ff]' : 'border-[#CBCCC9] bg-white hover:border-[#94a3b8]'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isPrivate ? 'bg-[#6366F1]' : 'bg-[#F2F3F0]'}`}>
                <EyeOff className={`w-4 h-4 ${isPrivate ? 'text-white' : 'text-[#94a3b8]'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isPrivate ? 'text-[#4f46e5]' : 'text-[#111111]'}`}>Приватная комната</p>
                <p className="text-xs text-[#666666] mt-0.5">Войти можно только по инвайт-ссылке</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                isPrivate ? 'border-[#6366F1] bg-[#6366F1]' : 'border-[#CBCCC9]'
              }`}>
                {isPrivate && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
