import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AlbumDetailPage } from '@/pages/albums/AlbumDetailPage'
import { PhotoDetailPage } from '@/pages/photos/PhotoDetailPage'
import { RoleEditorPage } from '@/pages/roles/RoleEditorPage'
import { UserRolesPage } from '@/pages/users/UserRolesPage'

import { db, grantRole } from '../mocks/db'
import { renderWithProviders } from '../utils/renderWithProviders'

/** The trail, as the user reads it. */
async function trail(): Promise<readonly string[]> {
  const nav = await screen.findByRole('navigation', { name: 'Breadcrumb' })
  return within(nav)
    .getAllByRole('listitem')
    .map((item) => item.textContent)
}

describe('Breadcrumbs', () => {
  it('walks an owned album back to the caller’s own list', async () => {
    renderWithProviders(<AlbumDetailPage />, { route: '/albums/10', path: '/albums/:albumId' })

    expect(await trail()).toEqual(['My albums', 'Vacation 2025'])

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByRole('link', { name: 'My albums' })).toHaveAttribute('href', '/albums')
  })

  it('walks someone else’s album back to the all-albums screen', async () => {
    // A moderator did not reach this album through "My albums", so pointing
    // them there would be a lie about where they are.
    grantRole('moderator')
    renderWithProviders(<AlbumDetailPage />, { route: '/albums/11', path: '/albums/:albumId' })

    expect(await trail()).toEqual(['All albums', 'Conference talks'])
  })

  it('offers no parent link to a caller who cannot list albums at all', async () => {
    // `album.view.any` without `album.index.any`: a link to a list they may not
    // open would answer 403.
    db.callerPermissions = ['album.view.any', 'photo.view.any']
    renderWithProviders(<AlbumDetailPage />, { route: '/albums/11', path: '/albums/:albumId' })

    expect(await trail()).toEqual(['Albums', 'Conference talks'])
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).queryByRole('link')).not.toBeInTheDocument()
  })

  /*
   * The Back button sits beside the trail and answers the same question, so it
   * has to give the same answer. It once pointed at "/albums" unconditionally,
   * which sent a moderator viewing someone else's album to their own list.
   */
  it('sends the Back button where the trail points, on an owned album', async () => {
    renderWithProviders(<AlbumDetailPage />, { route: '/albums/10', path: '/albums/:albumId' })

    expect(await screen.findByRole('link', { name: 'Back' })).toHaveAttribute('href', '/albums')
  })

  it('sends the Back button where the trail points, on someone else’s album', async () => {
    grantRole('moderator')
    renderWithProviders(<AlbumDetailPage />, { route: '/albums/11', path: '/albums/:albumId' })

    expect(await screen.findByRole('link', { name: 'Back' })).toHaveAttribute('href', '/all-albums')
  })

  it('offers no Back button when the trail itself has nowhere to go', async () => {
    db.callerPermissions = ['album.view.any', 'photo.view.any']
    renderWithProviders(<AlbumDetailPage />, { route: '/albums/11', path: '/albums/:albumId' })

    // Waits for the screen, so the absence below is a real answer rather than
    // an assertion made before anything rendered.
    expect(await trail()).toEqual(['Albums', 'Conference talks'])
    expect(screen.queryByRole('link', { name: 'Back' })).not.toBeInTheDocument()
  })

  it('shows a photo three levels deep, naming its album', async () => {
    renderWithProviders(<PhotoDetailPage />, {
      route: '/albums/10/photos/100',
      path: '/albums/:albumId/photos/:photoId',
    })

    expect(await trail()).toEqual(['My albums', 'Vacation 2025', 'Beach sunset'])
  })

  it('offers a photo’s ancestors no link the caller may not open either', async () => {
    // The same rule as the album screen above: without `album.index.any` there
    // is no all-albums screen to send them to, and a crumb that answers 403 is
    // worse than a crumb that does nothing.
    db.callerPermissions = ['album.view.any', 'photo.view.any']
    renderWithProviders(<PhotoDetailPage />, {
      route: '/albums/11/photos/100',
      path: '/albums/:albumId/photos/:photoId',
    })

    const nav = await screen.findByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).queryByRole('link', { name: 'All albums' })).not.toBeInTheDocument()
  })

  it('shows role assignment under the user it belongs to', async () => {
    grantRole('admin')
    renderWithProviders(<UserRolesPage />, {
      route: '/users/2/roles',
      path: '/users/:userId/roles',
    })

    expect(await trail()).toEqual(['Users', 'Grace Hopper', 'Roles'])
  })

  it('shows the role composer under the roles list', async () => {
    grantRole('super_admin')
    renderWithProviders(<RoleEditorPage />, { route: '/roles/new' })

    expect(await trail()).toEqual(['Roles', 'Compose a role'])
  })

  it('marks the current page for assistive technology', async () => {
    renderWithProviders(<AlbumDetailPage />, { route: '/albums/10', path: '/albums/:albumId' })

    const nav = await screen.findByRole('navigation', { name: 'Breadcrumb' })
    const items = within(nav).getAllByRole('listitem')
    expect(items.at(-1)).toHaveAttribute('aria-current', 'page')
    expect(items[0]).not.toHaveAttribute('aria-current')
  })
})
