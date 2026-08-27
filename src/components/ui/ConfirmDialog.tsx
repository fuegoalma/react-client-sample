import type { ReactNode } from 'react'

import { Modal, ModalCancelButton, ModalHeader } from './Modal'

interface ConfirmDialogProps {
  readonly open: boolean
  readonly title: string
  readonly confirmLabel?: string
  readonly confirmVariant?: 'danger' | 'primary' | 'warning'
  readonly isBusy?: boolean
  readonly children: ReactNode
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

/**
 * A yes/no question, in the shell every dialog shares.
 *
 * The shell itself — backdrop, centring, Escape dismissal — belongs to `Modal`;
 * spelling it out again here would be the same markup maintained twice.
 */
export function ConfirmDialog({
  open,
  title,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  isBusy = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <Modal title={title} onClose={onCancel}>
      <div className="modal-content">
        <ModalHeader title={title} onClose={onCancel} disabled={isBusy} />
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <ModalCancelButton onClick={onCancel} disabled={isBusy} />
          <button
            type="button"
            className={`btn btn-${confirmVariant}`}
            onClick={onConfirm}
            disabled={isBusy}
          >
            {isBusy && (
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
