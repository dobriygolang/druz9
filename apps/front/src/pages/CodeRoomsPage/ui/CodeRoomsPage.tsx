import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Code2, Users, Plus, ChevronRight, Copy, Check, EyeOff } from 'lucide-react'
import { codeRoomApi } from '@/features/CodeRoom/api/codeRoomApi'
import type { Room } from '@/entities/CodeRoom/model/types'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
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
  const isMobile = useIsMobile()
  const [rooms, setRooms] = useState<Room[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [mode, setMode] = useState('ROOM_MODE_ALL')
  const [isPrivate, setIsPrivate] = useState(false)
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    codeRoomApi.listRooms().then(setRooms).catch((err) => { console.error('CodeRoomsPage fetch error:', err) })
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
    <div className={isMobile ? 'px-4 pt-4 pb-24' : 'px-6 pt-4 pb-6'}>
      {isMobile ? (
        <div className="section-enter mb-5 overflow-hidden rounded-[30px] border border-[#d8d9d6] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(238,242,255,0.94)_52%,_rgba(255,247,237,0.92))] p-5 shadow-[0_18px_34px_rgba(15,23,42,0.08)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6366F1]">Code Rooms</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-bold leading-none text-[#111111]">{rooms.length}</h1>
              <p className="mt-2 text-sm leading-6 text-[#475569]">Совместное решение задач, дуэли и приватные комнаты с инвайтами.</p>
            </div>
            <div className="rounded-[24px] border border-white/80 bg-white/78 px-4 py-3 text-right shadow-sm backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#667085]">Приватных</p>
              <p className="mt-2 font-mono text-xl font-bold text-[#111111]">{rooms.filter(room => room.isPrivate).length}</p>
            </div>
          </div>
          <Button
            variant="orange"
            size="md"
            className="mt-4 w-full justify-center gap-2 rounded-2xl"
            onClick={() => { setMode('ROOM_MODE_ALL'); setIsPrivate(false); setCreatedRoom(null); setShowCreate(true) }}
          >
            <Plus className="w-4 h-4" /> Создать комнату
          </Button>
        </div>
      ) : (
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#111111]">Code Rooms</h1>
            <p className="mt-0.5 text-xs text-[#666666]">Совместное решение задач в реальном времени</p>
          </div>
          <Button variant="orange" size="md" className="gap-2" onClick={() => { setMode('ROOM_MODE_ALL'); setIsPrivate(false); setCreatedRoom(null); setShowCreate(true) }}>
            <Plus className="w-4 h-4" /> Создать комнату
          </Button>
        </div>
      )}

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
              className={`stagger-item bg-white transition-colors ${
                isMobile
                  ? 'flex flex-col gap-3 rounded-[24px] border border-[#d8d9d6] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]'
                  : 'flex items-center gap-4 rounded-2xl border border-[#CBCCC9] p-4 hover:border-[#94a3b8]'
              }`}
            >
              <Link
                to={`/code-rooms/${room.id}`}
                className={`flex flex-1 min-w-0 gap-4 no-underline ${isMobile ? 'items-start' : 'items-center'}`}
              >
                <div className={`flex flex-shrink-0 items-center justify-center rounded-xl ${isMobile ? 'h-11 w-11 bg-[#EEF2FF]' : 'h-10 w-10 bg-[#F2F3F0]'}`}>
                  <Code2 className="w-5 h-5 text-[#6366f1]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`flex gap-2 ${isMobile ? 'flex-wrap' : 'items-center'}`}>
                    <p className="text-sm font-semibold text-[#111111]">{room.task || 'Без задачи'}</p>
                    <Badge variant={st.variant}>{st.label}</Badge>
                    {room.isPrivate && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-[#f1f5f9] text-[#64748b] rounded-full">
                        <EyeOff className="w-3 h-3" /> Приват
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-xs text-[#666666]">{MODE_LABELS[room.mode] ?? room.mode}</span>
                    <span className="flex items-center gap-1 text-xs text-[#666666]">
                      <Users className="w-3 h-3" /> {room.participants.length}
                    </span>
                  </div>
                </div>
                {!isMobile && <ChevronRight className="w-4 h-4 text-[#CBCCC9]" />}
              </Link>
              <button
                onClick={() => copyRoomLink(room)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[#666666] transition-colors hover:bg-[#F2F3F0] hover:text-[#111111] dark:text-[#4d6380] dark:hover:bg-[#1a2236] dark:hover:text-[#c8d8ec] ${
                  isMobile ? 'w-full justify-center border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2.5 font-medium' : ''
                }`}
                title="Скопировать ссылку"
              >
                {copiedId === room.id ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
                <span className={isMobile ? '' : 'hidden sm:inline'}>{copiedId === room.id ? 'Скопировано' : 'Ссылка'}</span>
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
