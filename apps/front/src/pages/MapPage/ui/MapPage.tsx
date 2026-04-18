import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import maplibregl, { Map as MaplibreMap, Marker as MaplibreMarker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Panel, RpgButton, Badge, PageHeader } from '@/shared/ui/pixel'
import { geoApi, WorldPinKind, type WorldPin } from '@/features/Geo/api/geoApi'

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
          <MapLibreCanvas pins={filtered} selected={selected} onSelect={openPin} />

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

// ─── MapLibre canvas ────────────────────────────────────────────────────
// We render real map tiles (OSM raster via OSM's free provider, not Mapbox)
// and tint the whole canvas with a warm parchment overlay so it still reads
// as "druz9 map" rather than a bare world-view. Markers are plain DOM nodes
// — cheap enough for a few hundred pins, and they inherit the pixel UI
// styles.

const OSM_RASTER_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      paint: {
        // Desaturate + warm tint to match the parchment theme.
        'raster-saturation': -0.6,
        'raster-brightness-max': 0.9,
        'raster-contrast': 0.1,
      },
    },
  ],
}

function MapLibreCanvas({
  pins,
  selected,
  onSelect,
}: {
  pins: WorldPin[]
  selected: WorldPin | null
  onSelect: (p: WorldPin) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MaplibreMap | null>(null)
  const markersRef = useRef<Map<string, MaplibreMarker>>(new globalThis.Map())
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  // Initialise map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_RASTER_STYLE,
      center: [30, 50], // roughly eastern Europe — our primary audience
      zoom: 2,
      attributionControl: false,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      markersRef.current.clear()
    }
  }, [])

  // Sync markers with pin list. Diff-based so we don't flicker on each render.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const wanted = new Set(pins.map((p) => p.id))
    // Drop markers that were removed from the list.
    for (const [id, marker] of markersRef.current) {
      if (!wanted.has(id)) {
        marker.remove()
        markersRef.current.delete(id)
      }
    }
    // Add new markers + update existing ones.
    for (const p of pins) {
      let marker = markersRef.current.get(p.id)
      const el = marker?.getElement() ?? document.createElement('div')
      el.className = 'druz9-map-pin'
      el.style.cssText = `
        width: ${p.isHot ? 16 : 12}px;
        height: ${p.isHot ? 16 : 12}px;
        background: ${pinColor(p)};
        border: 2px solid var(--ink-0);
        box-shadow: 2px 2px 0 var(--ink-0);
        cursor: pointer;
        outline: ${selected?.id === p.id ? '2px solid var(--ember-3)' : 'none'};
        outline-offset: 2px;
      `
      el.title = p.title
      el.onclick = (e) => {
        e.stopPropagation()
        onSelectRef.current(p)
      }
      if (!marker) {
        marker = new maplibregl.Marker({ element: el }).setLngLat([p.longitude, p.latitude]).addTo(map)
        markersRef.current.set(p.id, marker)
      } else {
        marker.setLngLat([p.longitude, p.latitude])
      }
    }
  }, [pins, selected?.id])

  // Fly to selected pin without re-centering on every unrelated render.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selected) return
    map.flyTo({ center: [selected.longitude, selected.latitude], zoom: Math.max(4, map.getZoom()) })
  }, [selected?.id])

  return <div ref={containerRef} style={{ width: '100%', height: 520 }} />
}
