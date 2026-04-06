import { useEffect, useState, useCallback } from 'react'
import { Search, Plus, Minus } from 'lucide-react'
import { Map, Marker, type ViewStateChangeEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Avatar } from '@/shared/ui/Avatar'
import { ErrorState } from '@/shared/ui/ErrorState'
import { geoApi, type CommunityPoint } from '@/features/Geo/api/geoApi'
import { ENV } from '@/shared/config/env'

const BASE_STYLE_URL = ENV.MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${ENV.MAPTILER_KEY}`
  : 'https://tiles.openfreemap.org/styles/positron'

// Recolor map layers to match site palette at load time
function applyCustomColors(style: Record<string, unknown>): Record<string, unknown> {
  const layers = style.layers as Record<string, unknown>[] | undefined
  if (!layers) return style
  return {
    ...style,
    layers: layers.map(layer => {
      if (layer.type === 'background') {
        return { ...layer, paint: { 'background-color': '#f0f1ee' } }
      }
      if (layer.type === 'fill' && (String(layer.id ?? '').toLowerCase().includes('water') || layer['source-layer'] === 'water')) {
        return { ...layer, paint: { ...(layer.paint as object), 'fill-color': '#cde0f5', 'fill-outline-color': '#b8cce8' } }
      }
      if (layer.type === 'line' && layer['source-layer'] === 'waterway') {
        return { ...layer, paint: { ...(layer.paint as object), 'line-color': '#b8cce8' } }
      }
      if (layer.type === 'fill' && (String(layer.id ?? '').toLowerCase().includes('park') || String(layer.id ?? '').toLowerCase().includes('green') || String(layer.id ?? '').toLowerCase().includes('grass'))) {
        return { ...layer, paint: { ...(layer.paint as object), 'fill-color': '#e4ede4' } }
      }
      if (layer.type === 'line' && layer['source-layer'] === 'boundary') {
        return { ...layer, paint: { ...(layer.paint as object), 'line-color': '#a0aec0' } }
      }
      return layer
    }),
  }
}

export function MapPage() {
  const [points, setPoints] = useState<CommunityPoint[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [mapStyle, setMapStyle] = useState<Record<string, unknown> | string>(BASE_STYLE_URL)
  const [viewState, setViewState] = useState({
    longitude: 37.6,
    latitude: 55.75,
    zoom: 4,
  })

  useEffect(() => {
    fetch(BASE_STYLE_URL)
      .then(r => r.json())
      .then(style => setMapStyle(applyCustomColors(style)))
      .catch(() => setMapStyle(BASE_STYLE_URL))
  }, [])

  const fetchPoints = useCallback(() => {
    setError(null)
    geoApi.getCommunity()
      .then(setPoints)
      .catch(() => setError('Не удалось загрузить данные'))
  }, [])

  useEffect(() => {
    fetchPoints()
  }, [fetchPoints])

  const handleMove = useCallback((e: ViewStateChangeEvent) => {
    setViewState(e.viewState)
  }, [])

  const filtered = points.filter(p => {
    if (!search) return true
    const name = `${p.firstName} ${p.lastName} ${p.username} ${p.region}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); fetchPoints() }} />

  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[500px]">
      {/* Map area */}
      <div className="flex-1 relative">
        <Map
          {...viewState}
          onMove={handleMove}
          mapStyle={mapStyle as string}
          style={{ width: '100%', height: '100%' }}
          attributionControl={false}
        >
          {filtered.map((p) => (
            <Marker key={p.userId} longitude={p.longitude} latitude={p.latitude} anchor="bottom">
              <div
                className="relative flex flex-col items-center cursor-pointer group"
                onMouseEnter={() => setHoveredId(p.userId)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setViewState(v => ({ ...v, longitude: p.longitude, latitude: p.latitude, zoom: Math.min(v.zoom + 3, 14) }))}
              >
                {/* Tooltip */}
                {hoveredId === p.userId && (
                  <div className="absolute bottom-full mb-1 px-3 py-1.5 bg-white rounded-lg shadow-lg border border-[#CBCCC9] whitespace-nowrap z-20 pointer-events-none">
                    <p className="text-xs font-medium text-[#111111]">{p.firstName} {p.lastName}</p>
                    {p.region && <p className="text-[10px] text-[#666666]">{p.region}</p>}
                  </div>
                )}
                {/* Avatar circle */}
                <div className="w-10 h-10 rounded-full border-2 border-white shadow-lg overflow-hidden transition-transform duration-150 group-hover:scale-110"
                  style={{ background: '#6366F1' }}>
                  {p.avatarUrl
                    ? <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                        {(p.firstName?.[0] ?? p.username?.[0] ?? '?').toUpperCase()}
                      </div>
                  }
                </div>
                {/* Droplet tail */}
                <div className="w-0 h-0 -mt-px" style={{
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '8px solid white',
                  filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.15))',
                }} />
              </div>
            </Marker>
          ))}
        </Map>

        {/* Zoom controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
          <button
            onClick={() => setViewState(v => ({ ...v, zoom: Math.min(v.zoom + 1, 18) }))}
            className="w-9 h-9 bg-white rounded-xl shadow border border-[#CBCCC9] flex items-center justify-center text-[#111111] hover:bg-[#F2F3F0] hover:border-[#6366F1] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewState(v => ({ ...v, zoom: Math.max(v.zoom - 1, 1) }))}
            className="w-9 h-9 bg-white rounded-xl shadow border border-[#CBCCC9] flex items-center justify-center text-[#111111] hover:bg-[#F2F3F0] hover:border-[#6366F1] transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
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
