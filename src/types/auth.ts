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

export type HealthStatus = 'ok' | 'error'

export interface HealthCheck {
  readonly status: HealthStatus
  readonly checks: {
    readonly database: HealthStatus
  }
}
