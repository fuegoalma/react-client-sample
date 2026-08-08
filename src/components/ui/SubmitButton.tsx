interface SubmitButtonProps {
  readonly isBusy: boolean
  readonly label: string
  readonly busyLabel?: string
  readonly variant?: string
  readonly className?: string
}

export function SubmitButton({
  isBusy,
  label,
  busyLabel = 'Working…',
  variant = 'primary',
  className = '',
}: SubmitButtonProps) {
  return (
    <button type="submit" className={`btn btn-${variant} ${className}`.trim()} disabled={isBusy}>
      {isBusy && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
      {isBusy ? busyLabel : label}
    </button>
  )
}
