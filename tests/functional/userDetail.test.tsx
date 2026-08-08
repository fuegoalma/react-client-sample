import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { UserDetailPage } from '@/pages/users/UserDetailPage'

import { db, grantRole } from '../mocks/db'
import { renderWithProviders } from '../utils/renderWithProviders'

const ROUTE = { route: '/users/2', path: '/users/:userId' } as const

describe('User detail', () => {
  it('shows where it sits, with a trail back to the users list', async () => {
    grantRole('admin')
    renderWithProviders(<UserDetailPage />, ROUTE)

    const trail = await screen.findByRole('navigation', { name: 'Breadcrumb' })
    expect(within(trail).getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/users')
    expect(within(trail).getByText('Grace Hopper')).toBeInTheDocument()
  })

  it('shows the account and the albums it owns', async () => {
    grantRole('admin')
    renderWithProviders(<UserDetailPage />, ROUTE)

    expect(await screen.findByRole('heading', { name: 'Grace Hopper' })).toBeInTheDocument()
    expect(screen.getByText('grace@example.com')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Conference talks' })).toBeInTheDocument()
  })

  it('marks a flagged album in the owner’s list', async () => {
    grantRole('admin')
    db.albums[1]!.is_deleted = true
    renderWithProviders(<UserDetailPage />, ROUTE)

    await screen.findByRole('heading', { name: 'Grace Hopper' })
    expect(screen.getByText('Flagged')).toBeInTheDocument()
  })

  it('applies a partial update, leaving untouched fields alone', async () => {
    grantRole('admin')
    const { user } = renderWithProviders(<UserDetailPage />, ROUTE)

    await user.type(await screen.findByLabelText('First name'), 'Amazing')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      const updated = db.users.find((candidate) => candidate.id === 2)
      expect(updated?.first_name).toBe('Amazing')
      expect(updated?.email).toBe('grace@example.com')
    })
  })

  it('keeps the password fields behind the opt-in checkbox', async () => {
    grantRole('admin')
    const { user } = renderWithProviders(<UserDetailPage />, ROUTE)

    await screen.findByLabelText('First name')
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('Change password'))
    expect(screen.getByLabelText('New password')).toBeInTheDocument()
  })

  it('changes the password when both fields match', async () => {
    grantRole('admin')
    const { user } = renderWithProviders(<UserDetailPage />, ROUTE)

    await user.click(await screen.findByLabelText('Change password'))
    await user.type(screen.getByLabelText('New password'), 'issued-by-admin')
    await user.type(screen.getByLabelText('Confirm new password'), 'issued-by-admin')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(db.users.find((candidate) => candidate.id === 2)?.password).toBe('issued-by-admin')
    })
  })

  it('refuses a mistyped confirmation and sends nothing', async () => {
    grantRole('admin')
    const { user } = renderWithProviders(<UserDetailPage />, ROUTE)

    await user.click(await screen.findByLabelText('Change password'))
    await user.type(screen.getByLabelText('New password'), 'issued-by-admin')
    await user.type(screen.getByLabelText('Confirm new password'), 'mistyped')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('The two passwords do not match.')).toBeInTheDocument()
    expect(db.users.find((candidate) => candidate.id === 2)?.password).toBe('secret123')
  })

  it('reports a duplicate email on its field', async () => {
    grantRole('admin')
    const { user } = renderWithProviders(<UserDetailPage />, ROUTE)

    await user.type(await screen.findByLabelText('Email'), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Email has already been taken.')).toBeInTheDocument()
  })

  it('offers a moderator no way to edit the account', async () => {
    // A moderator can see users but not update them, and ownership does not
    // apply to someone else's profile.
    grantRole('moderator')
    db.callerPermissions = ['user.index.any', 'user.view.any']
    renderWithProviders(<UserDetailPage />, ROUTE)

    expect(
      await screen.findByText(/do not have permission to edit this account/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })

  it('hides role management from a caller without role.assign', async () => {
    grantRole('moderator')
    db.callerPermissions = ['user.view.any']
    renderWithProviders(<UserDetailPage />, ROUTE)

    await screen.findByRole('heading', { name: 'Grace Hopper' })
    expect(screen.queryByRole('link', { name: 'Manage roles' })).not.toBeInTheDocument()
  })

  it('renders the API’s 404 for an account that does not exist', async () => {
    grantRole('admin')
    renderWithProviders(<UserDetailPage />, { route: '/users/999', path: '/users/:userId' })

    expect(await screen.findByRole('alert')).toHaveTextContent(/not found/i)
  })
})

describe('An account with nothing to show', () => {
  it('says so instead of rendering an empty list', async () => {
    db.albums = db.albums.filter((album) => album.user_id !== 2)
    grantRole('admin')

    renderWithProviders(<UserDetailPage />, ROUTE)

    expect(await screen.findByText('This user has no albums.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Albums (0)' })).toBeInTheDocument()
  })
})
