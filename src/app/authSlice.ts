import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { StoredTokens } from '@/contracts'

export interface AuthState {
  accessToken: string | null
  refreshToken: string | null
}

const emptyState: AuthState = { accessToken: null, refreshToken: null }

/**
 * The token pair, and nothing else — the profile and the caller's permissions
 * are server state and live in the RTK Query cache instead.
 */
export const authSlice = createSlice({
  name: 'auth',
  initialState: emptyState,
  reducers: {
    /** A fresh pair from login, register, or a rotation during refresh. */
    credentialsReceived(state, action: PayloadAction<StoredTokens>) {
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
    },
    loggedOut(state) {
      state.accessToken = null
      state.refreshToken = null
    },
  },
  selectors: {
    selectAccessToken: (state) => state.accessToken,
    selectRefreshToken: (state) => state.refreshToken,
    selectIsAuthenticated: (state) => state.accessToken !== null,
  },
})

export const { credentialsReceived, loggedOut } = authSlice.actions
export const { selectAccessToken, selectRefreshToken, selectIsAuthenticated } = authSlice.selectors

export function initialAuthState(tokens: StoredTokens | null): AuthState {
  return tokens === null ? emptyState : { ...tokens }
}
