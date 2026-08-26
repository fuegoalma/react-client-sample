import {
  ChangePasswordFields,
  FormAlert,
  FormField,
  SubmitButton,
  fieldClass,
} from '@/components/ui'
import { EMPTY_USER_UPDATE_VALUES, toUserPayload, userUpdateSchema } from '@/forms'
import type { UserUpdateValues } from '@/forms'
import { useApiForm } from '@/hooks'
import { useUpdateUserMutation } from '@/repositories'

interface UserUpdateFormProps {
  readonly userId: number
  /** The current values, shown as placeholders — a blank field keeps its value. */
  readonly placeholders: {
    readonly first_name: string
    readonly last_name: string
    readonly email: string
  }
  /** Ids must stay unique when another form shares the page. */
  readonly idPrefix: string
  readonly successMessage: string
  /**
   * Whether this form offers the password alongside the details.
   *
   * An administrator setting someone else's password has no other way to do it,
   * so `/users/{id}` keeps it. The caller's own account has a better one —
   * `PUT /users/me/password`, which asks for the current password first — so
   * `/profile` turns this off and offers that instead.
   */
  readonly canChangePassword?: boolean
}

/**
 * `PUT /users/{id}` as a form, for whoever is allowed to submit it.
 *
 * The caller's own profile and an administrator's view of another account ask
 * for exactly the same attributes under exactly the same rules, so they ask
 * through the same form; only the subject and the confirmation differ.
 */
export function UserUpdateForm({
  userId,
  placeholders,
  idPrefix,
  successMessage,
  canChangePassword = true,
}: UserUpdateFormProps) {
  const [updateUser, { isLoading: isSaving }] = useUpdateUserMutation()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    submit,
    formState: { errors, isDirty },
  } = useApiForm(userUpdateSchema, EMPTY_USER_UPDATE_VALUES)

  const changingPassword = watch('change_password') === true

  const onSubmit = async (values: UserUpdateValues): Promise<void> => {
    // `change_password` decides what is sent, exactly as it decided what was
    // validated — the password never leaves unless it was asked for. Only the
    // fields actually filled in are sent, because the API applies a partial
    // update and an empty string would blank the attribute.
    const body = toUserPayload(values)
    if (Object.keys(body).length === 0) return

    // A 409 means this account holds `role.manage` and may not be taken over;
    // the API's message says so, and `submit` puts it on the form.
    await submit(updateUser({ id: userId, body }).unwrap(), {
      success: successMessage,
      onDone: () => {
        reset(EMPTY_USER_UPDATE_VALUES)
      },
    })
  }

  return (
    <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
      <FormAlert error={errors.root} />

      <div className="row g-2">
        <div className="col-sm-6">
          <FormField id={`${idPrefix}-first-name`} label="First name" error={errors.first_name}>
            <input
              id={`${idPrefix}-first-name`}
              className={fieldClass(errors.first_name)}
              placeholder={placeholders.first_name}
              {...register('first_name')}
            />
          </FormField>
        </div>
        <div className="col-sm-6">
          <FormField id={`${idPrefix}-last-name`} label="Last name" error={errors.last_name}>
            <input
              id={`${idPrefix}-last-name`}
              className={fieldClass(errors.last_name)}
              placeholder={placeholders.last_name}
              {...register('last_name')}
            />
          </FormField>
        </div>
      </div>

      <FormField id={`${idPrefix}-email`} label="Email" error={errors.email}>
        <input
          id={`${idPrefix}-email`}
          type="email"
          className={fieldClass(errors.email)}
          placeholder={placeholders.email}
          {...register('email')}
        />
      </FormField>

      {/*
       * Left out entirely rather than disabled: the schema already returns
       * early while `change_password` is off and `toUserPayload` ignores the
       * password on the same condition, so an absent section sends nothing.
       */}
      {canChangePassword && (
        <ChangePasswordFields
          idPrefix={idPrefix}
          toggleProps={register('change_password')}
          enabled={changingPassword}
          passwordProps={register('password')}
          confirmProps={register('password_confirm')}
          passwordError={errors.password}
          confirmError={errors.password_confirm}
        />
      )}

      <SubmitButton
        isBusy={isSaving}
        label="Save changes"
        busyLabel="Saving…"
        variant={isDirty ? 'primary' : 'outline-primary'}
      />
    </form>
  )
}
