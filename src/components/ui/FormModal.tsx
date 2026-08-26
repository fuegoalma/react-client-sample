import type { ReactNode, SyntheticEvent } from 'react'

import { Modal, ModalCancelButton, ModalHeader } from './Modal'
import { SubmitButton } from './SubmitButton'

interface FormModalProps {
  readonly title: string
  readonly submitLabel: string
  readonly busyLabel?: string
  readonly isBusy: boolean
  readonly onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  readonly onClose: () => void
  /** The fields; the header, footer and buttons come from here. */
  readonly children: ReactNode
}

/**
 * A form in a dialog: header with its title and close button, the fields, and a
 * footer of Cancel plus the submit control.
 *
 * Every dialog that edits something has exactly this shape, and the only parts
 * that ever differed were the wording and the fields — so those are the props.
 */
export function FormModal({
  title,
  submitLabel,
  busyLabel,
  isBusy,
  onSubmit,
  onClose,
  children,
}: FormModalProps) {
  return (
    <Modal title={title} onClose={onClose}>
      <form className="modal-content" onSubmit={onSubmit} noValidate>
        <ModalHeader title={title} onClose={onClose} />

        <div className="modal-body">{children}</div>

        <div className="modal-footer">
          <ModalCancelButton onClick={onClose} />
          <SubmitButton
            isBusy={isBusy}
            label={submitLabel}
            {...(busyLabel !== undefined && { busyLabel })}
          />
        </div>
      </form>
    </Modal>
  )
}
