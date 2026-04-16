import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'info'
interface Toast { id: string; message: string; variant: ToastVariant }

const ToastContext = createContext<{ toast: (msg: string, variant?: ToastVariant) => void }>({
  toast: () => {}
})

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev.slice(-2), { id, message, variant }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  const icons = { success: CheckCircle, error: AlertTriangle, info: Info }
  const colors = { success: 'border-l-[#22c55e]', error: 'border-l-[#ef4444]', info: 'border-l-[#3b82f6]' }
  const iconColors = { success: 'text-[#22c55e]', error: 'text-[#ef4444]', info: 'text-[#3b82f6]' }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map(t => {
          const Icon = icons[t.variant]
          return (
            <div key={t.id} className={`flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-lg border-l-4 ${colors[t.variant]} animate-slide-in min-w-[280px]`}>
              <Icon className={`w-4 h-4 ${iconColors[t.variant]} flex-shrink-0`} />
              <span className="text-sm text-[#111111] flex-1">{t.message}</span>
              <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="text-[#94a3b8] hover:text-[#4B6B52]">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
