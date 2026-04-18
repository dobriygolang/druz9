import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import maplibregl, { Map as MaplibreMap, Marker as MaplibreMarker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Panel, RpgButton, Badge, PageHeader } from '@/shared/ui/pixel'
import { geoApi, WorldPinKind, type WorldPin, type CommunityPoint } from '@/features/Geo/api/geoApi'

// ---------- pin styling ----------

function pinColor(p: WorldPin): string {
  if (p.isHot) return 'var(--ember-1)'
  switch (p.kind) {
    case WorldPinKind.GUILD:  return 'var(--moss-1)'
    case WorldPinKind.EVENT:  return 'var(--r-legendary)'
    case WorldPinKind.PLAYER: return 'var(--r-epic)'
    default:                  return 'var(--ink-1)'
  }
}

// ---------- avatar drop marker ----------

function buildAvatarDropEl(cp: CommunityPoint): HTMLElement {
  const el = document.createElement('div')
  el.className = 'druz9-map-drop'
  el.title = cp.username || cp.firstName

  const size = 36
  const tipH = 10
  const total = size + tipH

  // We create an SVG drop shape: rounded top circle + downward triangular tip.
  // The avatar image is clipped inside the circle.
  const initials = ((cp.firstName || cp.username || '?').slice(0, 2)).toUpperCase()
  const clipId = `clip-${cp.userId.replace(/-/g, '')}`
  const bgColor = cp.isCurrentUser ? 'var(--ember-1, #b8692a)' : '#3a5f3a'

  let imgPart = ''
  if (cp.avatarUrl) {
    imgPart = `
      <image href="${cp.avatarUrl}" x="2" y="2" width="${size - 4}" height="${size - 4}"
             clip-path="url(#${clipId})"
             style="image-rendering:pixelated" preserveAspectRatio="xMidYMid slice"/>
    `
  }

  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${total}"
         viewBox="0 0 ${size} ${total}" style="display:block;overflow:visible">
      <defs>
        <clipPath id="${clipId}">
          <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}"/>
        </clipPath>
      </defs>
      <!-- drop border shadow -->
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="var(--ink-0,#1a1208)" />
      <polygon points="${size / 2 - 5},${size - 2} ${size / 2 + 5},${size - 2} ${size / 2},${total}"
               fill="var(--ink-0,#1a1208)"/>
      <!-- drop fill -->
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${bgColor}"/>
      <polygon points="${size / 2 - 4},${size - 3} ${size / 2 + 4},${size - 3} ${size / 2},${total - 1}"
               fill="${bgColor}"/>
      ${imgPart}
      <!-- initials fallback (hidden when avatar loads) -->
      ${cp.avatarUrl ? '' : `<text x="${size / 2}" y="${size / 2 + 5}" text-anchor="middle"
             font-family="Pixelify Sans,monospace" font-size="12" fill="#f5ede0">${initials}</text>`}
      <!-- online dot -->
      ${cp.activityStatus === 'online' ? `<circle cx="${size - 5}" cy="5" r="4" fill="#4caf50" stroke="var(--ink-0,#1a1208)" stroke-width="1.5"/>` : ''}
    </svg>
  `

  Object.assign(el.style, {
    cursor: 'pointer',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  })

  return el
}

// ---------- popup card ----------

function buildPopupHtml(cp: CommunityPoint): string {
  const name = cp.firstName || cp.username || '—'
  const statusLabel =
    cp.activityStatus === 'online' ? '🟢 онлайн' :
    cp.activityStatus === 'recently_active' ? '🟡 недавно' : '⚫ оффлайн'
  return `
    <div style="font-family:'Pixelify Sans',monospace;min-width:180px;max-width:240px">
      <div style="font-size:14px;font-weight:bold;margin-bottom:2px">${name}</div>
      <div style="font-size:10px;color:#888;margin-bottom:6px">@${cp.username}${cp.region ? ' · ' + cp.region : ''}</div>
      <div style="font-size:10px;margin-bottom:8px">${statusLabel}</div>
      <a href="/profile/${cp.userId}"
         style="display:inline-block;padding:4px 10px;background:#3a5f3a;color:#f5ede0;
                font-size:11px;font-family:Silkscreen,monospace;text-decoration:none;
                border:2px solid #1a1208;cursor:pointer">
        → профиль
      </a>
    </div>
  `
}

// ---------- OSM raster map style ----------

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
        'raster-saturation': -0.6,
        'raster-brightness-max': 0.9,
        'raster-contrast': 0.1,
      },
    },
  ],
}

// ---------- page ----------

export function MapPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [pins, setPins] = useState<WorldPin[]>([])
  const [community, setCommunity] = useState<CommunityPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<WorldPin | null>(null)
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<WorldPinKind | 'all'>('all')

  useEffect(() => {
    let cancelled = false
    Promise.all([geoApi.listWorldPins(), geoApi.getCommunity()])
      .then(([worldPins, communityPoints]) => {
        if (cancelled) return
        setPins(worldPins)
        setCommunity(communityPoints)
        if (worldPins.length > 0) setSelected(worldPins[0])
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

  const openPin = useCallback((p: WorldPin) => { setSelected(p) }, [])

  const visitPin = useCallback((p: WorldPin) => {
    if (p.linkPath) navigate(p.linkPath)
  }, [navigate])

  const playerCount = community.filter(c => c.activityStatus === 'online').length

  return (
    <>
      <PageHeader
        eyebrow={t('worldMap.eyebrow', 'Мир · карта')}
        title={t('worldMap.title', 'Карта мира')}
        subtitle={t('worldMap.subtitle', 'Гильдии, города, события и игроки на карте мира.')}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('worldMap.searchPlaceholder', 'поиск по названию…')}
              style={{
                padding: '8px 10px',
                border: '3px solid var(--ink-0)',
                background: 'var(--parch-0)',
                fontFamily: 'IBM Plex Sans, system-ui',
                width: 220,
                color: 'var(--ink-0)',
                outline: 'none',
                boxShadow: 'inset 2px 2px 0 var(--parch-3)',
              }}
            />
            <RpgButton size="sm" variant={kindFilter === 'all' ? 'primary' : 'default'} onClick={() => setKindFilter('all')}>все</RpgButton>
            <RpgButton size="sm" variant={kindFilter === WorldPinKind.GUILD ? 'primary' : 'default'} onClick={() => setKindFilter(WorldPinKind.GUILD)}>гильдии</RpgButton>
            <RpgButton size="sm" variant={kindFilter === WorldPinKind.EVENT ? 'primary' : 'default'} onClick={() => setKindFilter(WorldPinKind.EVENT)}>события</RpgButton>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18 }}>
        {/* Map */}
        <Panel style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
          <MapLibreCanvas
            pins={filtered}
            community={community}
            selected={selected}
            onSelect={openPin}
          />

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
            {playerCount > 0 && (
              <Badge variant="dark" style={{ background: 'var(--r-epic)', color: '#fff' }}>
                {playerCount} онлайн
              </Badge>
            )}
            <span style={{ flex: 1 }} />
            <span
              className="font-silkscreen uppercase"
              style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}
            >
              {loading ? 'загрузка…' : `${filtered.length} точек · ${community.length} игроков`}
            </span>
          </div>
        </Panel>

        {/* List */}
        <Panel style={{ padding: 0, height: 572, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '3px dashed var(--ink-3)' }}>
            <h3 className="font-display" style={{ fontSize: 17 }}>Реестр</h3>
            {selected ? (
              <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>
                выбрано: {selected.title}
              </div>
            ) : (
              <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.08em' }}>
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
                  <div className="rpg-sidenav__section" style={{ margin: '4px 10px' }}>{sec.k}</div>
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
                          <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ink-2)', letterSpacing: '0.08em' }}>
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

            {/* Players online */}
            {community.length > 0 && (
              <div>
                <div className="rpg-sidenav__section" style={{ margin: '4px 10px' }}>Игроки на карте</div>
                {community.slice(0, 20).map((cp) => (
                  <div
                    key={cp.userId}
                    onClick={() => navigate(`/profile/${cp.userId}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '6px 14px',
                      cursor: 'pointer',
                      borderLeft: '4px solid transparent',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--parch-2)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        background: 'var(--ink-0)',
                        color: 'var(--parch-0)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'Pixelify Sans, monospace',
                        fontSize: 11,
                        flexShrink: 0,
                        imageRendering: 'pixelated',
                        overflow: 'hidden',
                      }}
                    >
                      {cp.avatarUrl ? (
                        <img src={cp.avatarUrl} alt="" style={{ width: 28, height: 28, imageRendering: 'pixelated' }} />
                      ) : (
                        (cp.firstName || cp.username || '?').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Pixelify Sans, monospace', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cp.firstName || cp.username}
                      </div>
                      <div className="font-silkscreen uppercase" style={{ fontSize: 8, color: 'var(--ink-2)', letterSpacing: '0.06em' }}>
                        @{cp.username}{cp.region ? ' · ' + cp.region : ''}
                      </div>
                    </div>
                    {cp.activityStatus === 'online' && <Badge variant="moss" style={{ fontSize: 8 }}>онлайн</Badge>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </div>
    </>
  )
}

// ─── MapLibre canvas ───────────────────────────────────────────────────

function MapLibreCanvas({
  pins,
  community,
  selected,
  onSelect,
}: {
  pins: WorldPin[]
  community: CommunityPoint[]
  selected: WorldPin | null
  onSelect: (p: WorldPin) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MaplibreMap | null>(null)
  const pinMarkersRef = useRef<Map<string, MaplibreMarker>>(new globalThis.Map())
  const playerMarkersRef = useRef<Map<string, MaplibreMarker>>(new globalThis.Map())
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_RASTER_STYLE,
      center: [30, 50],
      zoom: 2,
      attributionControl: false,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      pinMarkersRef.current.clear()
      playerMarkersRef.current.clear()
    }
  }, [])

  // Sync guild/event markers.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const wanted = new Set(pins.map((p) => p.id))
    for (const [id, marker] of pinMarkersRef.current) {
      if (!wanted.has(id)) {
        marker.remove()
        pinMarkersRef.current.delete(id)
      }
    }
    for (const p of pins) {
      let marker = pinMarkersRef.current.get(p.id)
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
        // anchor: 'center' keeps the dot on the exact coordinate regardless of zoom.
        marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([p.longitude, p.latitude])
          .addTo(map)
        pinMarkersRef.current.set(p.id, marker)
      } else {
        marker.setLngLat([p.longitude, p.latitude])
      }
    }
  }, [pins, selected?.id])

  // Sync player avatar-drop markers.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const wanted = new Set(community.map((c) => c.userId))
    for (const [id, marker] of playerMarkersRef.current) {
      if (!wanted.has(id)) {
        marker.remove()
        playerMarkersRef.current.delete(id)
      }
    }
    for (const cp of community) {
      if (cp.latitude === 0 && cp.longitude === 0) continue

      let marker = playerMarkersRef.current.get(cp.userId)
      if (!marker) {
        const el = buildAvatarDropEl(cp)
        const popup = new maplibregl.Popup({ offset: [0, -8], closeButton: false, maxWidth: '260px' })
          .setHTML(buildPopupHtml(cp))

        marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([cp.longitude, cp.latitude])
          .setPopup(popup)
          .addTo(map)

        el.onclick = () => marker!.togglePopup()
        playerMarkersRef.current.set(cp.userId, marker)
      } else {
        marker.setLngLat([cp.longitude, cp.latitude])
      }
    }
  }, [community])

  // Fly to selected guild/event pin.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selected) return
    map.flyTo({ center: [selected.longitude, selected.latitude], zoom: Math.max(4, map.getZoom()), duration: 600 })
  }, [selected?.id])

  return <div ref={containerRef} style={{ width: '100%', height: 520 }} />
}
