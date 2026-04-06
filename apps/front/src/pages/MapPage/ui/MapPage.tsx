import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, Plus, Minus, X, ExternalLink } from 'lucide-react'
import { Map, Marker, type ViewStateChangeEvent } from 'react-map-gl/maplibre'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const [points, setPoints] = useState<CommunityPoint[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<CommunityPoint | null>(null)
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
                onClick={() => {
                  setSelectedPoint(p)
                  setViewState(v => ({ ...v, longitude: p.longitude, latitude: p.latitude, zoom: Math.min(v.zoom + 2, 14) }))
                }}
              >
                {/* Hover tooltip */}
                {hoveredId === p.userId && selectedPoint?.userId !== p.userId && (
                  <div className="absolute bottom-full mb-1 px-3 py-1.5 bg-white rounded-lg shadow-lg border border-[#CBCCC9] whitespace-nowrap z-20 pointer-events-none">
                    <p className="text-xs font-medium text-[#111111]">{p.firstName} {p.lastName}</p>
                    {p.region && <p className="text-[10px] text-[#666666]">{p.region}</p>}
                  </div>
                )}
                {/* Avatar circle */}
                <div
                  className={`w-10 h-10 rounded-full border-2 shadow-lg overflow-hidden transition-all duration-150 group-hover:scale-110 ${selectedPoint?.userId === p.userId ? 'border-[#6366F1] scale-110' : 'border-white'}`}
                  style={{ background: '#6366F1' }}
                >
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
                  borderTop: `8px solid ${selectedPoint?.userId === p.userId ? '#6366F1' : 'white'}`,
                  filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.15))',
                }} />
              </div>
            </Marker>
          ))}
        </Map>

        {/* Selected user card (fixed, via portal) */}
        {selectedPoint && createPortal(
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-modal-in">
            <div className="bg-white rounded-2xl shadow-modal border border-[#e2e8f0] p-4 flex items-center gap-4 min-w-[280px] max-w-[360px]">
              <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-[#6366F1]" style={{ background: '#6366F1' }}>
                {selectedPoint.avatarUrl
                  ? <img src={selectedPoint.avatarUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold">
                      {(selectedPoint.firstName?.[0] ?? selectedPoint.username?.[0] ?? '?').toUpperCase()}
                    </div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#111111] truncate">
                  {`${selectedPoint.firstName} ${selectedPoint.lastName}`.trim() || selectedPoint.username}
                </p>
                {selectedPoint.region && (
                  <p className="text-xs text-[#666666] mt-0.5">{selectedPoint.region}</p>
                )}
                <button
                  onClick={() => navigate(`/profile/${selectedPoint.userId}`)}
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#6366F1] hover:text-[#4F46E5] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Перейти в профиль
                </button>
              </div>
              <button
                onClick={() => setSelectedPoint(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F2F3F0] flex-shrink-0"
              >
                <X className="w-3.5 h-3.5 text-[#94a3b8]" />
              </button>
            </div>
          </div>,
          document.body,
        )}

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
              <div
                key={p.userId}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedPoint?.userId === p.userId ? 'bg-[#EEF2FF]' : 'hover:bg-[#F2F3F0]'}`}
                onClick={() => {
                  setSelectedPoint(p)
                  setViewState(v => ({ ...v, longitude: p.longitude, latitude: p.latitude, zoom: Math.min(v.zoom + 2, 14) }))
                }}
              >
                <Avatar name={name} src={p.avatarUrl || undefined} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#111111] truncate">{name}</p>
                  <p className="text-xs text-[#666666]">{p.region}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/profile/${p.userId}`) }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#E0E7FF] text-[#94a3b8] hover:text-[#6366F1] transition-colors flex-shrink-0"
                  title="Перейти в профиль"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
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
