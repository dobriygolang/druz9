// Read-only scene renderer for ADR-003 layouts. The drag-to-edit
// counterpart (SceneEditor) lands in a follow-up — until then the page
// shows whatever the owner saved last.
import { useEffect, useState, type CSSProperties } from 'react'
import { sceneApi, type SceneLayout, type SceneLayoutResponse } from '@/features/Scene/api/sceneApi'
import { renderSceneItemArt } from './sceneItemArt'

interface SceneViewerProps {
  scope: 'user_room' | 'guild_hall'
  ownerId: string
  // Optional cosmetic-id → image-url map. Without it the viewer renders a
  // labelled placeholder so the layout shape is still visible.
  itemAssets?: Record<string, { src?: string; label?: string }>
  // Override the canvas height; width is responsive (100% of container).
  maxHeight?: number
  // Optional render slot: when provided, SceneViewer hands this layout
  // (and canEdit) to a child editor instead of rendering the read-only
  // canvas. Used by ProfilePage to flip the panel into edit mode.
  renderEditor?: (resp: SceneLayoutResponse, refresh: () => void) => React.ReactNode
}

export function SceneViewer({ scope, ownerId, itemAssets, maxHeight = 480, renderEditor }: SceneViewerProps) {
  const [resp, setResp] = useState<SceneLayoutResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = scope === 'user_room' ? sceneApi.getUserRoom(ownerId) : sceneApi.getGuildHall(ownerId)
    load
      .then((r) => { if (!cancelled) setResp(r) })
      .catch(() => { if (!cancelled) setError('Не удалось загрузить сцену') })
    return () => { cancelled = true }
  }, [scope, ownerId, reloadTick])

  if (error) return <SceneEmpty title="Ошибка" hint={error} />
  if (!resp) return <SceneEmpty title="Загрузка..." hint="" />

  if (renderEditor) {
    return <>{renderEditor(resp, () => setReloadTick((n) => n + 1))}</>
  }

  const layout = resp.layout
  if (!layout || layout.items.length === 0) {
    return (
      <SceneEmpty
        title={scope === 'user_room' ? 'Комната пуста' : 'Зал гильдии пуст'}
        hint={resp.canEdit ? 'Нажми «Редактировать», чтобы расставить предметы.' : 'Хозяин ещё не обустроил сцену.'}
      />
    )
  }

  return <SceneCanvas layout={layout} itemAssets={itemAssets} maxHeight={maxHeight} />
}

function SceneCanvas({
  layout,
  itemAssets,
  maxHeight,
}: { layout: SceneLayout; itemAssets?: SceneViewerProps['itemAssets']; maxHeight: number }) {
  // Aspect-ratio box: width fills container, height scales with the
  // layout's aspect ratio but is clamped to maxHeight.
  const aspect = layout.width / Math.max(1, layout.height)
  const containerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    maxHeight,
    aspectRatio: `${layout.width} / ${layout.height}`,
    background: layout.backgroundRef ? `url(${layout.backgroundRef}) center/cover` : 'var(--parch-1, #f6e9c8)',
    border: '3px solid var(--ink-0, #2a1a0c)',
    overflow: 'hidden',
    boxShadow: '4px 4px 0 var(--ink-0, #2a1a0c)',
  }

  return (
    <div style={containerStyle}>
      {[...layout.items]
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((it, idx) => {
          const asset = itemAssets?.[it.itemId]
          const xPct = (it.x / layout.width) * 100
          const yPct = (it.y / layout.height) * 100
          const sizePct = 12 * it.scale // base ~12% of canvas width per item
          const itemStyle: CSSProperties = {
            position: 'absolute',
            left: `${xPct}%`,
            top: `${yPct}%`,
            width: `${sizePct * aspect}%`,
            transform: `translate(-50%, -50%) rotate(${it.rotationDeg}deg) scaleX(${it.flipped ? -1 : 1})`,
            zIndex: it.zIndex,
            transformOrigin: 'center',
            pointerEvents: 'none',
          }
          return (
            <div
              key={`${it.itemId}-${idx}`}
              style={itemStyle}
            >
              {renderSceneItemArt(asset?.src, asset?.label ?? it.itemId, 4)}
            </div>
          )
        })}
    </div>
  )
}

function SceneEmpty({ title, hint }: { title: string; hint: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        minHeight: 220,
        background: 'var(--parch-1, #f6e9c8)',
        border: '3px dashed var(--ink-1, #5b4331)',
        color: 'var(--ink-0, #2a1a0c)',
        fontFamily: 'Pixelify Sans, Unbounded, monospace',
      }}
    >
      <div style={{ fontSize: 16, marginBottom: 6 }}>{title}</div>
      {hint && <div style={{ fontSize: 12, color: 'var(--ink-2, #7d6850)' }}>{hint}</div>}
    </div>
  )
}
