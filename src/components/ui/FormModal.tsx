import type { ReactNode, SyntheticEvent } from 'react'

import { Modal } from './Modal'
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
        <div className="modal-header">
          <h2 className="modal-title h5">{title}</h2>
          <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
        </div>

        <div className="modal-body">{children}</div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
            Cancel
          </button>
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
