import { useEffect, useState, useCallback } from 'react'
import { Search } from 'lucide-react'
import { Map, Marker, type ViewStateChangeEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Avatar } from '@/shared/ui/Avatar'
import { geoApi, type CommunityPoint } from '@/features/Geo/api/geoApi'
import { ENV } from '@/shared/config/env'

const MAP_STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${ENV.MAPTILER_KEY}`

export function MapPage() {
  const [points, setPoints] = useState<CommunityPoint[]>([])
  const [search, setSearch] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [viewState, setViewState] = useState({
    longitude: 37.6,
    latitude: 55.75,
    zoom: 4,
  })

  useEffect(() => {
    geoApi.getCommunity().then(setPoints).catch(() => {})
  }, [])

  const handleMove = useCallback((e: ViewStateChangeEvent) => {
    setViewState(e.viewState)
  }, [])

  const filtered = points.filter(p => {
    if (!search) return true
    const name = `${p.firstName} ${p.lastName} ${p.username} ${p.region}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[500px]">
      {/* Map area */}
      <div className="flex-1 relative">
        <Map
          {...viewState}
          onMove={handleMove}
          mapStyle={MAP_STYLE}
          style={{ width: '100%', height: '100%' }}
        >
          {filtered.map((p) => (
            <Marker key={p.userId} longitude={p.longitude} latitude={p.latitude} anchor="center">
              <div
                className="relative"
                onMouseEnter={() => setHoveredId(p.userId)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-[#FF8400] border-2 border-white shadow-md cursor-pointer" />
                {hoveredId === p.userId && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-white rounded-lg shadow-lg border border-[#CBCCC9] whitespace-nowrap z-10">
                    <p className="text-xs font-medium text-[#111111]">{p.firstName} {p.lastName}</p>
                    {p.region && <p className="text-[10px] text-[#666666]">{p.region}</p>}
                  </div>
                )}
              </div>
            </Marker>
          ))}
        </Map>
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
          {filtered.map((p) => {
            const name = `${p.firstName} ${p.lastName}`.trim()
            return (
              <div key={p.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F2F3F0] cursor-pointer">
                <Avatar name={name} src={p.avatarUrl || undefined} size="sm" />
                <div>
                  <p className="text-sm font-medium text-[#111111]">{name}</p>
                  <p className="text-xs text-[#666666]">{p.region}</p>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-[#94a3b8] text-sm">Ничего не найдено</div>
          )}
        </div>
      </div>
    </div>
  )
}
