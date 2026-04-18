import type { ReactNode } from 'react'
import { useEffect } from 'react'

export function Modal({
  open,
  onClose,
  children,
  className = '',
}: {
  open: boolean
  onClose?: () => void
  children: ReactNode
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="rpg-modal-backdrop" onClick={onClose}>
      <div
        className={`rpg-modal rpg-panel ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
