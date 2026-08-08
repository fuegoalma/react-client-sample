import { screen } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'

import { MyAlbumsPage } from '@/pages/albums/MyAlbumsPage'
import { AlbumDetailPage } from '@/pages/albums/AlbumDetailPage'
import { RolesPage } from '@/pages/roles/RolesPage'
import { UsersPage } from '@/pages/users/UsersPage'
import { UserRolesPage } from '@/pages/users/UserRolesPage'

import { grantRole } from '../mocks/db'
import { fail, forbidden } from '../mocks/envelope'
import { server } from '../mocks/server'
import { renderWithProviders } from '../utils/renderWithProviders'

const BASE = 'http://localhost:8084'

/**
 * A list that never arrived.
 *
 * Every list endpoint tags its cache from the rows it returned, so each one has
 * to cope with having returned none — and the screen has to say so rather than
 * render an empty table as though the list were genuinely empty.
 */
describe('When a list cannot be loaded', () => {
  it('reports a failure on the caller’s own albums', async () => {
    server.use(http.get(`${BASE}/albums/my`, () => fail(500)))
    renderWithProviders(<MyAlbumsPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/unexpected problem/i)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('reports a failure on the accounts list', async () => {
    grantRole('admin')
    server.use(http.get(`${BASE}/users`, () => fail(500)))
    renderWithProviders(<UsersPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/unexpected problem/i)
  })

  it('reports a failure on the role catalog', async () => {
    grantRole('admin')
    server.use(http.get(`${BASE}/roles`, () => fail(500)))
    renderWithProviders(<RolesPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/unexpected problem/i)
  })

  it('reports a failure on an album’s photos', async () => {
    server.use(http.get(`${BASE}/albums/:albumId/photos`, () => fail(500)))
    renderWithProviders(<AlbumDetailPage />, { route: '/albums/10', path: '/albums/:albumId' })

    // The album itself still loads; only its photo list failed.
    expect(await screen.findByRole('heading', { name: 'Vacation 2025' })).toBeInTheDocument()
  })

  it('offers nothing to assign when the role catalog is unavailable', async () => {
    grantRole('admin')
    server.use(http.get(`${BASE}/roles`, () => forbidden()))
    renderWithProviders(<UserRolesPage />, {
      route: '/users/2/roles',
      path: '/users/:userId/roles',
    })

    expect(await screen.findByRole('heading', { name: 'Roles' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})
