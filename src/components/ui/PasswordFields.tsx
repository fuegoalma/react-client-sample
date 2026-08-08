import type { FieldError } from 'react-hook-form'
import type { UseFormRegisterReturn } from 'react-hook-form'

import { fieldClass } from './fieldClass'
import { FormField } from './FormField'

interface PasswordFieldsProps {
  /** Keeps the input ids unique when two forms share a page. */
  readonly idPrefix: string
  readonly passwordProps: UseFormRegisterReturn
  readonly confirmProps: UseFormRegisterReturn
  readonly passwordError?: FieldError | undefined
  readonly confirmError?: FieldError | undefined
  readonly label?: string
  readonly hint?: string
}

/**
 * A password and its confirmation.
 *
 * Taking the already-typed pieces `register()` returns, rather than the form
 * itself, keeps this free of react-hook-form generics while staying fully
 * type-checked at every call site.
 */
export function PasswordFields({
  idPrefix,
  passwordProps,
  confirmProps,
  passwordError,
  confirmError,
  label = 'Password',
  hint = 'At least 6 characters.',
}: PasswordFieldsProps) {
  return (
    <>
      <FormField id={`${idPrefix}-password`} label={label} error={passwordError} hint={hint}>
        <input
          id={`${idPrefix}-password`}
          type="password"
          autoComplete="new-password"
          className={fieldClass(passwordError)}
          {...passwordProps}
        />
      </FormField>

      <FormField
        id={`${idPrefix}-password-confirm`}
        label={`Confirm ${label.toLowerCase()}`}
        error={confirmError}
      >
        <input
          id={`${idPrefix}-password-confirm`}
          type="password"
          autoComplete="new-password"
          className={fieldClass(confirmError)}
          {...confirmProps}
        />
      </FormField>
    </>
  )
}

interface ChangePasswordFieldsProps extends PasswordFieldsProps {
  readonly toggleProps: UseFormRegisterReturn
  /** Whether the checkbox is currently ticked. */
  readonly enabled: boolean
}

/**
 * An opt-in password change.
 *
 * While the checkbox is unticked the inputs are not rendered at all, so a
 * browser has nothing to autofill — which is the point: an account's password
 * should only ever change because someone deliberately asked for it.
 */
export function ChangePasswordFields({
  toggleProps,
  enabled,
  idPrefix,
  ...fields
}: ChangePasswordFieldsProps) {
  return (
    <>
      <div className="form-check mb-3">
        <input
          className="form-check-input"
          type="checkbox"
          id={`${idPrefix}-change-password`}
          {...toggleProps}
        />
        <label className="form-check-label" htmlFor={`${idPrefix}-change-password`}>
          Change password
        </label>
      </div>

      {enabled && <PasswordFields idPrefix={idPrefix} label="New password" {...fields} />}
    </>
  )
}
