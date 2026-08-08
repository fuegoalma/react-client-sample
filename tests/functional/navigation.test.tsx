import { screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { selectIsAuthenticated } from '@/app/authSlice'
import { AppLayout, Navbar, RequireAuth, RequirePermission } from '@/components'
import { PERMISSIONS } from '@/services'

import { db, grantRole } from '../mocks/db'
import { renderWithProviders } from '../utils/renderWithProviders'

/**
 * Navigation and route guards are built from `/users/me/permissions`, so a base
 * user is never shown a link that would answer 403.
 */
describe('Navigation', () => {
  it('shows a base user only their own albums', async () => {
    renderWithProviders(<Navbar />)

    expect(await screen.findByRole('link', { name: 'My albums' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'All albums' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Roles' })).not.toBeInTheDocument()
  })

  it('adds the moderator’s screens', async () => {
    grantRole('moderator')
    renderWithProviders(<Navbar />)

    expect(await screen.findByRole('link', { name: 'All albums' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Roles' })).not.toBeInTheDocument()
  })

  it('adds role management for an admin', async () => {
    grantRole('admin')
    renderWithProviders(<Navbar />)

    expect(await screen.findByRole('link', { name: 'Roles' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Permissions' })).not.toBeInTheDocument()
  })

  it('adds the permission catalog for a super admin', async () => {
    grantRole('super_admin')
    renderWithProviders(<Navbar />)

    expect(await screen.findByRole('link', { name: 'Permissions' })).toBeInTheDocument()
  })

  it('greets the signed-in user by name', async () => {
    renderWithProviders(<Navbar />)

    expect(await screen.findByRole('button', { name: /Ada Lovelace/ })).toBeInTheDocument()
  })
})

describe('The account menu', () => {
  it('starts closed and opens on click', async () => {
    const { user } = renderWithProviders(<Navbar />)

    const toggle = await screen.findByRole('button', { name: /Ada Lovelace/ })
    // The stylesheet is not loaded here, so `show` — the class that drives
    // visibility — is the honest signal, not computed visibility.
    const menu = screen.getByRole('link', { name: 'Profile' }).closest('.dropdown-menu')

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(menu).not.toHaveClass('show')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(menu).toHaveClass('show')
  })

  it('fills the toggle while open, so the button shows the menu’s state', async () => {
    const { user } = renderWithProviders(<Navbar />)

    const toggle = await screen.findByRole('button', { name: /Ada Lovelace/ })
    expect(toggle).toHaveClass('btn-outline-secondary')

    await user.click(toggle)
    expect(toggle).toHaveClass('btn-secondary')
    expect(toggle).not.toHaveClass('btn-outline-secondary')
  })

  it('closes on a click anywhere outside it', async () => {
    const { user } = renderWithProviders(<Navbar />)

    const toggle = await screen.findByRole('button', { name: /Ada Lovelace/ })
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.click(screen.getByRole('link', { name: 'Photos Client' }))

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveClass('btn-outline-secondary')
  })

  it('closes on Escape', async () => {
    const { user } = renderWithProviders(<Navbar />)

    const toggle = await screen.findByRole('button', { name: /Ada Lovelace/ })
    await user.click(toggle)
    await user.keyboard('{Escape}')

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes when an entry is chosen, instead of lingering over the new page', async () => {
    const { user } = renderWithProviders(<Navbar />)

    const toggle = await screen.findByRole('button', { name: /Ada Lovelace/ })
    await user.click(toggle)
    await user.click(screen.getByRole('link', { name: 'Profile' }))

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes when the API-status entry is chosen', async () => {
    const { user } = renderWithProviders(<Navbar />)

    const toggle = await screen.findByRole('button', { name: /Ada Lovelace/ })
    await user.click(toggle)
    await user.click(screen.getByRole('link', { name: 'API status' }))

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('signs out from the menu and leaves for the login screen', async () => {
    const { user, store } = renderWithProviders(
      <Routes>
        <Route path="/albums" element={<Navbar />} />
        <Route path="/login" element={<h1>Sign in</h1>} />
      </Routes>,
      { route: '/albums' },
    )

    await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }))
    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(selectIsAuthenticated(store.getState())).toBe(false)
  })

  it('signs out everywhere from the menu', async () => {
    const { user, store } = renderWithProviders(
      <Routes>
        <Route path="/albums" element={<Navbar />} />
        <Route path="/login" element={<h1>Sign in</h1>} />
      </Routes>,
      { route: '/albums' },
    )

    await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }))
    await user.click(screen.getByRole('button', { name: 'Sign out everywhere' }))

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(db.sessions).toHaveLength(0)
    expect(selectIsAuthenticated(store.getState())).toBe(false)
  })
})

describe('The collapsed navigation on a narrow screen', () => {
  it('opens and closes with the toggle, and closes once a link is followed', async () => {
    const { user } = renderWithProviders(<Navbar />)

    const toggle = screen.getByRole('button', { name: 'Toggle navigation' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.click(await screen.findByRole('link', { name: 'My albums' }))
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })
})

/**
 * The guards are mounted the way the router mounts them — as layout routes
 * wrapping an outlet — because that is the only arrangement in which a redirect
 * resolves instead of re-running.
 */
function guardedRoutes(guard: ReactElement) {
  return (
    <Routes>
      <Route element={guard}>
        <Route path="/protected" element={<h1>Protected screen</h1>} />
      </Route>
      <Route path="/login" element={<h1>Sign in</h1>} />
    </Routes>
  )
}

describe('Route guards', () => {
  it('sends an unauthenticated visitor to the login screen', async () => {
    renderWithProviders(guardedRoutes(<RequireAuth />), {
      authenticated: false,
      route: '/protected',
    })

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Protected screen' })).not.toBeInTheDocument()
  })

  it('lets a signed-in visitor through', async () => {
    renderWithProviders(guardedRoutes(<RequireAuth />), { route: '/protected' })

    expect(await screen.findByRole('heading', { name: 'Protected screen' })).toBeInTheDocument()
  })

  it('refuses a route the caller lacks the permission for', async () => {
    renderWithProviders(guardedRoutes(<RequirePermission anyOf={[PERMISSIONS.roleManage]} />), {
      route: '/protected',
    })

    expect(await screen.findByRole('heading', { name: 'Not permitted' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Protected screen' })).not.toBeInTheDocument()
  })

  it('admits a caller holding any one of the accepted permissions', async () => {
    grantRole('admin')
    renderWithProviders(
      guardedRoutes(<RequirePermission anyOf={[PERMISSIONS.roleManage, PERMISSIONS.roleIndex]} />),
      { route: '/protected' },
    )

    expect(await screen.findByRole('heading', { name: 'Protected screen' })).toBeInTheDocument()
  })
})

/**
 * The shell persists across route changes, which is exactly why the two pieces
 * of keyboard navigation live in it rather than in a screen: a screen mounts
 * fresh each time and has no idea it replaced another one.
 */
describe('The application shell', () => {
  const shell = (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          path="/albums"
          element={
            <>
              <h1>My albums</h1>
              <Link to="/profile">Profile page</Link>
            </>
          }
        />
        <Route path="/profile" element={<h1>Profile</h1>} />
      </Route>
    </Routes>
  )

  it('offers a skip link ahead of the navigation, pointing at the content', async () => {
    const { user } = renderWithProviders(shell, { route: '/albums' })

    await user.tab()

    const skipLink = screen.getByRole('link', { name: 'Skip to content' })
    expect(skipLink).toHaveFocus()
    expect(skipLink).toHaveAttribute('href', '#appMain')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'appMain')
  })

  it('moves the focus to the new page on navigation, but not on arrival', async () => {
    const { user } = renderWithProviders(shell, { route: '/albums' })
    const main = screen.getByRole('main')

    // Landing on a page is not a change of page: stealing the focus here would
    // fight the browser's own restoration on a reload.
    expect(main).not.toHaveFocus()

    await user.click(screen.getByRole('link', { name: 'Profile page' }))

    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument()
    expect(main).toHaveFocus()
  })
})
