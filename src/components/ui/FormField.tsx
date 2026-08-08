import type { ReactNode } from 'react'
import type { FieldError } from 'react-hook-form'

interface FormFieldProps {
  readonly id: string
  readonly label: string
  readonly error?: FieldError | undefined
  readonly hint?: string | undefined
  readonly children: ReactNode
}

/**
 * Label, control and error message in the arrangement Bootstrap expects.
 * Every form uses it, so validation feedback looks and reads the same
 * everywhere — including the messages the API sends back on a 422.
 */
export function FormField({ id, label, error, hint, children }: FormFieldProps) {
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint !== undefined && <div className="form-text">{hint}</div>}
      {error !== undefined && (
        <div className="invalid-feedback d-block" role="alert">
          {error.message}
        </div>
      )}
    </div>
  )
}

/**
 * The form-level message `useApiForm` writes to `root`.
 *
 * It takes the field error rather than its message so that every form passes
 * `errors.root` as it stands — reaching into `.message` at each call site was
 * the same optional access written out once per form.
 */
export function FormAlert({ error }: { readonly error?: { readonly message?: string } }) {
  const message = error?.message
  if (message === undefined || message === '') return null

  return (
    <div className="alert alert-danger py-2" role="alert">
      {message}
    </div>
  )
}
