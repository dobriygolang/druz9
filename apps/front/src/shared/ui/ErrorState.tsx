import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message = 'Failed to load data', onRetry }: ErrorStateProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#fef2f2] flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-[#dc2626]" />
      </div>
      <p className="text-base font-semibold text-[#111111] font-geist mb-1">{message}</p>
      <p className="text-sm text-[#666666] font-geist mb-4">{t('error.checkConnection')}</p>
      {onRetry && (
        <Button variant="orange" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}
