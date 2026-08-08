import { FormAlert, FormField, FormModal, PasswordFields, fieldClass } from '@/components/ui'
import { userCreateSchema, type UserCreateValues } from '@/forms'
import { useApiForm, useNotifications } from '@/hooks'
import { useCreateUserMutation } from '@/repositories'

interface UserFormDialogProps {
  readonly open: boolean
  readonly onClose: () => void
}

/**
 * Creates an account (`user.create`, admin and above). Like registration, the
 * new account is assigned **no** role — roles are granted separately, which is
 * what keeps the anti-escalation rule meaningful.
 */
export function UserFormDialog({ open, onClose }: UserFormDialogProps) {
  if (!open) return null

  // Mounted only while open, so each dialog starts from an empty form.
  return <CreateUserForm onClose={onClose} />
}

function CreateUserForm({ onClose }: Omit<UserFormDialogProps, 'open'>) {
  const [createUser, { isLoading }] = useCreateUserMutation()
  const { reportSuccess } = useNotifications()

  const {
    register,
    handleSubmit,
    applyApiError,
    formState: { errors },
  } = useApiForm(userCreateSchema, {
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirm: '',
  })

  const onSubmit = async ({
    password_confirm: _confirm,
    ...values
  }: UserCreateValues): Promise<void> => {
    try {
      // The confirmation is form state, not an attribute the API knows.
      const user = await createUser(values).unwrap()
      reportSuccess(`${user.first_name} ${user.last_name} was created with no roles.`)
      onClose()
    } catch (error) {
      applyApiError(error)
    }
  }

  return (
    <FormModal
      title="New user"
      submitLabel="Create user"
      busyLabel="Creating…"
      isBusy={isLoading}
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      onClose={onClose}
    >
      <FormAlert error={errors.root} />

      <div className="row g-2">
        <div className="col-sm-6">
          <FormField id="new-first-name" label="First name" error={errors.first_name}>
            <input
              id="new-first-name"
              className={fieldClass(errors.first_name)}
              {...register('first_name')}
            />
          </FormField>
        </div>
        <div className="col-sm-6">
          <FormField id="new-last-name" label="Last name" error={errors.last_name}>
            <input
              id="new-last-name"
              className={fieldClass(errors.last_name)}
              {...register('last_name')}
            />
          </FormField>
        </div>
      </div>

      <FormField id="new-email" label="Email" error={errors.email}>
        <input
          id="new-email"
          type="email"
          className={fieldClass(errors.email)}
          {...register('email')}
        />
      </FormField>

      <PasswordFields
        idPrefix="new-user"
        passwordProps={register('password')}
        confirmProps={register('password_confirm')}
        passwordError={errors.password}
        confirmError={errors.password_confirm}
        hint="At least 6 characters. Hashed by the API."
      />
    </FormModal>
  )
}
