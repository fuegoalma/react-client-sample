interface SpinnerProps {
  /** Announced to assistive technology in place of the spinner itself. */
  readonly label: string
}

/**
 * The one "we are waiting" indicator. Both the query boundary and the permission
 * guard show it, so the wait looks the same whatever is being waited for.
 */
export function Spinner({ label }: SpinnerProps) {
  return (
    <div className="d-flex justify-content-center py-5" role="status" aria-live="polite">
      <span className="spinner-border text-secondary" aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </div>
  )
}
