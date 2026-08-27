export interface TokenPair {
  readonly access_token: string
  readonly refresh_token: string
  readonly token_type: string
  /** Access-token lifetime in seconds. */
  readonly expires_in: number
}

export interface LoginRequest {
  readonly email: string
  readonly password: string
}

export interface RegisterRequest {
  readonly first_name: string
  readonly last_name: string
  readonly email: string
  readonly password: string
}

export interface RefreshTokenRequest {
  readonly refresh_token: string
}

/**
 * `POST /auth/forgot-password` — answered 204 whether or not the address is
 * registered, so nothing about the reply may be shown as confirmation that an
 * account exists.
 */
export interface ForgotPasswordRequest {
  readonly email: string
}

/** `POST /auth/reset-password` — the token arrives by mail, on its own. */
export interface ResetPasswordRequest {
  readonly token: string
  readonly password: string
}

/** `POST /auth/verify-email` — public: the token is the proof, not a session. */
export interface VerifyEmailRequest {
  readonly token: string
}

/**
 * `PUT /users/me/password`. The current password is required even though the
 * caller is authenticated: a bearer token left on a shared machine should not be
 * enough to take the account over for good.
 */
export interface ChangePasswordRequest {
  readonly current_password: string
  readonly password: string
}

export type HealthStatus = 'ok' | 'error'

export interface HealthCheck {
  readonly status: HealthStatus
  readonly checks: {
    readonly database: HealthStatus
  }
}
