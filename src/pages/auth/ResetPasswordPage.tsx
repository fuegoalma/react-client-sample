import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import {
  AuthLayout,
  FormAlert,
  FormField,
  PasswordFields,
  SubmitButton,
  fieldClass,
} from '@/components'
import { resetPasswordSchema, type ResetPasswordValues } from '@/forms'
import { paths } from '@/app/paths'
import { useApiForm } from '@/hooks'
import { useResetPasswordMutation } from '@/repositories'

/**
 * Spends a mailed token and sets a new password.
 *
 * The token field is always shown and always editable. The API mails the token
 * on its own rather than inside a link, so the usual case is someone pasting it
 * from their inbox; `?token=` is honoured for a client that does build a link,
 * but it is a convenience, not the way in.
 *
 * No token pair comes back — the API ends every session of the account — so the
 * only place to go afterwards is the sign-in screen.
 */
export function ResetPasswordPage() {
  const [resetPassword, { isLoading }] = useResetPasswordMutation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const {
    register,
    onSubmitHandler,
    submit,
    formState: { errors },
  } = useApiForm(resetPasswordSchema, {
    token: searchParams.get('token') ?? '',
    password: '',
    password_confirm: '',
  })

  const onSubmit = (values: ResetPasswordValues): Promise<void> =>
    submit(resetPassword(values).unwrap(), {
      success: 'Password changed. Sign in with your new password.',
      onDone: () => {
        void navigate(paths.login, { replace: true })
      },
    })

  return (
    <AuthLayout
      title="Choose a new password"
      lead="Paste the token from the email and pick a new password."
      footer={<Link to={paths.forgotPassword}>Need another token?</Link>}
    >
      <form onSubmit={onSubmitHandler(onSubmit)} noValidate>
        <FormAlert error={errors.root} />

        <FormField
          id="reset-token"
          label="Token"
          error={errors.token}
          hint="From the email we sent you."
        >
          <input
            id="reset-token"
            type="text"
            autoComplete="one-time-code"
            className={fieldClass(errors.token)}
            {...register('token')}
          />
        </FormField>

        <PasswordFields
          idPrefix="reset"
          label="New password"
          passwordProps={register('password')}
          confirmProps={register('password_confirm')}
          passwordError={errors.password}
          confirmError={errors.password_confirm}
        />

        <SubmitButton
          isBusy={isLoading}
          label="Set new password"
          busyLabel="Saving…"
          className="w-100"
        />
      </form>
    </AuthLayout>
  )
}
