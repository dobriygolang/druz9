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
  size?: 'sm' | 'md' | 'lg' | 'xl'
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
    xl: 'max-w-4xl',
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-[#1e293b]/60 dark:bg-black/70 animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] border shadow-modal animate-modal-in sm:max-h-[min(90vh,760px)] sm:rounded-xl',
          'bg-white border-[#e2e8f0]',
          'dark:bg-[#132420] dark:border-[#1E4035]',
          sizes[size],
          className,
        )}
      >
        {title && (
          <div className="flex items-start justify-between px-5 py-4 border-b border-[#e2e8f0] dark:border-[#1E4035]">
            <div>
              <h2 className="text-base font-bold text-[#0B1210] dark:text-[#E2F0E8]">{title}</h2>
              {subtitle && <p className="text-xs text-[#4B6B52] dark:text-[#7BA88A] mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#f1f5f9] hover:bg-[#e2e8f0] dark:bg-[#1A3028] dark:hover:bg-[#243050] transition-colors"
            >
              <X className="w-3.5 h-3.5 text-[#94a3b8] dark:text-[#4A7058]" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse justify-end gap-2 border-t border-[#e2e8f0] px-5 py-3.5 dark:border-[#1E4035] sm:flex-row">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
