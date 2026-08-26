import type {
  ForgotPasswordRequest,
  LoginRequest,
  RefreshTokenRequest,
  RegisterRequest,
  ResetPasswordRequest,
  TokenPair,
  VerifyEmailRequest,
} from '@/types'

import { baseApi } from './baseApi'

/**
 * The public, rate-limited auth endpoints.
 *
 * `POST /auth/refresh` is deliberately absent: rotation happens inside the
 * transport (`api/baseQueryWithReauth`), which is the only place that can
 * serialise it. Exposing a second path would risk two concurrent rotations,
 * which the API treats as a leaked token.
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<TokenPair, LoginRequest>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),

    register: build.mutation<TokenPair, RegisterRequest>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),

    /** Revokes this device's session. Idempotent — an unknown token still 204s. */
    logout: build.mutation<null, RefreshTokenRequest>({
      query: (body) => ({ url: '/auth/logout', method: 'POST', body }),
    }),

    /**
     * Revokes every session of the token's owner, and withdraws the access
     * tokens already issued to them — unlike `logout`, which ends one device.
     */
    logoutAll: build.mutation<null, RefreshTokenRequest>({
      query: (body) => ({ url: '/auth/logout-all', method: 'POST', body }),
    }),

    /**
     * Starts a password reset. Always 204, registered address or not — the
     * caller learns nothing about who has an account here.
     */
    forgotPassword: build.mutation<null, ForgotPasswordRequest>({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),

    /**
     * Spends the mailed token and stores the new password. Every session of the
     * account ends and no token pair comes back — the user signs in again.
     */
    resetPassword: build.mutation<null, ResetPasswordRequest>({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),

    /**
     * Confirms an address. Public on purpose: the token is the proof, and
     * requiring a session would break opening the link in another browser.
     */
    verifyEmail: build.mutation<null, VerifyEmailRequest>({
      query: (body) => ({ url: '/auth/verify-email', method: 'POST', body }),
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useLogoutAllMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyEmailMutation,
} = authApi
