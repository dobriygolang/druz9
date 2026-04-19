// ADR-003 — Scene editor for Hero Room and Guild Hall.
//
// Drag-and-drop without react-dnd: native pointer events on a relative
// container, with selection + keyboard delete + size/rotate handles.
// Items render as <SceneItem> children that share the same coordinate
// system as SceneViewer (percentage of canvas) so saved layouts look
// identical when re-rendered read-only.
import { useEffect, useMemo, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type KeyboardEvent } from 'react'
import { sceneApi, type PlacedItem, type SceneLayout } from '@/features/Scene/api/sceneApi'
import { shopApi } from '@/features/Shop/api/shopApi'
import type { OwnedItem } from '@/features/Shop/model/types'
import { renderSceneItemArt } from './sceneItemArt'

interface SceneEditorProps {
  scope: 'user_room' | 'guild_hall'
  ownerId: string
  initial?: SceneLayout | null
  onSaved?: (next: SceneLayout) => void
  onCancel?: () => void
  maxHeight?: number
}

interface DraftItem extends PlacedItem {
  // Stable client-side key independent of itemId so duplicates render
  // correctly during drag.
  k: string
}

function makeDraftKey() { return Math.random().toString(36).slice(2, 10) }

export function SceneEditor({ scope, ownerId, initial, onSaved, onCancel, maxHeight = 480 }: SceneEditorProps) {
  const width = initial?.width ?? 1200
  const height = initial?.height ?? 800
  const [items, setItems] = useState<DraftItem[]>(() =>
    (initial?.items ?? []).map((it) => ({ ...it, k: makeDraftKey() })),
  )
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [owned, setOwned] = useState<OwnedItem[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    shopApi.getInventory().then((list) => { if (!cancelled) setOwned(list) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const aspect = width / Math.max(1, height)
  const containerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    maxHeight,
    aspectRatio: `${width} / ${height}`,
    background: 'var(--parch-1, #f6e9c8)',
    border: '3px solid var(--ember-1, #b34a18)',
    overflow: 'hidden',
    boxShadow: '4px 4px 0 var(--ink-0, #2a1a0c)',
    cursor: 'crosshair',
    userSelect: 'none',
    touchAction: 'none',
  }

  const updateSelected = (patch: Partial<PlacedItem>) => {
    if (!selectedKey) return
    setItems((arr) => arr.map((it) => (it.k === selectedKey ? { ...it, ...patch } : it)))
  }
  const removeSelected = () => {
    if (!selectedKey) return
    setItems((arr) => arr.filter((it) => it.k !== selectedKey))
    setSelectedKey(null)
  }
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      removeSelected()
    }
  }

  const startDrag = (key: string) => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    e.preventDefault()
    setSelectedKey(key)
    // Capture the canvas rect *once* — using window-level events instead of
    // bound-element listeners means the drag continues even when the
    // pointer leaves the canvas. The previous version listened on the
    // parent element, which silently dropped pointermove the moment the
    // pointer crossed into a sibling div.
    const canvas = e.currentTarget.parentElement
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const pointerId = e.pointerId

    const move = (mv: PointerEvent) => {
      if (mv.pointerId !== pointerId) return
      const x = ((mv.clientX - rect.left) / rect.width) * width
      const y = ((mv.clientY - rect.top) / rect.height) * height
      setItems((arr) => arr.map((it) => (it.k === key
        ? { ...it, x: clamp(x, 0, width), y: clamp(y, 0, height) }
        : it)))
    }
    const up = (mv: PointerEvent) => {
      if (mv.pointerId !== pointerId) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  // Resize via corner-handle drag: each pixel moved scales the item by a
  // small factor. Same window-level pointer pattern as startDrag so the
  // gesture survives leaving the canvas.
  const startResize = (key: string) => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const initial = items.find((i) => i.k === key)
    if (!initial) return
    const startScale = initial.scale
    const pointerId = e.pointerId

    const move = (mv: PointerEvent) => {
      if (mv.pointerId !== pointerId) return
      // Average dx/dy keeps proportional scaling intuitive on diagonal drags.
      const delta = ((mv.clientX - startX) + (mv.clientY - startY)) / 2
      const next = Math.max(0.3, Math.min(4, startScale + delta / 200))
      setItems((arr) => arr.map((it) => (it.k === key ? { ...it, scale: next } : it)))
    }
    const up = (mv: PointerEvent) => {
      if (mv.pointerId !== pointerId) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const addItem = (itemId: string) => {
    setItems((arr) => [
      ...arr,
      {
        k: makeDraftKey(),
        itemId,
        x: width / 2,
        y: height / 2,
        scale: 1,
        rotationDeg: 0,
        zIndex: arr.length,
        flipped: false,
      },
    ])
    setPickerOpen(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        width,
        height,
        backgroundRef: initial?.backgroundRef ?? '',
        items: items.map(({ k: _k, ...rest }) => rest),
      }
      const fn = scope === 'user_room' ? sceneApi.updateUserRoom : sceneApi.updateGuildHall
      const res = await fn(ownerId, payload)
      onSaved?.(res.layout)
    } catch (e) {
      setError((e as Error).message ?? 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  const ownedById = useMemo(() => {
    const m = new Map<string, OwnedItem>()
    owned?.forEach((o) => m.set(o.item.id, o))
    return m
  }, [owned])

  return (
    <div onKeyDown={onKey} tabIndex={0} style={{ outline: 'none' }}>
      <div style={containerStyle} onPointerDown={() => setSelectedKey(null)}>
        {[...items].sort((a, b) => a.zIndex - b.zIndex).map((it) => {
          const xPct = (it.x / width) * 100
          const yPct = (it.y / height) * 100
          const sizePct = 12 * it.scale
          const isSel = it.k === selectedKey
          const meta = ownedById.get(it.itemId)
          const itemStyle: CSSProperties = {
            position: 'absolute',
            left: `${xPct}%`,
            top: `${yPct}%`,
            width: `${sizePct * aspect}%`,
            transform: `translate(-50%, -50%) rotate(${it.rotationDeg}deg) scaleX(${it.flipped ? -1 : 1})`,
            zIndex: it.zIndex,
            cursor: 'move',
            outline: isSel ? '2px solid var(--ember-1, #b34a18)' : '2px solid transparent',
            outlineOffset: 2,
            transformOrigin: 'center',
          }
          return (
            <div key={it.k} style={{ ...itemStyle, touchAction: 'none' }} onPointerDown={startDrag(it.k)}>
              {/* Resize handle: drag the bottom-right corner to scale the
                  item. Sits inside the rotated container so visual feedback
                  stays correct on rotated items. */}
              {isSel && (
                <div
                  onPointerDown={startResize(it.k)}
                  style={{
                    position: 'absolute',
                    right: -8,
                    bottom: -8,
                    width: 16,
                    height: 16,
                    background: 'var(--ember-1, #b34a18)',
                    border: '2px solid var(--ink-0, #2a1a0c)',
                    cursor: 'nwse-resize',
                    zIndex: 1000,
                    touchAction: 'none',
                  }}
                />
              )}
              {renderSceneItemArt(meta?.item.iconRef, meta?.item.name ?? it.itemId, 4)}
            </div>
          )
        })}
      </div>

      {selectedKey && (
        <SelectedToolbar
          item={items.find((i) => i.k === selectedKey)!}
          onChange={updateSelected}
          onDelete={removeSelected}
        />
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button className="rpg-btn rpg-btn--sm" onClick={() => setPickerOpen((v) => !v)}>
          + Добавить предмет
        </button>
        <button className="rpg-btn rpg-btn--sm rpg-btn--primary" disabled={saving} onClick={handleSave}>
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
        {onCancel && (
          <button className="rpg-btn rpg-btn--sm" onClick={onCancel}>Отмена</button>
        )}
        {error && <span style={{ color: 'var(--ember-1, #b34a18)', fontSize: 12 }}>{error}</span>}
      </div>

      {pickerOpen && (
        <ItemPicker owned={owned} onPick={addItem} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  )
}

function SelectedToolbar({ item, onChange, onDelete }: {
  item: DraftItem
  onChange: (p: Partial<PlacedItem>) => void
  onDelete: () => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, fontFamily: 'Pixelify Sans, monospace' }}>
      <label>Размер
        <input type="range" min={0.5} max={3} step={0.05} value={item.scale} onChange={(e) => onChange({ scale: parseFloat(e.target.value) })} style={{ marginLeft: 6 }} />
      </label>
      <label>Поворот
        <input type="range" min={-180} max={180} step={5} value={item.rotationDeg} onChange={(e) => onChange({ rotationDeg: parseFloat(e.target.value) })} style={{ marginLeft: 6 }} />
      </label>
      <label>Слой
        <input type="number" value={item.zIndex} onChange={(e) => onChange({ zIndex: parseInt(e.target.value, 10) || 0 })} style={{ width: 56, marginLeft: 6 }} />
      </label>
      <label>
        <input type="checkbox" checked={item.flipped} onChange={(e) => onChange({ flipped: e.target.checked })} /> зеркало
      </label>
      <button className="rpg-btn rpg-btn--sm" onClick={onDelete}>🗑 Удалить</button>
    </div>
  )
}

function ItemPicker({ owned, onPick, onClose }: {
  owned: OwnedItem[] | null
  onPick: (itemId: string) => void
  onClose: () => void
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--parch-0, #fbf3dd)', border: '3px solid var(--ink-0, #2a1a0c)',
        padding: 16, width: 'min(640px, 92vw)', maxHeight: '70vh', overflow: 'auto',
        boxShadow: '4px 4px 0 var(--ink-0, #2a1a0c)',
      }}>
        <div className="font-display" style={{ fontSize: 16, marginBottom: 12 }}>Выбери предмет из инвентаря</div>
        {!owned && <div style={{ color: 'var(--ink-2, #7d6850)' }}>Загрузка…</div>}
        {owned && owned.length === 0 && (
          <div style={{ color: 'var(--ink-2, #7d6850)' }}>В инвентаре пусто. Купи косметику в таверне или сезонном пропуске.</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
          {owned?.map((o) => (
            <button key={o.item.id} className="rpg-btn rpg-btn--sm" onClick={() => onPick(o.item.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 8 }}>
              <div style={{ width: 56, height: 56, display: 'grid', placeItems: 'center' }}>
                {renderSceneItemArt(o.item.iconRef, o.item.name, 2)}
              </div>
              <span style={{ fontSize: 11, textAlign: 'center', lineHeight: 1.2 }}>{o.item.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function clamp(v: number, lo: number, hi: number) { return v < lo ? lo : v > hi ? hi : v }
