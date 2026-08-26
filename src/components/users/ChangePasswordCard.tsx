import { FormAlert, FormField, PasswordFields, SubmitButton, fieldClass } from '@/components/ui'
import { changePasswordSchema, type ChangePasswordValues } from '@/forms'
import { useApiForm, useAuth } from '@/hooks'
import { useChangeMyPasswordMutation } from '@/repositories'

/**
 * `PUT /users/me/password` — the caller changing their own password.
 *
 * Separate from the details form on purpose. There is no id in the route, so it
 * cannot be aimed at another account, and it asks for the current password
 * first: a bearer token left on a shared machine should not be enough to take
 * an account over for good.
 *
 * The API ends **every** session of the account, the caller's included, so the
 * 204 is the last authorised answer this token will get. Signing out afterwards
 * is not tidying up — anything left mounted would immediately re-issue its
 * queries with a token the server has already withdrawn.
 */
export function ChangePasswordCard() {
  const [changePassword, { isLoading }] = useChangeMyPasswordMutation()
  const { signOut } = useAuth()

  const {
    register,
    handleSubmit,
    submit,
    formState: { errors },
  } = useApiForm(changePasswordSchema, {
    current_password: '',
    password: '',
    password_confirm: '',
  })

  const onSubmit = (values: ChangePasswordValues): Promise<void> =>
    // A wrong current password is a 401 the API explains itself; `submit` puts
    // that message on the form rather than in a toast the user reads elsewhere.
    submit(changePassword(values).unwrap(), {
      onDone: () => {
        void signOut(false, 'Password changed. Please sign in again.')
      },
    })

  return (
    <section className="appCard p-3 mb-4">
      <h2 className="h6">Change password</h2>
      <p className="text-secondary small">
        This signs you out everywhere, including here — sign in again with the new password.
      </p>

      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
        <FormAlert error={errors.root} />

        <FormField id="current-password" label="Current password" error={errors.current_password}>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            className={fieldClass(errors.current_password)}
            {...register('current_password')}
          />
        </FormField>

        <PasswordFields
          idPrefix="change"
          label="New password"
          passwordProps={register('password')}
          confirmProps={register('password_confirm')}
          passwordError={errors.password}
          confirmError={errors.password_confirm}
        />

        <SubmitButton isBusy={isLoading} label="Change password" busyLabel="Changing…" />
      </form>
    </section>
  )
}
