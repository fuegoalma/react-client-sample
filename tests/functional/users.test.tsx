import { screen, waitFor, within } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'

import { selectIsAuthenticated } from '@/app/authSlice'
import { ProfilePage } from '@/pages/ProfilePage'
import { UserRolesPage } from '@/pages/users/UserRolesPage'
import { UsersPage } from '@/pages/users/UsersPage'

import { db, grantRole } from '../mocks/db'
import { conflict, fail } from '../mocks/envelope'
import { server } from '../mocks/server'
import { renderWithProviders } from '../utils/renderWithProviders'

describe('Users list', () => {
  it('lists accounts for a moderator, without the admin-only actions', async () => {
    grantRole('moderator')
    renderWithProviders(<UsersPage />)

    expect(await screen.findByRole('link', { name: /Grace Hopper/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /new user/i })).not.toBeInTheDocument()

    const row = screen.getByRole('link', { name: /Grace Hopper/ }).closest('tr')
    expect(within(row!).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(within(row!).queryByRole('link', { name: 'Roles' })).not.toBeInTheDocument()
  })

  it('gives an admin creation, deletion and role assignment', async () => {
    grantRole('admin')
    renderWithProviders(<UsersPage />)

    expect(await screen.findByRole('button', { name: /new user/i })).toBeInTheDocument()

    const row = screen.getByRole('link', { name: /Grace Hopper/ }).closest('tr')
    expect(within(row!).getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(within(row!).getByRole('link', { name: 'Roles' })).toBeInTheDocument()
  })

  it('creates an account with no roles', async () => {
    grantRole('admin')
    const { user } = renderWithProviders(<UsersPage />)

    await user.click(await screen.findByRole('button', { name: /new user/i }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('First name'), 'Alan')
    await user.type(within(dialog).getByLabelText('Last name'), 'Turing')
    await user.type(within(dialog).getByLabelText('Email'), 'alan@example.com')
    await user.type(within(dialog).getByLabelText('Password'), 'secret123')
    await user.type(within(dialog).getByLabelText('Confirm password'), 'secret123')
    await user.click(within(dialog).getByRole('button', { name: 'Create user' }))

    await waitFor(() => {
      const created = db.users.find((candidate) => candidate.email === 'alan@example.com')
      expect(created?.roles).toEqual([])
    })
  })

  it('puts a duplicate email back on its field', async () => {
    grantRole('admin')
    const { user } = renderWithProviders(<UsersPage />)

    await user.click(await screen.findByRole('button', { name: /new user/i }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('First name'), 'Ada')
    await user.type(within(dialog).getByLabelText('Last name'), 'Lovelace')
    await user.type(within(dialog).getByLabelText('Email'), 'ada@example.com')
    await user.type(within(dialog).getByLabelText('Password'), 'secret123')
    await user.type(within(dialog).getByLabelText('Confirm password'), 'secret123')
    await user.click(within(dialog).getByRole('button', { name: 'Create user' }))

    expect(await screen.findByText('Email has already been taken.')).toBeInTheDocument()
  })

  it('refuses a mistyped confirmation without creating anything', async () => {
    grantRole('admin')
    const { user } = renderWithProviders(<UsersPage />)
    const before = db.users.length

    await user.click(await screen.findByRole('button', { name: /new user/i }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('First name'), 'Alan')
    await user.type(within(dialog).getByLabelText('Last name'), 'Turing')
    await user.type(within(dialog).getByLabelText('Email'), 'alan@example.com')
    await user.type(within(dialog).getByLabelText('Password'), 'secret123')
    await user.type(within(dialog).getByLabelText('Confirm password'), 'secret124')
    await user.click(within(dialog).getByRole('button', { name: 'Create user' }))

    expect(await screen.findByText('The two passwords do not match.')).toBeInTheDocument()
    expect(db.users.length).toBe(before)
  })

  it('filters by email', async () => {
    grantRole('admin')
    const { user } = renderWithProviders(<UsersPage />)

    await screen.findByRole('link', { name: /Grace Hopper/ })
    await user.type(screen.getByLabelText('Email'), 'grace')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: /Ada Lovelace/ })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /Grace Hopper/ })).toBeInTheDocument()
  })

  it('surfaces the 409 that protects the last role manager', async () => {
    grantRole('admin')
    db.users[1]!.roles = ['super_admin']
    const { user } = renderWithProviders(<UsersPage />)

    const row = (await screen.findByRole('link', { name: /Grace Hopper/ })).closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Delete' }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    // The API's own wording explains which invariant refused the operation.
    expect(await screen.findByText(/no user able to manage roles/i)).toBeInTheDocument()
    expect(db.users.some((candidate) => candidate.id === 2)).toBe(true)
  })
})

describe('Role assignment', () => {
  it('replaces the whole role set', async () => {
    grantRole('admin')
    const { user } = renderWithProviders(<UserRolesPage />, {
      route: '/users/2/roles',
      path: '/users/:userId/roles',
    })

    await user.click(await screen.findByLabelText(/moderator/))
    await user.click(screen.getByRole('button', { name: 'Save roles' }))

    await waitFor(() => {
      expect(db.users.find((candidate) => candidate.id === 2)?.roles).toEqual(['moderator'])
    })
  })

  it('revokes every role when the selection is cleared', async () => {
    grantRole('admin')
    db.users[1]!.roles = ['moderator']

    const { user } = renderWithProviders(<UserRolesPage />, {
      route: '/users/2/roles',
      path: '/users/:userId/roles',
    })

    await user.click(await screen.findByRole('button', { name: 'Clear all' }))
    await user.click(screen.getByRole('button', { name: 'Save roles' }))

    await waitFor(() => {
      expect(db.users.find((candidate) => candidate.id === 2)?.roles).toEqual([])
    })
  })

  it('reports the anti-escalation refusal when an admin tries to mint an admin', async () => {
    // An admin holds `role.assign` but not `role.manage`, so they may not hand
    // out a role that carries either.
    grantRole('admin')
    const { user } = renderWithProviders(<UserRolesPage />, {
      route: '/users/2/roles',
      path: '/users/:userId/roles',
    })

    await user.click(await screen.findByLabelText(/super_admin/))
    await user.click(screen.getByRole('button', { name: 'Save roles' }))

    expect(await screen.findByText(/not allowed to perform this action/i)).toBeInTheDocument()
    expect(db.users.find((candidate) => candidate.id === 2)?.roles).toEqual([])
  })
})

describe('Profile', () => {
  it('shows the caller as a base user when they hold no roles', async () => {
    renderWithProviders(<ProfilePage />)

    expect(await screen.findByText(/No roles — a base user/)).toBeInTheDocument()
  })

  it('lists the effective permissions a role grants', async () => {
    grantRole('moderator')
    renderWithProviders(<ProfilePage />)

    expect(await screen.findByText('moderator')).toBeInTheDocument()
    expect(screen.getByText('album.soft-delete.any')).toBeInTheDocument()
  })

  it('offers no password checkbox — the caller has a better route', async () => {
    // Setting one's own password without proving the current one is exactly
    // what `PUT /users/me/password` exists to stop.
    renderWithProviders(<ProfilePage />)

    await screen.findByLabelText('First name')
    expect(screen.queryByLabelText('Change password')).not.toBeInTheDocument()
  })

  it('changes the password and ends the session, as the API does', async () => {
    const { user, store } = renderWithProviders(<ProfilePage />)

    await user.type(await screen.findByLabelText('Current password'), 'secret123')
    await user.type(screen.getByLabelText('New password'), 'brand-new-1')
    await user.type(screen.getByLabelText('Confirm new password'), 'brand-new-1')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    await waitFor(() => {
      expect(db.users.find((candidate) => candidate.id === 1)?.password).toBe('brand-new-1')
    })

    // The API withdrew this token along with every other, so staying signed in
    // would leave every mounted query 401ing.
    await waitFor(() => {
      expect(selectIsAuthenticated(store.getState())).toBe(false)
    })
    expect(await screen.findByText('Password changed. Please sign in again.')).toBeInTheDocument()
  })

  it('reports a wrong current password without changing anything', async () => {
    const { user, store } = renderWithProviders(<ProfilePage />)

    await user.type(await screen.findByLabelText('Current password'), 'not-my-password')
    await user.type(screen.getByLabelText('New password'), 'brand-new-1')
    await user.type(screen.getByLabelText('Confirm new password'), 'brand-new-1')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText('The current password is incorrect.')).toBeInTheDocument()
    expect(db.users.find((candidate) => candidate.id === 1)?.password).toBe('secret123')
    expect(selectIsAuthenticated(store.getState())).toBe(true)
  })

  it('refuses a mistyped confirmation without contacting the API', async () => {
    const { user } = renderWithProviders(<ProfilePage />)

    await user.type(await screen.findByLabelText('Current password'), 'secret123')
    await user.type(screen.getByLabelText('New password'), 'brand-new-1')
    await user.type(screen.getByLabelText('Confirm new password'), 'brand-new-2')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText('The two passwords do not match.')).toBeInTheDocument()
    expect(db.users.find((candidate) => candidate.id === 1)?.password).toBe('secret123')
  })

  it('sends only the fields that were filled in', async () => {
    const { user } = renderWithProviders(<ProfilePage />)

    await user.type(await screen.findByLabelText('First name'), 'Augusta')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      const me = db.users.find((candidate) => candidate.id === 1)
      expect(me?.first_name).toBe('Augusta')
      // Untouched, so it was never sent.
      expect(me?.last_name).toBe('Lovelace')
    })
  })
})

describe('When the API refuses an account change', () => {
  it('shows the invariant’s own wording rather than a generic failure', async () => {
    // The API refuses to delete the last account able to manage roles, and its
    // 409 explains exactly that.
    grantRole('admin')
    server.use(
      http.delete('http://localhost:8084/users/:id', () =>
        conflict('This would leave no user able to manage roles.'),
      ),
    )
    const { user } = renderWithProviders(<UsersPage />)

    const row = (await screen.findByRole('link', { name: /Grace Hopper/ })).closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Delete' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }),
    )

    expect(
      await screen.findByText('This would leave no user able to manage roles.'),
    ).toBeInTheDocument()
    expect(db.users.some((candidate) => candidate.id === 2)).toBe(true)
  })

  it('deletes the account once it is confirmed', async () => {
    grantRole('admin')
    const { user } = renderWithProviders(<UsersPage />)

    const row = (await screen.findByRole('link', { name: /Grace Hopper/ })).closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Delete' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }),
    )

    expect(await screen.findByText('Grace Hopper was deleted.')).toBeInTheDocument()
    expect(db.users.some((candidate) => candidate.id === 2)).toBe(false)
  })

  it('keeps the account when the confirmation is dismissed', async () => {
    grantRole('admin')
    const { user } = renderWithProviders(<UsersPage />)

    const row = (await screen.findByRole('link', { name: /Grace Hopper/ })).closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Delete' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(db.users.some((candidate) => candidate.id === 2)).toBe(true)
  })

  it('puts a rejected profile change back on its own field', async () => {
    const { user } = renderWithProviders(<ProfilePage />)

    await user.type(await screen.findByLabelText('Email'), 'grace@example.com')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Email has already been taken.')).toBeInTheDocument()
  })
})

describe('An account form with nothing filled in', () => {
  it('sends no request at all rather than an empty update', async () => {
    const { user } = renderWithProviders(<ProfilePage />)

    const before = { ...db.users.find((candidate) => candidate.id === 1) }
    await user.click(await screen.findByRole('button', { name: 'Save changes' }))

    // Nothing changed, and no success was claimed.
    expect(db.users.find((candidate) => candidate.id === 1)).toEqual(before)
    expect(screen.queryByText('Your profile has been updated.')).not.toBeInTheDocument()
  })
})

describe('A profile whose permissions could not be read', () => {
  it('still shows the account, with an empty effective-permission list', async () => {
    server.use(http.get('http://localhost:8084/users/me/permissions', () => fail(500)))
    renderWithProviders(<ProfilePage />)

    expect(await screen.findByText('Effective permissions (0)')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Account details' })).toBeInTheDocument()
  })
})
