import { Modal } from './Modal'
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
  confirmLabel = 'Подтвердить', cancelLabel = 'Отмена', danger, loading,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'orange'} size="sm" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[#475569]">{message}</p>
    </Modal>
  )
}
