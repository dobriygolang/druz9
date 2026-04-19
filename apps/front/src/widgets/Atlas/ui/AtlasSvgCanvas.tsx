// ADR-002 — SVG-based world atlas. Loads /img/big_map.svg as an <img>
// inside a pan/zoom container. Click-to-zoom on regions ships in a
// follow-up; right now this is a self-contained alternative to the
// MapLibre-based /map view that fixes "не вся карта помещается" by
// fitting the canvas to the viewport and offering wheel/touch zoom.
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'

interface AtlasSvgCanvasProps {
  // Path to the SVG asset (relative to /public). Defaults to big_map.svg.
  src?: string
  // Optional click overlay points: percentage of viewBox. Renders as
  // small dots that emit `onPointClick` with the point's id.
  points?: Array<{ id: string; xPct: number; yPct: number; label?: string }>
  onPointClick?: (id: string) => void
  labels?: {
    zoomIn?: string
    zoomOut?: string
    reset?: string
    status?: (zoom: number) => string
  }
  // Container height. Width is always 100% of parent.
  height?: number
}

const MIN_ZOOM = 0.5
const MAX_ZOOM = 6

export function AtlasSvgCanvas({
  src = '/img/big_map.svg',
  points = [],
  onPointClick,
  labels,
  height = 640,
}: AtlasSvgCanvasProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  // Wheel zoom — zoom around the cursor, not the centre.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      setZoom((z) => {
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
        const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor))
        // Adjust pan so the point under the cursor stays under the cursor.
        const ratio = next / z
        setPan((p) => ({
          x: cx - (cx - p.x) * ratio,
          y: cy - (cy - p.y) * ratio,
        }))
        return next
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Pointer-drag pan. Window-level listeners keep the gesture alive when
  // the pointer leaves the canvas.
  const startPan = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const startX = e.clientX
    const startY = e.clientY
    const startPan = pan
    const pid = e.pointerId
    const move = (mv: PointerEvent) => {
      if (mv.pointerId !== pid) return
      setPan({ x: startPan.x + (mv.clientX - startX), y: startPan.y + (mv.clientY - startY) })
    }
    const up = (mv: PointerEvent) => {
      if (mv.pointerId !== pid) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }, [pan])

  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  const wrapStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    height,
    overflow: 'hidden',
    background: 'var(--ink-0, #131618)',
    border: '3px solid var(--ink-0, #2a1a0c)',
    boxShadow: '4px 4px 0 var(--ember-1, #b34a18)',
    cursor: 'grab',
    touchAction: 'none',
    userSelect: 'none',
  }

  // The SVG fills the wrapper. Pan + zoom are applied via CSS transform
  // for GPU-accelerated movement; the underlying <img> never re-renders.
  const innerStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: '0 0',
    transition: 'transform 60ms linear',
    pointerEvents: 'none',
  }

  return (
    <div ref={wrapRef} style={wrapStyle} onPointerDown={startPan}>
      <div style={innerStyle}>
        <img
          src={src}
          alt="atlas"
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
        {/* Overlay points scale with the inner transform automatically. */}
        {points.map((p) => (
          <button
            key={p.id}
            onClick={(e) => { e.stopPropagation(); onPointClick?.(p.id) }}
            title={p.label}
            style={{
              position: 'absolute',
              left: `${p.xPct}%`,
              top: `${p.yPct}%`,
              transform: 'translate(-50%, -50%)',
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: '2px solid var(--ink-0, #2a1a0c)',
              background: 'var(--ember-1, #b34a18)',
              cursor: 'pointer',
              pointerEvents: 'auto',
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* Floating zoom controls. Sit above the pan/zoom layer so clicks
          don't get swallowed by the drag handler. */}
      <div style={{
        position: 'absolute', right: 12, top: 12,
        display: 'flex', flexDirection: 'column', gap: 6, zIndex: 10,
      }}>
        <Btn ariaLabel={labels?.zoomIn ?? 'Zoom in'} onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.25))}>+</Btn>
        <Btn ariaLabel={labels?.zoomOut ?? 'Zoom out'} onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.25))}>−</Btn>
        <Btn ariaLabel={labels?.reset ?? 'Reset'} onClick={reset}>⟳</Btn>
      </div>
      <div style={{
        position: 'absolute', left: 12, bottom: 8,
        fontFamily: 'Pixelify Sans, monospace', fontSize: 11,
        color: 'var(--parch-0, #fbf3dd)', background: 'rgba(0,0,0,0.4)',
        padding: '2px 8px', borderRadius: 4, zIndex: 10, pointerEvents: 'none',
      }}>
        {labels?.status?.(Math.round(zoom * 100)) ?? `zoom ${Math.round(zoom * 100)}% · drag to pan · wheel to zoom`}
      </div>
    </div>
  )
}

function Btn({ children, onClick, ariaLabel }: { children: React.ReactNode; onClick: () => void; ariaLabel: string }) {
  return (
    <button
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        width: 32, height: 32,
        background: 'var(--parch-0, #fbf3dd)',
        border: '2px solid var(--ink-0, #2a1a0c)',
        boxShadow: '2px 2px 0 var(--ink-0, #2a1a0c)',
        fontFamily: 'Pixelify Sans, monospace',
        fontSize: 18,
        cursor: 'pointer',
        color: 'var(--ink-0, #2a1a0c)',
      }}
    >{children}</button>
  )
}
