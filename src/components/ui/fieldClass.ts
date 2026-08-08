import type { FieldError } from 'react-hook-form'

/**
 * Adds Bootstrap's invalid state to a control when its field has an error.
 * Lives apart from the components so Fast Refresh keeps working.
 */
export function fieldClass(error: FieldError | undefined, base = 'form-control'): string {
  return error === undefined ? base : `${base} is-invalid`
}
