import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { UsersPage } from '@/pages/users/UsersPage'

import { db, grantRole, mockTime, nextId } from '../mocks/db'
import { renderWithProviders } from '../utils/renderWithProviders'

/** Enough accounts to force the API to paginate at its 20-per-page default. */
function seedUsers(count: number): void {
  for (let index = 0; index < count; index += 1) {
    const id = nextId()
    db.users.push({
      id,
      first_name: `User${String(index).padStart(2, '0')}`,
      last_name: 'Generated',
      email: `user${id}@example.com`,
      password: 'secret123',
      roles: [],
      created_at: mockTime(index),
      updated_at: mockTime(index),
      email_verified: true,
    })
  }
}

/**
 * Pagination, sorting and filtering are shared by every list screen, so they
 * are exercised once here rather than repeated per resource.
 */
describe('List screens', () => {
  it('reports the range and total the API returned', async () => {
    grantRole('admin')
    seedUsers(30)
    renderWithProviders(<UsersPage />)

    expect(await screen.findByText('Showing 1–20 of 32')).toBeInTheDocument()
  })

  it('moves to the next page and back', async () => {
    grantRole('admin')
    seedUsers(30)
    const { user } = renderWithProviders(<UsersPage />)

    await screen.findByText('Showing 1–20 of 32')
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('Showing 21–32 of 32')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(await screen.findByText('Showing 1–20 of 32')).toBeInTheDocument()
  })

  it('jumps to a page by number', async () => {
    grantRole('admin')
    seedUsers(30)
    const { user } = renderWithProviders(<UsersPage />)

    await screen.findByText('Showing 1–20 of 32')
    const pagination = screen.getByRole('navigation', { name: 'Pagination' })
    await user.click(within(pagination).getByRole('button', { name: '2' }))

    expect(await screen.findByText('Showing 21–32 of 32')).toBeInTheDocument()
  })

  it('disables the boundary controls at the ends of the range', async () => {
    grantRole('admin')
    seedUsers(30)
    const { user } = renderWithProviders(<UsersPage />)

    await screen.findByText('Showing 1–20 of 32')
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Showing 21–32 of 32')
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('hides the pager when everything fits on one page', async () => {
    grantRole('admin')
    renderWithProviders(<UsersPage />)

    expect(await screen.findByText('Showing 1–2 of 2')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
  })

  it('cycles a column through ascending, descending and unsorted', async () => {
    grantRole('admin')
    const { user } = renderWithProviders(<UsersPage />)

    await screen.findByRole('link', { name: /Ada Lovelace/ })
    const header = screen.getByRole('button', { name: 'Sort by email' })

    await user.click(header)
    await waitFor(() => {
      expect(firstRowName()).toMatch(/Ada Lovelace/)
    })

    await user.click(header)
    await waitFor(() => {
      expect(firstRowName()).toMatch(/Grace Hopper/)
    })

    // A third click clears the sort and restores the default order.
    await user.click(header)
    await waitFor(() => {
      expect(firstRowName()).toMatch(/Ada Lovelace/)
    })
  })

  it('ignores a sort attribute the resource does not accept', async () => {
    grantRole('admin')
    renderWithProviders(<UsersPage />, { route: '/users?sort=password_hash' })

    // The API 422s an attribute outside its whitelist, and the sort comes from a
    // URL the user can edit — so the spec's whitelist drops it and the screen
    // falls back to the default order instead of rendering an error.
    expect(await screen.findByRole('link', { name: /Ada Lovelace/ })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('returns to the first page when a filter is applied', async () => {
    grantRole('admin')
    seedUsers(30)
    const { user } = renderWithProviders(<UsersPage />)

    await screen.findByText('Showing 1–20 of 32')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Showing 21–32 of 32')

    await user.type(screen.getByLabelText('Email'), 'ada@')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByText('Showing 1–1 of 1')).toBeInTheDocument()
  })

  it('clears every filter on reset', async () => {
    grantRole('admin')
    const { user } = renderWithProviders(<UsersPage />)

    await screen.findByRole('link', { name: /Grace Hopper/ })
    await user.type(screen.getByLabelText('Email'), 'grace')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() => {
      expect(screen.queryByRole('link', { name: /Ada Lovelace/ })).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(await screen.findByRole('link', { name: /Ada Lovelace/ })).toBeInTheDocument()
  })

  it('says so when a filter matches nothing', async () => {
    grantRole('admin')
    const { user } = renderWithProviders(<UsersPage />)

    await screen.findByRole('link', { name: /Grace Hopper/ })
    await user.type(screen.getByLabelText('Email'), 'nobody')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByText('No users match this filter.')).toBeInTheDocument()
  })
})

function firstRowName(): string {
  const rows = screen.getAllByRole('row')
  // Row 0 is the header.
  return rows[1]?.textContent ?? ''
}
