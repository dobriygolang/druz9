import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Panel, RpgButton, Badge, PageHeader } from '@/shared/ui/pixel'
import { Fireflies } from '@/shared/ui/sprites'
import { geoApi, WorldPinKind, type WorldPin } from '@/features/Geo/api/geoApi'

// ---------- projection ----------
//
// Simplified equirectangular projection good enough for a pixel-style map:
// the SVG viewBox is exactly 360×180 (degrees), so lat/lon map directly to
// x/y coordinates. Pins are clamped to the viewport so mis-entered
// coordinates don't fly off-screen.

const VIEW_W = 360
const VIEW_H = 180

function project(lat: number, lon: number): { x: number; y: number } {
  const x = Math.max(0, Math.min(VIEW_W, lon + 180))
  const y = Math.max(0, Math.min(VIEW_H, 90 - lat))
  return { x, y }
}

// ---------- pin styling ----------

function pinColor(p: WorldPin): string {
  if (p.isHot) return 'var(--ember-1)'
  switch (p.kind) {
    case WorldPinKind.GUILD:
      return 'var(--moss-1)'
    case WorldPinKind.EVENT:
      return 'var(--r-legendary)'
    case WorldPinKind.PLAYER:
      return 'var(--r-epic)'
    default:
      return 'var(--ink-1)'
  }
}

function pinKindLabel(kind: WorldPinKind): string {
  switch (kind) {
    case WorldPinKind.GUILD: return 'гильдия'
    case WorldPinKind.EVENT: return 'событие'
    case WorldPinKind.PLAYER: return 'игрок'
    default: return '—'
  }
}

// ---------- Continents (simplified pixel-friendly polygons) ----------
//
// Very low-poly continental outlines, designed to read as "world map" in a
// pixelated style. Coordinates are lon/lat expressed directly in the
// 360×180 viewBox space (note: y grows downward, so higher latitudes have
// smaller y-values).

const CONTINENT_POLYGONS: { d: string; fill: string; opacity?: number }[] = [
  // North America (rough continental shape)
  { d: 'M 20,20 L 90,20 L 110,40 L 105,60 L 90,75 L 70,80 L 55,95 L 40,95 L 30,75 L 15,55 Z', fill: '#6b8a6a' },
  // South America
  { d: 'M 90,90 L 115,85 L 125,105 L 120,135 L 105,150 L 95,135 L 90,110 Z', fill: '#6b8a6a' },
  // Africa
  { d: 'M 175,60 L 215,55 L 225,80 L 220,110 L 200,135 L 185,135 L 170,105 L 170,80 Z', fill: '#b8692a' },
  // Europe
  { d: 'M 170,35 L 220,30 L 240,45 L 235,60 L 215,65 L 195,62 L 175,55 Z', fill: '#3d6149' },
  // Asia
  { d: 'M 225,25 L 320,25 L 335,50 L 340,70 L 320,85 L 290,85 L 260,75 L 230,65 L 225,45 Z', fill: '#3d6149' },
  // Oceania
  { d: 'M 300,115 L 340,110 L 350,130 L 335,145 L 310,140 L 295,125 Z', fill: '#b8692a' },
  // Antarctica strip
  { d: 'M 5,165 L 355,165 L 355,178 L 5,178 Z', fill: '#e8eef3', opacity: 0.6 },
  // Greenland blob
  { d: 'M 125,15 L 145,18 L 150,32 L 140,40 L 125,35 Z', fill: '#c0cad2' },
]

// ---------- page ----------

export function MapPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [pins, setPins] = useState<WorldPin[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<WorldPin | null>(null)
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<WorldPinKind | 'all'>('all')

  useEffect(() => {
    let cancelled = false
    geoApi
      .listWorldPins()
      .then((list) => {
        if (cancelled) return
        setPins(list)
        if (list.length > 0) setSelected(list[0])
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return pins.filter((p) => {
      if (kindFilter !== 'all' && p.kind !== kindFilter) return false
      if (!q) return true
      return p.title.toLowerCase().includes(q) || p.region.toLowerCase().includes(q)
    })
  }, [pins, search, kindFilter])

  const sections = useMemo(() => [
    { k: 'Гильдии', items: filtered.filter(p => p.kind === WorldPinKind.GUILD) },
    { k: 'События', items: filtered.filter(p => p.kind === WorldPinKind.EVENT) },
  ], [filtered])

  const openPin = useCallback((p: WorldPin) => {
    setSelected(p)
  }, [])

  const visitPin = useCallback((p: WorldPin) => {
    if (p.linkPath) navigate(p.linkPath)
  }, [navigate])

  return (
    <>
      <PageHeader
        eyebrow={t('worldMap.eyebrow', 'Мир · карта')}
        title={t('worldMap.title', 'Карта мира')}
        subtitle={t('worldMap.subtitle', 'Гильдии, города и события на карте мира в пикселях.')}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('worldMap.searchPlaceholder', 'поиск по названию или региону…')}
              style={{
                padding: '8px 10px',
                border: '3px solid var(--ink-0)',
                background: 'var(--parch-0)',
                fontFamily: 'IBM Plex Sans, system-ui',
                width: 240,
                color: 'var(--ink-0)',
                outline: 'none',
                boxShadow: 'inset 2px 2px 0 var(--parch-3)',
              }}
            />
            <RpgButton
              size="sm"
              variant={kindFilter === 'all' ? 'primary' : 'default'}
              onClick={() => setKindFilter('all')}
            >
              все
            </RpgButton>
            <RpgButton
              size="sm"
              variant={kindFilter === WorldPinKind.GUILD ? 'primary' : 'default'}
              onClick={() => setKindFilter(WorldPinKind.GUILD)}
            >
              гильдии
            </RpgButton>
            <RpgButton
              size="sm"
              variant={kindFilter === WorldPinKind.EVENT ? 'primary' : 'default'}
              onClick={() => setKindFilter(WorldPinKind.EVENT)}
            >
              события
            </RpgButton>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18 }}>
        {/* Map */}
        <Panel style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
          <div
            style={{
              height: 520,
              position: 'relative',
              background: '#ecdcb2',
              backgroundImage:
                // subtle parchment grid
                'repeating-linear-gradient(90deg, transparent 0 40px, rgba(59,42,26,0.06) 40px 41px), repeating-linear-gradient(0deg, transparent 0 40px, rgba(59,42,26,0.06) 40px 41px)',
            }}
          >
            {/* The world itself, rendered as a single SVG so shape-rendering:crispEdges
                keeps the pixelated look consistent across zoom levels. */}
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              preserveAspectRatio="none"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
              }}
              shapeRendering="crispEdges"
            >
              {/* ocean wash */}
              <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="#d4e5ec" opacity="0.35" />
              {/* continents */}
              {CONTINENT_POLYGONS.map((c, i) => (
                <path key={i} d={c.d} fill={c.fill} opacity={c.opacity ?? 0.85} stroke="#2a1f14" strokeWidth="0.5" />
              ))}
              {/* equator / tropics faint lines */}
              <line x1="0" y1="90" x2={VIEW_W} y2="90" stroke="#2a1f14" strokeOpacity="0.15" strokeDasharray="2 3" strokeWidth="0.5" />
              <line x1="0" y1="66.5" x2={VIEW_W} y2="66.5" stroke="#2a1f14" strokeOpacity="0.1" strokeDasharray="1 4" strokeWidth="0.3" />
              <line x1="0" y1="113.5" x2={VIEW_W} y2="113.5" stroke="#2a1f14" strokeOpacity="0.1" strokeDasharray="1 4" strokeWidth="0.3" />

              {/* pins */}
              {filtered.map((p) => {
                const { x, y } = project(p.latitude, p.longitude)
                const color = pinColor(p)
                const isSel = selected?.id === p.id
                const size = p.isHot ? 5 : 4
                return (
                  <g key={p.id} style={{ cursor: 'pointer' }} onClick={() => openPin(p)}>
                    {/* halo for selected */}
                    {isSel && (
                      <rect
                        x={x - size - 2}
                        y={y - size - 2}
                        width={(size + 2) * 2}
                        height={(size + 2) * 2}
                        fill="none"
                        stroke="var(--ember-3)"
                        strokeWidth="1.5"
                        shapeRendering="crispEdges"
                      />
                    )}
                    <rect
                      x={x - size / 2}
                      y={y - size / 2}
                      width={size}
                      height={size}
                      fill={color}
                      stroke="#2a1f14"
                      strokeWidth="0.6"
                    />
                  </g>
                )
              })}
            </svg>

            <Fireflies count={6} />

            {/* Hovered pin tooltip */}
            {selected && (
              <div
                style={{
                  position: 'absolute',
                  left: `${(project(selected.latitude, selected.longitude).x / VIEW_W) * 100}%`,
                  top: `${(project(selected.latitude, selected.longitude).y / VIEW_H) * 100}%`,
                  transform: 'translate(-50%, -100%) translateY(-10px)',
                  background: 'var(--parch-0)',
                  border: '2px solid var(--ink-0)',
                  boxShadow: '2px 2px 0 var(--ink-0)',
                  padding: '4px 8px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 12 }}>
                  {selected.title}
                </div>
                <div
                  className="font-silkscreen uppercase"
                  style={{ fontSize: 8, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                >
                  {pinKindLabel(selected.kind)}{selected.subtitle ? ` · ${selected.subtitle}` : ''}
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div
            style={{
              padding: 12,
              borderTop: '3px dashed var(--ink-3)',
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <Badge variant="moss">гильдии</Badge>
            <Badge variant="ember">события ближайших 24ч</Badge>
            <Badge variant="dark">города</Badge>
            <span style={{ flex: 1 }} />
            <span
              className="font-silkscreen uppercase"
              style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
            >
              {loading ? 'загрузка…' : `${filtered.length} / ${pins.length} точек`}
            </span>
          </div>
        </Panel>

        {/* List */}
        <Panel style={{ padding: 0, height: 572, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '3px dashed var(--ink-3)' }}>
            <h3 className="font-display" style={{ fontSize: 17 }}>Реестр</h3>
            {selected ? (
              <div
                className="font-silkscreen uppercase"
                style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
              >
                выбрано: {selected.title}
              </div>
            ) : (
              <div
                className="font-silkscreen uppercase"
                style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em' }}
              >
                кликни по точке на карте
              </div>
            )}
          </div>

          <div style={{ overflow: 'auto', flex: 1, padding: '6px 0' }}>
            {loading && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-2)' }}>Загрузка карты…</div>
            )}
            {!loading && filtered.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-2)' }}>
                Ничего не найдено. Создай гильдию или событие, чтобы появилась точка.
              </div>
            )}

            {sections.map((sec) =>
              sec.items.length === 0 ? null : (
                <div key={sec.k}>
                  <div className="rpg-sidenav__section" style={{ margin: '4px 10px' }}>
                    {sec.k}
                  </div>
                  {sec.items.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => openPin(p)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 14px',
                        background: selected?.id === p.id ? 'var(--parch-2)' : 'transparent',
                        borderLeft: selected?.id === p.id ? '4px solid var(--ember-1)' : '4px solid transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          background: pinColor(p),
                          border: '2px solid var(--ink-0)',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: 'Pixelify Sans, monospace',
                            fontSize: 13,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {p.title}
                        </div>
                        {p.subtitle && (
                          <div
                            className="font-silkscreen uppercase"
                            style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
                          >
                            {p.subtitle}
                          </div>
                        )}
                      </div>
                      {p.linkPath && (
                        <RpgButton size="sm" onClick={(e) => { e.stopPropagation(); visitPin(p) }}>
                          открыть
                        </RpgButton>
                      )}
                    </div>
                  ))}
                </div>
              ),
            )}
          </div>
        </Panel>
      </div>
    </>
  )
}
