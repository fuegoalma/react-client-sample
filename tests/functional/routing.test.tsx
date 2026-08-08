import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { describe, expect, it } from 'vitest'

import { App } from '@/app/App'
import { credentialsReceived } from '@/app/authSlice'
import { AppRoutes } from '@/app/router'
import { createAppStore } from '@/app/store'
import { InMemoryTokenStorage } from '@/services'

import { ACCESS_TOKEN, REFRESH_TOKEN, grantRole } from '../mocks/db'
import { renderWithProviders } from '../utils/renderWithProviders'

/**
 * The real route table, mounted the way the application mounts it.
 *
 * The guards are asserted in isolation in `navigation.test.tsx`; what this file
 * proves is that they are *wired* — that `/roles` really sits behind
 * `role.index`, that an unknown address lands on the 404 screen, and that every
 * authenticated route renders inside `AppLayout`.
 */
describe('The route table', () => {
  it('sends the root address to the caller’s own albums', async () => {
    renderWithProviders(<AppRoutes />, { route: '/' })

    expect(await screen.findByRole('heading', { name: 'My albums' })).toBeInTheDocument()
  })

  it('renders every authenticated screen inside the application shell', async () => {
    renderWithProviders(<AppRoutes />, { route: '/albums' })

    expect(await screen.findByRole('heading', { name: 'My albums' })).toBeInTheDocument()
    // The shell: navigation above, the API's liveness in the footer below.
    expect(screen.getByRole('link', { name: 'Photos Client' })).toBeInTheDocument()
    expect(screen.getByText('Photos REST API client')).toBeInTheDocument()
    // The badge starts as "Checking API…" and settles once the probe answers.
    expect(await screen.findByRole('link', { name: 'API healthy' })).toBeInTheDocument()
  })

  it('answers an unknown address with the not-found screen', async () => {
    renderWithProviders(<AppRoutes />, { route: '/no-such-screen' })

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to my albums' })).toHaveAttribute(
      'href',
      '/albums',
    )
  })

  it('keeps a base user out of the privileged routes', async () => {
    renderWithProviders(<AppRoutes />, { route: '/roles' })

    expect(await screen.findByRole('heading', { name: 'Not permitted' })).toBeInTheDocument()
  })

  it('opens the same route once the caller holds the permission', async () => {
    grantRole('admin')
    renderWithProviders(<AppRoutes />, { route: '/roles' })

    expect(await screen.findByRole('heading', { name: 'Roles' })).toBeInTheDocument()
  })

  it('sends an unauthenticated visitor to the sign-in screen', async () => {
    renderWithProviders(<AppRoutes />, { route: '/albums', authenticated: false })

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })
})

describe('The application root', () => {
  it('mounts the route table under a browser router', async () => {
    // `App` brings its own router, so it cannot be nested in the memory router
    // `renderWithProviders` supplies — only the store is provided here.
    const store = createAppStore({ tokenStorage: new InMemoryTokenStorage() })
    store.dispatch(credentialsReceived({ accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN }))

    render(
      <Provider store={store}>
        <App />
      </Provider>,
    )

    expect(await screen.findByRole('heading', { name: 'My albums' })).toBeInTheDocument()
  })
})
