import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { AuthLayout, FormAlert, FormField, SubmitButton, fieldClass } from '@/components'
import { verifyEmailSchema, type VerifyEmailValues } from '@/forms'
import { useApiForm } from '@/hooks'
import { useVerifyEmailMutation } from '@/repositories'

/**
 * Confirms an email address.
 *
 * Public, like the endpoint behind it: the token is the proof, and requiring a
 * session as well would break opening the message in a different browser from
 * the one that registered.
 *
 * Nothing here is a gate. An unverified account works exactly as well as a
 * verified one — the API records the fact and enforces nothing — so this screen
 * never implies the user is locked out of anything.
 */
export function VerifyEmailPage() {
  const [verifyEmail, { isLoading }] = useVerifyEmailMutation()
  const [searchParams] = useSearchParams()
  const [confirmed, setConfirmed] = useState(false)

  const form = useApiForm(verifyEmailSchema, { token: searchParams.get('token') ?? '' })
  const {
    register,
    handleSubmit,
    submit,
    formState: { errors },
  } = form

  const onSubmit = (values: VerifyEmailValues): Promise<void> =>
    submit(verifyEmail(values).unwrap(), {
      onDone: () => {
        setConfirmed(true)
      },
    })

  return (
    <AuthLayout
      title="Confirm your email"
      lead="Paste the token from the message we sent you."
      footer={<Link to="/login">Back to sign in</Link>}
    >
      {confirmed ? (
        <div className="alert alert-success" role="status">
          Your email address is confirmed.
        </div>
      ) : (
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
          <FormAlert error={errors.root} />

          <FormField id="verify-token" label="Token" error={errors.token}>
            <input
              id="verify-token"
              type="text"
              autoComplete="one-time-code"
              className={fieldClass(errors.token)}
              {...register('token')}
            />
          </FormField>

          <SubmitButton
            isBusy={isLoading}
            label="Confirm my email"
            busyLabel="Confirming…"
            className="w-100"
          />
        </form>
      )}
    </AuthLayout>
  )
}
