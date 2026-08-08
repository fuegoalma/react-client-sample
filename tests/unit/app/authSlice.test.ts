import { describe, expect, it } from 'vitest'

import {
  authSlice,
  credentialsReceived,
  initialAuthState,
  loggedOut,
  selectAccessToken,
  selectIsAuthenticated,
  selectRefreshToken,
} from '@/app/authSlice'

const reducer = authSlice.reducer
const tokens = { accessToken: 'a1', refreshToken: 'r1' }

describe('authSlice', () => {
  it('starts signed out', () => {
    const state = reducer(undefined, { type: '@@init' })
    expect(state).toEqual({ accessToken: null, refreshToken: null })
  })

  it('stores a freshly issued pair', () => {
    const state = reducer(undefined, credentialsReceived(tokens))
    expect(state).toEqual(tokens)
  })

  it('replaces the pair on rotation, keeping no trace of the spent one', () => {
    // The API treats a re-used refresh token as a leak, so the old one must go.
    const first = reducer(undefined, credentialsReceived(tokens))
    const second = reducer(first, credentialsReceived({ accessToken: 'a2', refreshToken: 'r2' }))
    expect(second).toEqual({ accessToken: 'a2', refreshToken: 'r2' })
  })

  it('clears both tokens on sign-out', () => {
    const signedIn = reducer(undefined, credentialsReceived(tokens))
    expect(reducer(signedIn, loggedOut())).toEqual({ accessToken: null, refreshToken: null })
  })

  it('restores a persisted session before the first render', () => {
    expect(initialAuthState(tokens)).toEqual(tokens)
    expect(initialAuthState(null)).toEqual({ accessToken: null, refreshToken: null })
  })

  it('reports authentication from the access token alone', () => {
    expect(selectIsAuthenticated({ auth: { accessToken: 'a', refreshToken: null } })).toBe(true)
    expect(selectIsAuthenticated({ auth: { accessToken: null, refreshToken: 'r' } })).toBe(false)
  })

  it('exposes each token to the layer that needs it', () => {
    // The transport reads the access token; re-authentication reads the refresh one.
    const state = { auth: tokens }
    expect(selectAccessToken(state)).toBe('a1')
    expect(selectRefreshToken(state)).toBe('r1')
  })
})
