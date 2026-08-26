import { Link, useNavigate } from 'react-router-dom'

import {
  AuthLayout,
  FormAlert,
  FormField,
  PasswordFields,
  SubmitButton,
  fieldClass,
} from '@/components'
import { registerSchema, type RegisterValues } from '@/forms'
import { paths } from '@/app/paths'
import { useApiForm, useAuth } from '@/hooks'

export function RegisterPage() {
  const { register: createAccount, isRegistering } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    onSubmitHandler,
    submit,
    formState: { errors },
  } = useApiForm(registerSchema, {
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirm: '',
  })

  const onSubmit = ({ password_confirm: _confirm, ...values }: RegisterValues): Promise<void> =>
    // The confirmation is form state, not an attribute the API knows. No toast:
    // landing on your own albums, signed in, is the confirmation. A duplicate
    // email comes back as a 422 on the `email` field.
    submit(createAccount(values), {
      onDone: () => {
        void navigate(paths.myAlbums, { replace: true })
      },
    })

  return (
    <AuthLayout
      title="Create an account"
      lead="A new account starts with no roles — you can manage your own albums right away."
      footer={
        <>
          Already registered? <Link to={paths.login}>Sign in</Link>
        </>
      }
    >
      <form onSubmit={onSubmitHandler(onSubmit)} noValidate>
        <FormAlert error={errors.root} />

        <div className="row g-2">
          <div className="col-sm-6">
            <FormField id="first_name" label="First name" error={errors.first_name}>
              <input
                id="first_name"
                autoComplete="given-name"
                className={fieldClass(errors.first_name)}
                {...register('first_name')}
              />
            </FormField>
          </div>
          <div className="col-sm-6">
            <FormField id="last_name" label="Last name" error={errors.last_name}>
              <input
                id="last_name"
                autoComplete="family-name"
                className={fieldClass(errors.last_name)}
                {...register('last_name')}
              />
            </FormField>
          </div>
        </div>

        <FormField id="email" label="Email" error={errors.email}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={fieldClass(errors.email)}
            {...register('email')}
          />
        </FormField>

        <PasswordFields
          idPrefix="register"
          passwordProps={register('password')}
          confirmProps={register('password_confirm')}
          passwordError={errors.password}
          confirmError={errors.password_confirm}
        />

        <SubmitButton
          isBusy={isRegistering}
          label="Create account"
          busyLabel="Creating…"
          className="w-100"
        />
      </form>
    </AuthLayout>
  )
}
