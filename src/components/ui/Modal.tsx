import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'

interface ModalProps {
  readonly title: string
  readonly children: ReactNode
  readonly onClose: () => void
}

/** What the browser would move through on Tab, minus anything it skips. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * The dialog's title bar. Both shells built on `Modal` render exactly this, and
 * had each written it out — two copies of the markup that names a dialog and
 * gives it its way out.
 */
export function ModalHeader({
  title,
  onClose,
  disabled = false,
}: {
  readonly title: string
  readonly onClose: () => void
  /** A dialog waiting on its own request must not offer a way to abandon it. */
  readonly disabled?: boolean
}) {
  return (
    <div className="modal-header">
      <h2 className="modal-title h5">{title}</h2>
      <button
        type="button"
        className="btn-close"
        aria-label="Close"
        onClick={onClose}
        disabled={disabled}
      />
    </div>
  )
}

/** The footer's way out, beside whichever control the shell puts next to it. */
export function ModalCancelButton({
  onClick,
  disabled = false,
}: {
  readonly onClick: () => void
  readonly disabled?: boolean
}) {
  return (
    <button
      type="button"
      className="btn btn-outline-secondary"
      onClick={onClick}
      disabled={disabled}
    >
      Cancel
    </button>
  )
}

/**
 * Bootstrap's modal markup, without Bootstrap's JavaScript.
 *
 * The JS version manipulates the DOM directly, which fights React for ownership
 * of the same nodes; the CSS is the part we actually need. Callers render this
 * only while the dialog is open, so whatever it wraps — a form, for instance —
 * gets fresh state on every open with no resetting effect.
 *
 * Everything a dialog owes a keyboard user lives here and only here, so the two
 * shells built on it — `FormModal` and `ConfirmDialog` — carry none of it.
 */
export function Modal({ title, children, onClose }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  /*
   * Escape is listened for on the document, not on the dialog element.
   *
   * A dialog is opened by a button that sits outside it, so when it appears the
   * focus is still on that button and a `keydown` there never reaches the
   * dialog's own handler. Escape therefore did nothing until the user happened
   * to click inside first — a real bug, and one the test suite had been hiding
   * by clicking the dialog before pressing the key.
   */
  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  /*
   * The focus moves into the dialog when it opens and returns to whatever
   * opened it when it closes. Without the second half, dismissing a dialog
   * drops a keyboard user back at the top of the document, with no memory of
   * the row or the button they were working from.
   */
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()

    return () => {
      trigger?.focus()
    }
  }, [])

  // The page behind a modal is inert; left alone it scrolls under the backdrop.
  useEffect(() => {
    document.body.classList.add('hasOpenModal')

    return () => {
      document.body.classList.remove('hasOpenModal')
    }
  }, [])

  /*
   * Tab cycles within the dialog instead of walking out into the page behind
   * it, which the backdrop has already made unreachable by mouse.
   */
  const trapTab = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Tab') return

    // `currentTarget` is the dialog itself — reading the ref here would add a
    // null branch that the handler being called has already ruled out.
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE))
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    // A dialog with nothing to focus keeps the focus on its own container.
    if (first === undefined || last === undefined) return

    const leavingBackwards = event.shiftKey && document.activeElement === first
    const leavingForwards = !event.shiftKey && document.activeElement === last

    if (leavingBackwards) {
      event.preventDefault()
      last.focus()
    } else if (leavingForwards) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <>
      <div
        ref={dialogRef}
        className="modal d-block"
        role="dialog"
        aria-modal="true"
        // The heading is rendered by the caller's children, so naming the
        // dialog by id would mean handing an id down through both shells and
        // back — more coupling than the duplicated string is worth.
        aria-label={title}
        tabIndex={-1}
        onKeyDown={trapTab}
      >
        <div className="modal-dialog modal-dialog-centered">{children}</div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  )
}
