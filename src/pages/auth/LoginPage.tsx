import { Link, useLocation, useNavigate } from 'react-router-dom'

import { AuthLayout, FormAlert, FormField, SubmitButton, fieldClass } from '@/components'
import { loginSchema, type LoginValues } from '@/forms'
import { paths } from '@/app/paths'
import { useApiForm, useAuth } from '@/hooks'

interface RedirectState {
  readonly from?: { readonly pathname: string }
}

export function LoginPage() {
  const { login, isLoggingIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const {
    register,
    onSubmitHandler,
    submit,
    formState: { errors },
  } = useApiForm(loginSchema, { email: '', password: '' })

  // Return the user to wherever RequireAuth interrupted them.
  const redirectTo = (location.state as RedirectState | null)?.from?.pathname ?? paths.myAlbums

  const onSubmit = (values: LoginValues): Promise<void> =>
    // No toast: arriving at the screen you were headed for is the confirmation.
    submit(login(values), {
      onDone: () => {
        void navigate(redirectTo, { replace: true })
      },
    })

  return (
    <AuthLayout
      title="Sign in"
      lead="Use the email and password of your API account."
      footer={
        <>
          <Link to={paths.forgotPassword}>Forgot your password?</Link>
          <span className="d-block mt-2">
            No account yet? <Link to={paths.register}>Create one</Link>
          </span>
        </>
      }
    >
      <form onSubmit={onSubmitHandler(onSubmit)} noValidate>
        <FormAlert error={errors.root} />

        <FormField id="email" label="Email" error={errors.email}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={fieldClass(errors.email)}
            {...register('email')}
          />
        </FormField>

        <FormField id="password" label="Password" error={errors.password}>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className={fieldClass(errors.password)}
            {...register('password')}
          />
        </FormField>

        <SubmitButton
          isBusy={isLoggingIn}
          label="Sign in"
          busyLabel="Signing in…"
          className="w-100"
        />
      </form>
    </AuthLayout>
  )
}
