import type { ReactNode } from 'react'

interface ModalProps {
  readonly title: string
  readonly children: ReactNode
  readonly onClose: () => void
}

/**
 * Bootstrap's modal markup, without Bootstrap's JavaScript.
 *
 * The JS version manipulates the DOM directly, which fights React for ownership
 * of the same nodes; the CSS is the part we actually need. Callers render this
 * only while the dialog is open, so whatever it wraps — a form, for instance —
 * gets fresh state on every open with no resetting effect.
 */
export function Modal({ title, children, onClose }: ModalProps) {
  return (
    <>
      <div
        className="modal d-block"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose()
        }}
      >
        <div className="modal-dialog modal-dialog-centered">{children}</div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  )
}
