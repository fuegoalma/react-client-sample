import type { LoginRequest, RefreshTokenRequest, RegisterRequest, TokenPair } from '@/types'

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

    /** Revokes every session of the token's owner. */
    logoutAll: build.mutation<null, RefreshTokenRequest>({
      query: (body) => ({ url: '/auth/logout-all', method: 'POST', body }),
    }),
  }),
})

export const { useLoginMutation, useRegisterMutation, useLogoutMutation, useLogoutAllMutation } =
  authApi
