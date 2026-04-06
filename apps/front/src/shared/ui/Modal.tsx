import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', className }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-[560px]',
    lg: 'max-w-2xl',
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#1e293b]/60 dark:bg-black/70 animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full rounded-xl border shadow-modal flex flex-col animate-modal-in',
          'bg-white border-[#e2e8f0]',
          'dark:bg-[#161c2d] dark:border-[#1e3158]',
          sizes[size],
          className,
        )}
      >
        {title && (
          <div className="flex items-start justify-between px-5 py-4 border-b border-[#e2e8f0] dark:border-[#1e3158]">
            <div>
              <h2 className="text-base font-bold text-[#0f172a] dark:text-[#e2e8f3]">{title}</h2>
              {subtitle && <p className="text-xs text-[#475569] dark:text-[#7e93b0] mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#f1f5f9] hover:bg-[#e2e8f0] dark:bg-[#1c2436] dark:hover:bg-[#243050] transition-colors"
            >
              <X className="w-3.5 h-3.5 text-[#94a3b8] dark:text-[#4d6380]" />
            </button>
          </div>
        )}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-5 py-3.5 border-t border-[#e2e8f0] dark:border-[#1e3158] flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
