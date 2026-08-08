import { Link, useLocation, useNavigate } from 'react-router-dom'

import { AuthLayout, FormAlert, FormField, SubmitButton, fieldClass } from '@/components'
import { loginSchema, type LoginValues } from '@/forms'
import { useApiForm, useAuth } from '@/hooks'

interface RedirectState {
  readonly from?: { readonly pathname: string }
}

export function LoginPage() {
  const { login, isLoggingIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const form = useApiForm(loginSchema, { email: '', password: '' })
  const {
    register,
    handleSubmit,
    applyApiError,
    formState: { errors },
  } = form

  // Return the user to wherever RequireAuth interrupted them.
  const redirectTo = (location.state as RedirectState | null)?.from?.pathname ?? '/albums'

  const onSubmit = async (values: LoginValues): Promise<void> => {
    try {
      await login(values)
      void navigate(redirectTo, { replace: true })
    } catch (error) {
      applyApiError(error)
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      lead="Use the email and password of your API account."
      footer={
        <>
          No account yet? <Link to="/register">Create one</Link>
        </>
      }
    >
      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
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
