import { Modal } from './Modal'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
}

export function ConfirmModal({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, loading,
}: ConfirmModalProps) {
  const { t } = useTranslation()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{cancelLabel === 'Cancel' ? t('common.cancel') : cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'orange'} size="sm" onClick={onConfirm} loading={loading}>
            {confirmLabel === 'Confirm' ? t('common.confirm') : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[#475569]">{message}</p>
    </Modal>
  )
}
