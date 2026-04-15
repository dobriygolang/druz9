import { useEffect, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import type maplibregl from 'maplibre-gl'
import type { CommunityPoint } from '@/features/Geo/api/geoApi'
import { loadMapLibre } from '@/shared/lib/loadMapLibre'

type ViewState = {
  longitude: number
  latitude: number
  zoom: number
}

type Props = {
  className?: string
  mapStyle: Record<string, unknown> | string
  onSelectPoint: (point: CommunityPoint) => void
  onViewStateChange: (viewState: ViewState) => void
  points: CommunityPoint[]
  selectedPointId?: string | null
  viewState: ViewState
}

function createMarkerElement(point: CommunityPoint, isSelected: boolean, onSelectPoint: (point: CommunityPoint) => void) {
  const root = document.createElement('button')
  root.type = 'button'
  root.style.cssText = 'position:relative;display:flex;flex-direction:column;align-items:center;background:transparent;border:0;padding:0;cursor:pointer;'

  const tooltip = document.createElement('div')
  tooltip.style.cssText = 'position:absolute;bottom:100%;margin-bottom:4px;padding:6px 12px;border:1px solid #CBCCC9;border-radius:12px;background:#ffffff;box-shadow:0 12px 24px rgba(15,23,42,0.12);white-space:nowrap;pointer-events:none;opacity:0;transform:translateY(4px);transition:opacity 150ms ease, transform 150ms ease;z-index:20;'

  const title = document.createElement('p')
  title.textContent = `${point.firstName} ${point.lastName}`.trim() || point.username || 'Member'
  title.style.cssText = 'margin:0;font-size:12px;font-weight:600;color:#111111;'
  tooltip.appendChild(title)

  if (point.region) {
    const region = document.createElement('p')
    region.textContent = point.region
    region.style.cssText = 'margin:2px 0 0;font-size:10px;color:#666666;'
    tooltip.appendChild(region)
  }

  const circle = document.createElement('div')
  circle.style.cssText = `width:40px;height:40px;border-radius:9999px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#6366F1;border:2px solid ${isSelected ? '#6366F1' : '#ffffff'};box-shadow:0 10px 18px rgba(15,23,42,0.2);transform:${isSelected ? 'scale(1.1)' : 'scale(1)'};transition:transform 150ms ease,border-color 150ms ease;`

  if (point.avatarUrl) {
    const image = document.createElement('img')
    image.src = point.avatarUrl
    image.alt = ''
    image.style.cssText = 'width:100%;height:100%;object-fit:cover;'
    circle.appendChild(image)
  } else {
    const initial = document.createElement('div')
    initial.textContent = (point.firstName?.[0] ?? point.username?.[0] ?? '?').toUpperCase()
    initial.style.cssText = 'font-size:14px;font-weight:700;color:#ffffff;'
    circle.appendChild(initial)
  }

  const tail = document.createElement('div')
  tail.style.cssText = `width:0;height:0;margin-top:-1px;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid ${isSelected ? '#6366F1' : '#ffffff'};filter:drop-shadow(0 2px 2px rgba(0,0,0,0.15));`

  root.addEventListener('mouseenter', () => {
    if (!isSelected) {
      tooltip.style.opacity = '1'
      tooltip.style.transform = 'translateY(0)'
      circle.style.transform = 'scale(1.1)'
    }
  })

  root.addEventListener('mouseleave', () => {
    tooltip.style.opacity = '0'
    tooltip.style.transform = 'translateY(4px)'
    circle.style.transform = isSelected ? 'scale(1.1)' : 'scale(1)'
  })

  root.addEventListener('click', event => {
    event.stopPropagation()
    onSelectPoint(point)
  })

  root.appendChild(tooltip)
  root.appendChild(circle)
  root.appendChild(tail)

  return root
}

export function CommunityMapCanvas({
  className,
  mapStyle,
  onSelectPoint,
  onViewStateChange,
  points,
  selectedPointId,
  viewState,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const syncRef = useRef(false)
  const initialMapStyleRef = useRef(mapStyle)
  const initialViewStateRef = useRef(viewState)
  const onViewStateChangeRef = useRef(onViewStateChange)
  const [loadError, setLoadError] = useState<string | null>(null)

  onViewStateChangeRef.current = onViewStateChange

  useEffect(() => {
    let cancelled = false
    let detachMove: (() => void) | null = null
    let detachResize: (() => void) | null = null

    loadMapLibre()
      .then(maplibre => {
        if (cancelled || !containerRef.current || mapRef.current) return

        const map = new maplibre.Map({
          container: containerRef.current,
          style: initialMapStyleRef.current as maplibregl.StyleSpecification | string,
          center: [initialViewStateRef.current.longitude, initialViewStateRef.current.latitude],
          zoom: initialViewStateRef.current.zoom,
          attributionControl: false,
        })

        const handleMove = () => {
          if (syncRef.current) return
          const center = map.getCenter()
          onViewStateChangeRef.current({
            longitude: center.lng,
            latitude: center.lat,
            zoom: map.getZoom(),
          })
        }

        map.on('move', handleMove)
        detachMove = () => map.off('move', handleMove)
        mapRef.current = map

        // The flex layout may not have settled at init time, so the canvas starts tiny.
        // Resize immediately on the next frame to pick up the correct container size,
        // then keep watching via ResizeObserver for any subsequent layout changes.
        requestAnimationFrame(() => {
          if (!cancelled) map.resize()
        })
        if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
          const ro = new ResizeObserver(() => map.resize())
          ro.observe(containerRef.current)
          detachResize = () => ro.disconnect()
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('Failed to load the map')
        }
      })

    return () => {
      cancelled = true
      detachMove?.()
      detachResize?.()
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = []
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.setStyle(mapStyle as maplibregl.StyleSpecification | string)
  }, [mapStyle])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const center = map.getCenter()
    const zoom = map.getZoom()
    const shouldSync = (
      Math.abs(center.lng - viewState.longitude) > 0.0001 ||
      Math.abs(center.lat - viewState.latitude) > 0.0001 ||
      Math.abs(zoom - viewState.zoom) > 0.0001
    )

    if (!shouldSync) return

    syncRef.current = true
    map.jumpTo({
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
    })
    requestAnimationFrame(() => {
      syncRef.current = false
    })
  }, [viewState.latitude, viewState.longitude, viewState.zoom])

  useEffect(() => {
    let cancelled = false

    loadMapLibre().then(maplibre => {
      const map = mapRef.current
      if (cancelled || !map) return

      markersRef.current.forEach(marker => marker.remove())
      markersRef.current = points.map(point => {
        const marker = new maplibre.Marker({
          element: createMarkerElement(point, selectedPointId === point.userId, onSelectPoint),
          anchor: 'bottom',
        })

        marker.setLngLat([point.longitude, point.latitude]).addTo(map)
        return marker
      })
    }).catch(() => {})

    return () => {
      cancelled = true
    }
  }, [mapStyle, onSelectPoint, points, selectedPointId])

  return (
    <div className={className ?? ''}>
      <div className="relative h-full w-full">
        <div ref={containerRef} className="community-map-shell h-full w-full" />
        {loadError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#f8fafc]/88 backdrop-blur">
            <div className="rounded-2xl border border-[#d8d9d6] bg-white px-5 py-4 text-center shadow-lg">
              <p className="text-sm font-semibold text-[#111111]">{loadError}</p>
              <p className="mt-1 text-xs text-[#667085]">Check your network and try again.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
