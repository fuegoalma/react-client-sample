import { screen, waitFor, within } from '@testing-library/react'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'

import { AppRoutes } from '@/app/router'
import { AllAlbumsPage } from '@/pages/albums/AllAlbumsPage'
import { MyAlbumsPage } from '@/pages/albums/MyAlbumsPage'

import { db, grantRole } from '../mocks/db'
import { conflict, forbidden, unprocessable } from '../mocks/envelope'
import { server } from '../mocks/server'
import { renderWithProviders } from '../utils/renderWithProviders'

describe('My albums', () => {
  it('lists the albums the caller owns, and no one else’s', async () => {
    renderWithProviders(<MyAlbumsPage />)

    expect(await screen.findByRole('link', { name: 'Vacation 2025' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Conference talks' })).not.toBeInTheDocument()
  })

  it('creates an album owned by the caller', async () => {
    const { user } = renderWithProviders(<MyAlbumsPage />)

    await user.click(await screen.findByRole('button', { name: /new album/i }))
    await user.type(screen.getByLabelText('Title'), 'Winter trip')
    await user.click(screen.getByRole('button', { name: 'Create album' }))

    expect(await screen.findByRole('link', { name: 'Winter trip' })).toBeInTheDocument()
    const created = db.albums.find((album) => album.title === 'Winter trip')
    expect(created?.user_id).toBe(1)
  })

  it('rejects a blank title before it reaches the API', async () => {
    const { user } = renderWithProviders(<MyAlbumsPage />)

    await user.click(await screen.findByRole('button', { name: /new album/i }))
    await user.click(screen.getByRole('button', { name: 'Create album' }))

    expect(await screen.findByText('Title is required.')).toBeInTheDocument()
  })

  it('renames an album from the list', async () => {
    const { user } = renderWithProviders(<MyAlbumsPage />)

    await user.click(await screen.findByRole('button', { name: 'Rename' }))
    // The dialog opens on the album's current title, not an empty field.
    const input = screen.getByLabelText('Title')
    expect(input).toHaveValue('Vacation 2025')

    await user.clear(input)
    await user.type(input, 'Summer 2025')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(db.albums.find((album) => album.id === 10)?.title).toBe('Summer 2025')
    })
  })

  it('abandons a rename when the dialog is closed', async () => {
    const { user } = renderWithProviders(<MyAlbumsPage />)

    await user.click(await screen.findByRole('button', { name: 'Rename' }))
    await user.type(screen.getByLabelText('Title'), ' edited')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(db.albums.find((album) => album.id === 10)?.title).toBe('Vacation 2025')
  })

  it('deletes an owned album permanently, whatever roles the caller holds', async () => {
    // Ownership always wins over a moderator's soft delete.
    grantRole('moderator')
    const { user } = renderWithProviders(<MyAlbumsPage />)

    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    expect(await screen.findByText(/cannot be undone/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete permanently' }))

    await waitFor(() => {
      expect(db.albums.some((album) => album.id === 10)).toBe(false)
    })
  })

  it('keeps the album when the confirmation is dismissed', async () => {
    const { user } = renderWithProviders(<MyAlbumsPage />)

    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(db.albums.some((album) => album.id === 10)).toBe(true)
  })

  it('shows the API’s own wording when a delete is refused', async () => {
    // A 409 explains which safety invariant refused the operation, and that
    // explanation is worth more than any message the client could invent.
    server.use(
      http.delete('http://localhost:8084/albums/:id', () =>
        conflict('This album is under review and cannot be deleted.'),
      ),
    )
    const { user } = renderWithProviders(<MyAlbumsPage />)

    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete permanently' }))

    expect(
      await screen.findByText('This album is under review and cannot be deleted.'),
    ).toBeInTheDocument()
    expect(db.albums.some((album) => album.id === 10)).toBe(true)
  })

  it('reports a 422 on a field the form does not render as a form-level error', async () => {
    // The API validates attributes this dialog has no input for; the message
    // still has to reach the user instead of being dropped on the floor.
    server.use(
      http.post('http://localhost:8084/albums', () =>
        unprocessable({ user_id: ['This account may not own more albums.'] }),
      ),
    )
    const { user } = renderWithProviders(<MyAlbumsPage />)

    await user.click(await screen.findByRole('button', { name: /new album/i }))
    await user.type(screen.getByLabelText('Title'), 'Winter trip')
    await user.click(screen.getByRole('button', { name: 'Create album' }))

    expect(await screen.findByText('This account may not own more albums.')).toBeInTheDocument()
  })
})

describe('All albums', () => {
  it('shows a moderator every album, with a flag action instead of a delete', async () => {
    grantRole('moderator')
    renderWithProviders(<AllAlbumsPage />)

    expect(await screen.findByRole('link', { name: 'Conference talks' })).toBeInTheDocument()

    const row = screen.getByRole('link', { name: 'Conference talks' }).closest('tr')
    expect(within(row!).getByRole('button', { name: 'Flag' })).toBeInTheDocument()
    expect(within(row!).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('offers no owner filter, which the list has no column to match', async () => {
    grantRole('admin')
    renderWithProviders(<AllAlbumsPage />)

    await screen.findByRole('link', { name: 'Conference talks' })
    expect(screen.queryByLabelText('Owner ID')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Album title')).toBeInTheDocument()
  })

  it('hides the deletion columns from a moderator, who can never see a flagged album', async () => {
    grantRole('moderator')
    renderWithProviders(<AllAlbumsPage />)

    await screen.findByRole('link', { name: 'Conference talks' })
    expect(screen.queryByText('Delete reason')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Deletion state')).not.toBeInTheDocument()
  })

  it('soft-deletes with the reason a moderator supplies', async () => {
    grantRole('moderator')
    const { user } = renderWithProviders(<AllAlbumsPage />)

    const row = (await screen.findByRole('link', { name: 'Conference talks' })).closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Flag' }))

    expect(await screen.findByText(/pending an administrator/i)).toBeInTheDocument()
    await user.type(screen.getByLabelText(/reason/i), 'Reported for review')
    await user.click(screen.getByRole('button', { name: 'Flag album' }))

    await waitFor(() => {
      const album = db.albums.find((candidate) => candidate.id === 11)
      expect(album?.is_deleted).toBe(true)
      expect(album?.delete_reason).toBe('Reported for review')
    })
  })

  it('gives an admin the deletion columns, the filter and a permanent delete', async () => {
    grantRole('admin')
    renderWithProviders(<AllAlbumsPage />)

    await screen.findByRole('link', { name: 'Conference talks' })
    expect(screen.getByText('Delete reason')).toBeInTheDocument()
    expect(screen.getByLabelText('Deletion state')).toBeInTheDocument()

    const row = screen.getByRole('link', { name: 'Conference talks' }).closest('tr')
    expect(within(row!).getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('lets an admin restore a flagged album', async () => {
    db.albums[1]!.is_deleted = true
    db.albums[1]!.delete_reason = 'Reported for review'
    grantRole('admin')

    const { user } = renderWithProviders(<AllAlbumsPage />, { route: '/all-albums?is_deleted=1' })

    const row = (await screen.findByRole('link', { name: 'Conference talks' })).closest('tr')
    expect(within(row!).getByText('Reported for review')).toBeInTheDocument()

    await user.click(within(row!).getByRole('button', { name: 'Restore' }))

    await waitFor(() => {
      expect(db.albums.find((album) => album.id === 11)?.is_deleted).toBe(false)
    })
  })

  it('lets an admin delete a flagged album outright, without restoring it first', async () => {
    db.albums[1]!.is_deleted = true
    grantRole('admin')

    const { user } = renderWithProviders(<AllAlbumsPage />, { route: '/all-albums?is_deleted=1' })

    const row = (await screen.findByRole('link', { name: 'Conference talks' })).closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete permanently' }))

    await waitFor(() => {
      expect(db.albums.some((album) => album.id === 11)).toBe(false)
    })
  })

  it('reports a refused restore instead of pretending it worked', async () => {
    db.albums[1]!.is_deleted = true
    grantRole('admin')
    server.use(http.post('http://localhost:8084/albums/:id/restore', () => forbidden()))

    const { user } = renderWithProviders(<AllAlbumsPage />, { route: '/all-albums?is_deleted=1' })

    const row = (await screen.findByRole('link', { name: 'Conference talks' })).closest('tr')
    await user.click(within(row!).getByRole('button', { name: 'Restore' }))

    expect(await screen.findByText(/not allowed to perform this action/i)).toBeInTheDocument()
    expect(db.albums.find((album) => album.id === 11)?.is_deleted).toBe(true)
  })

  it('narrows the list to flagged albums through the deletion filter', async () => {
    db.albums[1]!.is_deleted = true
    grantRole('admin')

    const { user } = renderWithProviders(<AllAlbumsPage />)

    await screen.findByRole('link', { name: 'Vacation 2025' })
    await user.selectOptions(screen.getByLabelText('Deletion state'), '1')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByRole('link', { name: 'Conference talks' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Vacation 2025' })).not.toBeInTheDocument()
  })

  /*
   * A deleted album cannot leave its own screen on display, so the detail page
   * navigates away — to the list the caller actually came from. The real route
   * table is mounted here, so the assertion is the screen that ends up on
   * display rather than a spy on the router.
   */
  it('returns to the all-albums screen after deleting someone else’s album', async () => {
    grantRole('admin')
    const { user } = renderWithProviders(<AppRoutes />, { route: '/albums/11' })

    await user.click(await screen.findByRole('button', { name: 'Delete album' }))
    await user.click(screen.getByRole('button', { name: 'Delete permanently' }))

    expect(await screen.findByRole('heading', { name: 'All albums' })).toBeInTheDocument()
  })

  it('returns to the caller’s own albums when they may delete but not list', async () => {
    // A custom role of album.delete.any without album.index.any: there is no
    // all-albums screen to return to, and "My albums" needs no permission at
    // all, so it is the one list every caller can always be sent back to.
    db.callerPermissions = ['album.view.any', 'album.delete.any', 'photo.view.any']
    const { user } = renderWithProviders(<AppRoutes />, { route: '/albums/11' })

    await user.click(await screen.findByRole('button', { name: 'Delete album' }))
    await user.click(screen.getByRole('button', { name: 'Delete permanently' }))

    expect(await screen.findByRole('heading', { name: 'My albums' })).toBeInTheDocument()
  })

  it('refuses the screen to a caller without album.index.any', async () => {
    renderWithProviders(<AllAlbumsPage />)

    // The API answers 403; the client renders it rather than an empty table.
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /not allowed to perform this action/i,
    )
  })
})
