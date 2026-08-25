import { screen, waitFor } from '@testing-library/react'
import { http } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { selectIsAuthenticated } from '@/app/authSlice'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ProfilePage } from '@/pages/ProfilePage'

import { CURRENT_USER_ID, REFRESH_TOKEN, db } from '../mocks/db'
import { fail } from '../mocks/envelope'
import { server } from '../mocks/server'
import { renderWithProviders } from '../utils/renderWithProviders'

describe('Signing in', () => {
  it('stores the issued token pair and admits the user', async () => {
    const { user, store } = renderWithProviders(<LoginPage />, { authenticated: false })

    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(selectIsAuthenticated(store.getState())).toBe(true)
    })
    expect(store.getState().auth.refreshToken).not.toBeNull()
  })

  it('reports bad credentials without signing the user in', async () => {
    const { user, store } = renderWithProviders(<LoginPage />, { authenticated: false })

    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    // The API's own wording reaches the user now: "sign in again" was the
    // client's stand-in for a generic 401, and it read as though a session had
    // expired when in fact the password was simply wrong.
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid email or password/i)
    expect(selectIsAuthenticated(store.getState())).toBe(false)
  })

  it('never sends an obviously invalid email to the API', async () => {
    const { user, store } = renderWithProviders(<LoginPage />, { authenticated: false })

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(selectIsAuthenticated(store.getState())).toBe(false)
  })

  it('surfaces the rate limit the API applies to auth endpoints', async () => {
    db.rateLimited = true
    const { user } = renderWithProviders(<LoginPage />, { authenticated: false })

    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/too many attempts/i)
  })
})

describe('Registering', () => {
  it('creates the account and signs it straight in', async () => {
    const { user, store } = renderWithProviders(<RegisterPage />, { authenticated: false })

    await user.type(screen.getByLabelText('First name'), 'Alan')
    await user.type(screen.getByLabelText('Last name'), 'Turing')
    await user.type(screen.getByLabelText('Email'), 'alan@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.type(screen.getByLabelText('Confirm password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => {
      expect(selectIsAuthenticated(store.getState())).toBe(true)
    })
    expect(db.users.some((candidate) => candidate.email === 'alan@example.com')).toBe(true)
  })

  it('refuses a mistyped confirmation without contacting the API', async () => {
    const { user, store } = renderWithProviders(<RegisterPage />, { authenticated: false })
    const before = db.users.length

    await user.type(screen.getByLabelText('First name'), 'Alan')
    await user.type(screen.getByLabelText('Last name'), 'Turing')
    await user.type(screen.getByLabelText('Email'), 'alan@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.type(screen.getByLabelText('Confirm password'), 'secret124')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('The two passwords do not match.')).toBeInTheDocument()
    expect(db.users.length).toBe(before)
    expect(selectIsAuthenticated(store.getState())).toBe(false)
  })

  it('puts a duplicate-email 422 on the email field', async () => {
    const { user, store } = renderWithProviders(<RegisterPage />, { authenticated: false })

    await user.type(screen.getByLabelText('First name'), 'Ada')
    await user.type(screen.getByLabelText('Last name'), 'Lovelace')
    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret123')
    await user.type(screen.getByLabelText('Confirm password'), 'secret123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Email has already been taken.')).toBeInTheDocument()
    expect(selectIsAuthenticated(store.getState())).toBe(false)
  })
})

/**
 * Signing out is mounted together with its destination, exactly as the router
 * mounts it.
 *
 * That is not test convenience. Ending the session resets the RTK Query cache,
 * so a screen still holding a query would re-issue it immediately — now without
 * a token. Navigating away is what unmounts the query, and every real sign-out
 * path does navigate.
 */
function profileWithLogin() {
  return (
    <Routes>
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/login" element={<h1>Sign in</h1>} />
    </Routes>
  )
}

describe('Signing out', () => {
  it('revokes this device’s session and ends the local one', async () => {
    const { user, store } = renderWithProviders(profileWithLogin(), { route: '/profile' })

    await user.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(selectIsAuthenticated(store.getState())).toBe(false)
    // Only this device: the API keeps whatever other sessions existed.
    expect(db.sessions.some((session) => session.refreshToken === REFRESH_TOKEN)).toBe(false)
    expect(screen.getByText('You have been signed out.')).toBeInTheDocument()
  })

  it('revokes every session of the account when asked to', async () => {
    db.sessions.push({ accessToken: 'other-a', refreshToken: 'other-r', userId: CURRENT_USER_ID })
    const { user, store } = renderWithProviders(profileWithLogin(), { route: '/profile' })

    await user.click(await screen.findByRole('button', { name: 'Sign out everywhere' }))

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(selectIsAuthenticated(store.getState())).toBe(false)
    expect(db.sessions).toHaveLength(0)
    expect(screen.getByText('Signed out on all devices.')).toBeInTheDocument()
  })

  it('ends the local session even when the API refuses the request', async () => {
    // Best-effort by design: the server-side session may already be gone, and
    // ours must end either way.
    server.use(http.post('http://localhost:8084/auth/logout', () => fail(500)))
    const { user, store } = renderWithProviders(profileWithLogin(), { route: '/profile' })

    await user.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(selectIsAuthenticated(store.getState())).toBe(false)
  })
})
