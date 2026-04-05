import { useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { Avatar } from '@/shared/ui/Avatar'
import type { User } from '@/entities/User/model/types'

export function MapPage() {
  const [_users] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const mapRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[500px]">
      {/* Map area */}
      <div ref={mapRef} className="flex-1 bg-[#0c1120] relative flex items-center justify-center">
        <div className="text-center text-[#475569]">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[#1e293b] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
          </div>
          <p className="text-sm font-medium">Карта участников</p>
          <p className="text-xs mt-1">Интерактивная карта загружается...</p>
        </div>
        {/* Sample pins */}
        {[
          { top: '40%', left: '35%', name: 'АИ' },
          { top: '55%', left: '55%', name: 'МП' },
          { top: '30%', left: '60%', name: 'ДС' },
        ].map((pin, i) => (
          <div
            key={i}
            className="absolute w-8 h-8 rounded-full bg-[#FF8400] border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-lg cursor-pointer hover:scale-110 transition-transform"
            style={{ top: pin.top, left: pin.left }}
            title={pin.name}
          >
            {pin.name[0]}
          </div>
        ))}
      </div>

      {/* Right panel */}
      <div className="w-[280px] bg-white border-l border-[#CBCCC9] flex flex-col">
        <div className="p-4 border-b border-[#CBCCC9]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск участников..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F2F3F0] border border-[#CBCCC9] rounded-lg focus:outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          {[
            { name: 'Алексей Иванов', city: 'Москва' },
            { name: 'Мария Петрова', city: 'СПб' },
            { name: 'Дмитрий Смирнов', city: 'Казань' },
          ].filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()))
            .map((u, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F2F3F0] cursor-pointer">
                <Avatar name={u.name} size="sm" />
                <div>
                  <p className="text-sm font-medium text-[#111111]">{u.name}</p>
                  <p className="text-xs text-[#666666]">{u.city}</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
