import { useState } from 'react'
import { Link } from 'react-router-dom'

import { AuthLayout, FormAlert, FormField, SubmitButton, fieldClass } from '@/components'
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/forms'
import { paths } from '@/app/paths'
import { useApiForm } from '@/hooks'
import { useForgotPasswordMutation } from '@/repositories'

/**
 * Asks the API to mail a reset token.
 *
 * The API answers 204 whether or not the address belongs to an account, so this
 * screen must say the same thing either way. Confirming "we sent it" only for
 * addresses that exist would turn the form into an account-enumeration oracle
 * and undo the trouble the API goes to.
 */
export function ForgotPasswordPage() {
  const [requestReset, { isLoading }] = useForgotPasswordMutation()
  const [sent, setSent] = useState(false)

  const {
    register,
    onSubmitHandler,
    submit,
    formState: { errors },
  } = useApiForm(forgotPasswordSchema, { email: '' })

  const onSubmit = (values: ForgotPasswordValues): Promise<void> =>
    submit(requestReset(values).unwrap(), {
      onDone: () => {
        setSent(true)
      },
    })

  return (
    <AuthLayout
      title="Reset your password"
      lead="We will email you a token to set a new one with."
      footer={<Link to={paths.login}>Back to sign in</Link>}
    >
      {sent ? (
        <>
          <div className="alert alert-success" role="status">
            If that address belongs to an account, a token is on its way. It expires in an hour.
          </div>
          <Link to={paths.resetPassword} className="btn btn-primary w-100">
            I have a token
          </Link>
        </>
      ) : (
        <form onSubmit={onSubmitHandler(onSubmit)} noValidate>
          <FormAlert error={errors.root} />

          <FormField id="forgot-email" label="Email" error={errors.email}>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              className={fieldClass(errors.email)}
              {...register('email')}
            />
          </FormField>

          <SubmitButton
            isBusy={isLoading}
            label="Email me a token"
            busyLabel="Sending…"
            className="w-100"
          />
        </form>
      )}
    </AuthLayout>
  )
}
