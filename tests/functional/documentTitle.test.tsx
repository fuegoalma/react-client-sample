import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppRoutes } from '@/app/router'
import { config } from '@/config'

import { grantRole } from '../mocks/db'
import { renderWithProviders } from '../utils/renderWithProviders'

/**
 * A client-side navigation replaces everything on the page except its title, so
 * without this the back menu and every bookmark read the same for every screen.
 */
describe('The document title', () => {
  it('names the screen and the application', async () => {
    renderWithProviders(<AppRoutes />, { route: '/albums' })

    await screen.findByRole('heading', { name: 'My albums' })

    expect(document.title).toBe(`My albums · ${config.appName}`)
  })

  it('changes with the screen', async () => {
    grantRole('admin')
    const { user } = renderWithProviders(<AppRoutes />, { route: '/albums' })

    await screen.findByRole('heading', { name: 'My albums' })
    await user.click(await screen.findByRole('link', { name: 'Roles' }))

    await screen.findByRole('heading', { name: 'Roles' })
    expect(document.title).toBe(`Roles · ${config.appName}`)
  })

  it('follows a record’s own name, not the route', async () => {
    renderWithProviders(<AppRoutes />, { route: '/albums/10' })

    await screen.findByRole('heading', { name: 'Vacation 2025' })

    expect(document.title).toBe(`Vacation 2025 · ${config.appName}`)
  })

  it('covers the screens outside the shell too', async () => {
    renderWithProviders(<AppRoutes />, { route: '/login', authenticated: false })

    await screen.findByRole('heading', { name: 'Sign in' })

    expect(document.title).toBe(`Sign in · ${config.appName}`)
  })

  it('names the not-found screen, which owns its own heading', async () => {
    renderWithProviders(<AppRoutes />, { route: '/no-such-screen' })

    await screen.findByRole('heading', { name: 'Page not found' })

    expect(document.title).toBe(`Page not found · ${config.appName}`)
  })
})
