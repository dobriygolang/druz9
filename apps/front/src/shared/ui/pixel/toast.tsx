import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type ToastKind = 'info' | 'success' | 'danger' | 'xp' | 'gold' | 'purchased' | 'levelup'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
  duration?: number
}

interface ToastCtx {
  toast: (t: Omit<Toast, 'id'>) => void
}

const Ctx = createContext<ToastCtx>({ toast: () => {} })

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, duration: 3500, ...t }])
  }, [])

  useEffect(() => {
    if (toasts.length === 0) return
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1))
    }, toasts[0].duration)
    return () => clearTimeout(timer)
  }, [toasts])

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          right: 24,
          top: 24,
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  return useContext(Ctx)
}

function ToastCard({ toast }: { toast: Toast }) {
  const color = {
    info: 'var(--ink-1)',
    success: 'var(--moss-1)',
    danger: 'var(--rpg-danger, #a23a2a)',
    xp: 'var(--ember-1)',
    gold: 'var(--ember-3)',
    purchased: 'var(--moss-2)',
    levelup: 'var(--ember-2)',
  }[toast.kind]
  return (
    <div
      className="rpg-panel rpg-panel--tight rpg-toast"
      style={{
        minWidth: 240,
        maxWidth: 360,
        borderLeft: `6px solid ${color}`,
        pointerEvents: 'auto',
      }}
    >
      <div
        className="font-silkscreen uppercase"
        style={{ fontSize: 10, color, letterSpacing: '0.08em', marginBottom: 4 }}
      >
        {toast.kind}
      </div>
      <div style={{ fontFamily: 'IBM Plex Sans, system-ui', fontSize: 14 }}>{toast.message}</div>
    </div>
  )
}
