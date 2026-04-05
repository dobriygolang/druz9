import { useState } from 'react'
import { Plus, Users, Trophy, Gamepad2 } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'

export function AdminCodeGamePage() {
  const [rooms] = useState<any[]>([])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]">Code Game</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Управление игровыми комнатами</p>
        </div>
        <Button variant="orange">
          <Plus className="w-4 h-4" /> Новая комната
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Активных игроков', value: 0, icon: <Users className="w-5 h-5 text-[#6366f1]" /> },
          { label: 'Активных комнат', value: rooms.length, icon: <Gamepad2 className="w-5 h-5 text-[#FF8400]" /> },
          { label: 'Завершённых игр', value: 0, icon: <Trophy className="w-5 h-5 text-[#f59e0b]" /> },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#f1f5f9] flex items-center justify-center">{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-[#0f172a]">{s.value}</p>
              <p className="text-xs text-[#64748b]">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Rooms table */}
      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#e2e8f0] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0f172a]">Активные комнаты</h3>
        </div>
        {rooms.length === 0 ? (
          <div className="py-16 text-center">
            <Gamepad2 className="w-10 h-10 mx-auto mb-3 text-[#CBCCC9]" />
            <p className="text-sm text-[#94a3b8]">Нет активных игровых комнат</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f8fafc]">
            {rooms.map((room: any, i) => (
              <div key={room.id ?? i} className="flex items-center gap-4 px-5 py-3.5">
                <p className="text-sm font-medium text-[#0f172a]">{room.id}</p>
                <Badge variant="success">Active</Badge>
                <span className="text-xs text-[#64748b] flex items-center gap-1">
                  <Users className="w-3 h-3" /> {room.participants?.length ?? 0}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
