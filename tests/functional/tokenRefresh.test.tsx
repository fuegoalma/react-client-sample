import { screen, waitFor } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'

import { createAppStore } from '@/app/store'
import { credentialsReceived, selectIsAuthenticated } from '@/app/authSlice'
import { MyAlbumsPage } from '@/pages/albums/MyAlbumsPage'
import { baseApi, usersApi } from '@/repositories'
import { InMemoryTokenStorage } from '@/services'

import { ACCESS_TOKEN, REFRESH_TOKEN, db, expireAccessTokens } from '../mocks/db'
import { ok } from '../mocks/envelope'
import { server } from '../mocks/server'
import { renderWithProviders } from '../utils/renderWithProviders'

function signedInStore() {
  const store = createAppStore({ tokenStorage: new InMemoryTokenStorage() })
  store.dispatch(credentialsReceived({ accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN }))
  return store
}

/**
 * The two-token model is the client's most failure-prone piece: the refresh
 * token rotates, and presenting a spent one makes the API revoke the whole
 * session. These tests exercise the transport, not a screen.
 */
describe('Transparent token refresh', () => {
  it('rotates the pair on a 401 and replays the original request', async () => {
    const store = signedInStore()
    expireAccessTokens()

    const result = await store.dispatch(usersApi.endpoints.me.initiate())

    expect(result.data?.email).toBe('ada@example.com')
    expect(store.getState().auth.accessToken).not.toBe(ACCESS_TOKEN)
    expect(store.getState().auth.refreshToken).not.toBe(REFRESH_TOKEN)
  })

  it('refreshes once for many requests that all hit the stale token', async () => {
    // Two concurrent rotations would spend the same refresh token twice, which
    // the API treats as a leak and answers by revoking the family.
    const store = signedInStore()
    expireAccessTokens()

    const before = db.sessions.length
    const [me, permissions] = await Promise.all([
      store.dispatch(usersApi.endpoints.me.initiate()),
      store.dispatch(usersApi.endpoints.myPermissions.initiate()),
    ])

    expect(me.data).toBeDefined()
    expect(permissions.data).toBeDefined()
    // One spent, one issued — the session count is unchanged.
    expect(db.sessions.length).toBe(before)
    expect(selectIsAuthenticated(store.getState())).toBe(true)
  })

  it('ends the session when the refresh itself is rejected', async () => {
    const store = signedInStore()
    expireAccessTokens()
    db.refreshFails = true

    await store.dispatch(usersApi.endpoints.me.initiate())

    await waitFor(() => {
      expect(selectIsAuthenticated(store.getState())).toBe(false)
    })
    expect(store.getState().auth.refreshToken).toBeNull()
  })

  it('persists the rotated pair so a reload keeps the session', async () => {
    const storage = new InMemoryTokenStorage()
    const store = createAppStore({ tokenStorage: storage })
    store.dispatch(credentialsReceived({ accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN }))
    expireAccessTokens()

    await store.dispatch(usersApi.endpoints.me.initiate())

    expect(storage.read()?.accessToken).toBe(store.getState().auth.accessToken)
  })

  it('recovers mid-screen, so the user never sees the expiry', async () => {
    expireAccessTokens()
    renderWithProviders(<MyAlbumsPage />)

    expect(await screen.findByRole('link', { name: 'Vacation 2025' })).toBeInTheDocument()
  })

  it('lets a 401 stand once the session is already over', async () => {
    // Ending an ended session would re-dispatch `loggedOut`, which resets the
    // cache, which re-fires every mounted query without a token — straight back
    // here. The request simply fails instead.
    const store = signedInStore()
    store.dispatch({ type: 'auth/loggedOut' })

    const result = await store.dispatch(usersApi.endpoints.me.initiate())

    expect(result.error).toMatchObject({ code: 401 })
    expect(store.getState().notifications.items).toHaveLength(0)
  })

  it('drops cached server state on sign-out', async () => {
    const store = signedInStore()
    await store.dispatch(usersApi.endpoints.me.initiate())
    expect(usersApi.endpoints.me.select()(store.getState()).data).toBeDefined()

    store.dispatch({ type: 'auth/loggedOut' })

    // The next session must not read the previous one's cache.
    expect(usersApi.endpoints.me.select()(store.getState()).data).toBeUndefined()
  })
})

/**
 * RTK Query lets an endpoint describe its request as a bare URL string instead
 * of a `FetchArgs` object. No repository here does, but the transport still has
 * to read the URL out of either shape to decide what it must not retry.
 */
const probeApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    stringProbe: build.query<unknown, null>({ query: () => '/users/me' }),
    authStringProbe: build.query<unknown, null>({ query: () => '/auth/logout' }),
  }),
  overrideExisting: true,
})

describe('Requests described as a bare URL', () => {
  it('refreshes and replays one just like any other', async () => {
    const store = signedInStore()
    expireAccessTokens()

    const result = await store.dispatch(probeApi.endpoints.stringProbe.initiate(null))

    expect(result.data).toMatchObject({ email: 'ada@example.com' })
  })

  it('never retries one aimed at an auth endpoint', async () => {
    // A 401 from /auth/* means bad credentials, and replaying it would spend
    // the refresh token for nothing.
    const store = signedInStore()
    expireAccessTokens()
    const before = db.sessions.length

    await store.dispatch(probeApi.endpoints.authStringProbe.initiate(null))

    expect(db.sessions.length).toBe(before)
  })
})

describe('A refresh that answers with something unusable', () => {
  it('ends the session rather than trusting the response', async () => {
    const store = signedInStore()
    expireAccessTokens()
    server.use(http.post('http://localhost:8084/auth/refresh', () => ok('not-a-token-pair')))

    await store.dispatch(usersApi.endpoints.me.initiate())

    await waitFor(() => {
      expect(selectIsAuthenticated(store.getState())).toBe(false)
    })
  })
})

describe('Concurrent requests when the refresh fails', () => {
  it('lets the waiting request give up instead of firing without a token', async () => {
    const store = signedInStore()
    expireAccessTokens()
    db.refreshFails = true

    const [me, permissions] = await Promise.all([
      store.dispatch(usersApi.endpoints.me.initiate()),
      store.dispatch(usersApi.endpoints.myPermissions.initiate()),
    ])

    // Ending the session resets the cache, so the resolved entries are wiped
    // rather than left holding an error — what matters is that neither request
    // was replayed without a token and came back with data.
    expect(me.data).toBeUndefined()
    expect(permissions.data).toBeUndefined()
    expect(selectIsAuthenticated(store.getState())).toBe(false)
  })
})
