// ADR-004 — лёгкий guided tour без внешних зависимостей. Подсвечивает
// CSS-селектор полупрозрачным "вырезом" и рисует поясняющую карточку
// рядом. Шаг продвигается по клику "Дальше"; финальный жмёт MarkTourCompleted.
//
// Use:
//   <Tour
//     tourId="arena_intro"
//     steps={[
//       { selector: '[data-tour=arena-modes]', title: '…', body: '…' },
//       …
//     ]}
//   />
//
// Re-rendered on route change is fine — the hook reads the user's
// completed-tours list once and skips immediately if `tourId` is in it.
import { useEffect, useLayoutEffect, useState } from 'react'
import { toursApi } from '@/features/Tour/api/toursApi'

export interface TourStep {
  selector: string
  title: string
  body: string
}

interface TourProps {
  tourId: string
  steps: TourStep[]
  // Called when the user finishes or skips. Default: silent.
  onClose?: () => void
}

export function Tour({ tourId, steps, onClose }: TourProps) {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  // Decide whether to show this tour at all. Local fallback prevents the
  // re-render storm if the backend is offline.
  useEffect(() => {
    let cancelled = false
    toursApi
      .list()
      .then((ids) => { if (!cancelled && !ids.includes(tourId)) setActive(true) })
      .catch(() => {
        const local = JSON.parse(localStorage.getItem('druz9_tours_done') ?? '[]') as string[]
        if (!local.includes(tourId)) setActive(true)
      })
    return () => { cancelled = true }
  }, [tourId])

  // Position the spotlight over the step's target element. Re-runs when
  // step changes; observes resize so the cutout follows layout shifts.
  useLayoutEffect(() => {
    if (!active) return
    const target = document.querySelector(steps[step]?.selector ?? '') as HTMLElement | null
    if (!target) {
      // Element not in DOM yet — try again next tick.
      const t = setTimeout(() => setRect(null), 100)
      return () => clearTimeout(t)
    }
    const update = () => setRect(target.getBoundingClientRect())
    update()
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [active, step, steps])

  const finish = (skipped: boolean) => {
    setActive(false)
    void toursApi.markCompleted(tourId).catch(() => {
      const local = JSON.parse(localStorage.getItem('druz9_tours_done') ?? '[]') as string[]
      if (!local.includes(tourId)) {
        local.push(tourId)
        localStorage.setItem('druz9_tours_done', JSON.stringify(local))
      }
    })
    onClose?.()
    void skipped
  }

  if (!active || steps.length === 0) return null
  const cur = steps[step]

  // Cutout: clip-path with a hole around the target rect; fall back to
  // a flat overlay when the target hasn't laid out yet.
  const overlayStyle: React.CSSProperties = rect
    ? {
        position: 'fixed', inset: 0, zIndex: 220,
        background: 'rgba(10,10,12,0.65)',
        clipPath: `polygon(
          0 0, 100% 0, 100% 100%, 0 100%, 0 0,
          ${rect.left}px ${rect.top}px,
          ${rect.left}px ${rect.bottom}px,
          ${rect.right}px ${rect.bottom}px,
          ${rect.right}px ${rect.top}px,
          ${rect.left}px ${rect.top}px
        )`,
        pointerEvents: 'auto',
      }
    : { position: 'fixed', inset: 0, zIndex: 220, background: 'rgba(10,10,12,0.55)' }

  // Card sits below the target if there's room, otherwise above.
  const cardTop = rect && rect.bottom + 220 < window.innerHeight ? rect.bottom + 12 : Math.max(20, (rect?.top ?? 80) - 220)
  const cardLeft = Math.min(window.innerWidth - 360, Math.max(16, (rect?.left ?? 16)))

  return (
    <>
      <div style={overlayStyle} onClick={() => finish(true)} />
      <div
        style={{
          position: 'fixed',
          top: cardTop,
          left: cardLeft,
          width: 340,
          background: 'var(--parch-0, #fbf3dd)',
          border: '3px solid var(--ink-0, #2a1a0c)',
          boxShadow: '4px 4px 0 var(--ember-1, #b34a18)',
          padding: 16,
          zIndex: 221,
        }}
      >
        <div className="font-silkscreen uppercase" style={{ fontSize: 9, color: 'var(--ember-1)', letterSpacing: '0.1em', marginBottom: 6 }}>
          {step + 1} / {steps.length}
        </div>
        <div className="font-display" style={{ fontSize: 17, marginBottom: 6 }}>{cur.title}</div>
        <p style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--ink-0, #2a1a0c)', margin: 0 }}>{cur.body}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
          <button onClick={() => finish(true)} style={btnStyle}>Пропустить</button>
          {step < steps.length - 1 ? (
            <button onClick={() => setStep((s) => s + 1)} style={{ ...btnStyle, background: 'var(--ember-1)', color: 'var(--parch-0)' }}>
              Дальше →
            </button>
          ) : (
            <button onClick={() => finish(false)} style={{ ...btnStyle, background: 'var(--moss-1)', color: 'var(--parch-0)' }}>
              Готово
            </button>
          )}
        </div>
      </div>
    </>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '6px 12px',
  border: '2px solid var(--ink-0, #2a1a0c)',
  background: 'var(--parch-2, #efe1bf)',
  fontFamily: 'Pixelify Sans, monospace',
  fontSize: 12,
  cursor: 'pointer',
  boxShadow: '2px 2px 0 var(--ink-0, #2a1a0c)',
}
