import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AlbumDetailPage } from '@/pages/albums/AlbumDetailPage'
import { PhotoDetailPage } from '@/pages/photos/PhotoDetailPage'

import { db, grantRole } from '../mocks/db'
import { forbidden, noContent, unprocessable } from '../mocks/envelope'
import { server } from '../mocks/server'
import { renderWithProviders } from '../utils/renderWithProviders'

const API = 'http://localhost:8084'
const OWN_ALBUM = '/albums/10'
const OTHER_ALBUM = '/albums/11'

function imageFile(name = 'beach.png'): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' })
}

describe('Album detail', () => {
  it('shows the album, its owner and its photos', async () => {
    renderWithProviders(<AlbumDetailPage />, { route: OWN_ALBUM, path: '/albums/:albumId' })

    expect(await screen.findByRole('heading', { name: 'Vacation 2025' })).toBeInTheDocument()
    expect(screen.getByText(/Owned by Ada Lovelace/)).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Beach sunset' })).toBeInTheDocument()
  })

  it('keeps the page’s shape while the photos load, as every other list does', async () => {
    // The grid is not a DataTable, so it wires up its own QueryBoundary — but
    // it is still rows of content arriving, and it waited behind a centred
    // spinner while every list screen waited behind a skeleton.
    server.use(
      http.get(`${API}/albums/:id/photos`, async () => {
        await delay(150)
        return new Response(null, { status: 204 })
      }),
    )
    renderWithProviders(<AlbumDetailPage />, { route: OWN_ALBUM, path: '/albums/:albumId' })

    await screen.findByRole('heading', { name: 'Vacation 2025' })
    expect(document.querySelector('.skeleton')).toBeInTheDocument()
    expect(document.querySelector('.spinner-border')).not.toBeInTheDocument()
  })

  it('renames an album the caller owns', async () => {
    const { user } = renderWithProviders(<AlbumDetailPage />, {
      route: OWN_ALBUM,
      path: '/albums/:albumId',
    })

    await user.click(await screen.findByRole('button', { name: 'Rename' }))
    const input = screen.getByLabelText('Title')
    await user.clear(input)
    await user.type(input, 'Summer 2025')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(db.albums.find((album) => album.id === 10)?.title).toBe('Summer 2025')
    })
  })

  it('hides every write action from a caller who only has view access', async () => {
    // `album.view.any` alone: readable, but not writable.
    grantRole('moderator')
    db.callerPermissions = ['album.view.any', 'photo.view.any']

    renderWithProviders(<AlbumDetailPage />, { route: OTHER_ALBUM, path: '/albums/:albumId' })

    expect(await screen.findByRole('heading', { name: 'Conference talks' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /upload photo/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete album/i })).not.toBeInTheDocument()
  })
})

describe('Uploading a photo', () => {
  it('uploads into the album and shows it', async () => {
    const { user } = renderWithProviders(<AlbumDetailPage />, {
      route: OWN_ALBUM,
      path: '/albums/:albumId',
    })

    await user.click(await screen.findByRole('button', { name: /upload photo/i }))
    await user.type(screen.getByLabelText('Title'), 'Harbour at dusk')
    await user.upload(screen.getByLabelText('Image'), imageFile())
    await user.click(screen.getByRole('button', { name: 'Upload' }))

    expect(await screen.findByRole('heading', { name: 'Harbour at dusk' })).toBeInTheDocument()
    expect(db.photos.some((photo) => photo.title === 'Harbour at dusk')).toBe(true)
  })

  it('refuses a file type the API would reject, without uploading it', async () => {
    // A drag-and-drop bypasses the file picker's `accept` filter, so the
    // schema — not the browser — is what has to reject this file.
    const user = userEvent.setup({ applyAccept: false })
    renderWithProviders(<AlbumDetailPage />, { route: OWN_ALBUM, path: '/albums/:albumId' })

    const before = db.photos.length
    await user.click(await screen.findByRole('button', { name: /upload photo/i }))
    await user.type(screen.getByLabelText('Title'), 'A document')
    await user.upload(screen.getByLabelText('Image'), new File(['x'], 'notes.pdf'))
    await user.click(screen.getByRole('button', { name: 'Upload' }))

    expect(
      await screen.findByText('Allowed formats: jpg, jpeg, png, webp, gif, avif.'),
    ).toBeInTheDocument()
    expect(db.photos.length).toBe(before)
  })

  it('requires a file to be chosen', async () => {
    const { user } = renderWithProviders(<AlbumDetailPage />, {
      route: OWN_ALBUM,
      path: '/albums/:albumId',
    })

    await user.click(await screen.findByRole('button', { name: /upload photo/i }))
    await user.type(screen.getByLabelText('Title'), 'No file')
    await user.click(screen.getByRole('button', { name: 'Upload' }))

    expect(await screen.findByText('Choose an image to upload.')).toBeInTheDocument()
  })
})

describe('Deleting a photo', () => {
  it('removes it after confirmation', async () => {
    const { user } = renderWithProviders(<AlbumDetailPage />, {
      route: OWN_ALBUM,
      path: '/albums/:albumId',
    })

    const card = (await screen.findByRole('heading', { name: 'Beach sunset' })).closest('figure')
    await user.click(within(card!).getByRole('button', { name: 'Delete' }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(db.photos.some((photo) => photo.id === 100)).toBe(false)
    })
  })

  it('takes the tile off the grid before the server has answered', async () => {
    // The point of the optimistic update: the wait is the network's, and the
    // grid should not sit there showing something the user has just removed.
    server.use(
      http.delete(`${API}/photos/:id`, async () => {
        await delay(150)
        return noContent()
      }),
    )
    const { user } = renderWithProviders(<AlbumDetailPage />, {
      route: OWN_ALBUM,
      path: '/albums/:albumId',
    })

    const card = (await screen.findByRole('heading', { name: 'Beach sunset' })).closest('figure')
    await user.click(within(card!).getByRole('button', { name: 'Delete' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }),
    )

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Beach sunset' })).not.toBeInTheDocument()
    })
    // The tile is already gone while the mock is still sitting on the request:
    // that, not the render that removed it, is what optimism means here.
    expect(db.photos.some((photo) => photo.id === 100)).toBe(true)
  })

  it('puts the tile back when the server refuses', async () => {
    server.use(http.delete(`${API}/photos/:id`, () => forbidden()))
    const { user } = renderWithProviders(<AlbumDetailPage />, {
      route: OWN_ALBUM,
      path: '/albums/:albumId',
    })

    const card = (await screen.findByRole('heading', { name: 'Beach sunset' })).closest('figure')
    await user.click(within(card!).getByRole('button', { name: 'Delete' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }),
    )

    expect(await screen.findByText(/not allowed to perform this action/i)).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Beach sunset' })).toBeInTheDocument()
    expect(db.photos.some((photo) => photo.id === 100)).toBe(true)
  })

  it('keeps the photo when the confirmation is dismissed', async () => {
    const { user } = renderWithProviders(<AlbumDetailPage />, {
      route: OWN_ALBUM,
      path: '/albums/:albumId',
    })

    const card = (await screen.findByRole('heading', { name: 'Beach sunset' })).closest('figure')
    await user.click(within(card!).getByRole('button', { name: 'Delete' }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(db.photos.some((photo) => photo.id === 100)).toBe(true)
  })
})

describe('Deleting an album from its own screen', () => {
  it('leaves the screen once the album is gone', async () => {
    const { user } = renderWithProviders(
      <Routes>
        <Route path="/albums/:albumId" element={<AlbumDetailPage />} />
        <Route path="/albums" element={<h1>My albums</h1>} />
      </Routes>,
      { route: OWN_ALBUM },
    )

    await user.click(await screen.findByRole('button', { name: /delete album/i }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete permanently' }))

    // Staying on the detail screen of a deleted album would only show a 404.
    expect(await screen.findByRole('heading', { name: 'My albums' })).toBeInTheDocument()
    expect(db.albums.some((album) => album.id === 10)).toBe(false)
  })
})

describe('Photo detail', () => {
  it('renames a photo the caller owns through its album', async () => {
    const { user } = renderWithProviders(<PhotoDetailPage />, {
      route: '/albums/10/photos/100',
      path: '/albums/:albumId/photos/:photoId',
    })

    const input = await screen.findByLabelText('Title')
    await user.clear(input)
    await user.type(input, 'Golden hour')
    await user.click(screen.getByRole('button', { name: 'Save title' }))

    await waitFor(() => {
      expect(db.photos.find((photo) => photo.id === 100)?.title).toBe('Golden hour')
    })
  })

  it('labels the file link for what it does — the API keeps no original', async () => {
    renderWithProviders(<PhotoDetailPage />, {
      route: '/albums/10/photos/100',
      path: '/albums/:albumId/photos/:photoId',
    })

    const link = await screen.findByRole('link', { name: 'Open in new tab' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(screen.queryByRole('link', { name: 'Open original' })).not.toBeInTheDocument()
  })

  it('offers no editing to a caller who may only view', async () => {
    db.callerPermissions = ['photo.view.any']

    renderWithProviders(<PhotoDetailPage />, {
      route: '/albums/11/photos/100',
      path: '/albums/:albumId/photos/:photoId',
    })

    expect(
      await screen.findByText(/do not have permission to edit this photo/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save title' })).not.toBeInTheDocument()
  })

  it('says plainly when the API stored no file for the photo', async () => {
    const photo = db.photos.find((candidate) => candidate.id === 100)
    if (photo !== undefined) photo.url = null

    renderWithProviders(<PhotoDetailPage />, {
      route: '/albums/10/photos/100',
      path: '/albums/:albumId/photos/:photoId',
    })

    expect(await screen.findByRole('heading', { name: 'Beach sunset' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Open in new tab' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('deletes the photo and returns to its album', async () => {
    const { user } = renderWithProviders(
      <Routes>
        <Route path="/albums/:albumId/photos/:photoId" element={<PhotoDetailPage />} />
        <Route path="/albums/:albumId" element={<h1>Vacation 2025</h1>} />
      </Routes>,
      { route: '/albums/10/photos/100' },
    )

    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('heading', { name: 'Vacation 2025' })).toBeInTheDocument()
    expect(db.photos.some((photo) => photo.id === 100)).toBe(false)
  })

  it('keeps the photo when the confirmation is dismissed', async () => {
    const { user } = renderWithProviders(<PhotoDetailPage />, {
      route: '/albums/10/photos/100',
      path: '/albums/:albumId/photos/:photoId',
    })

    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(db.photos.some((photo) => photo.id === 100)).toBe(true)
  })
})

describe('An album with more photos than fit on a page', () => {
  it('pages through them instead of rendering the lot', async () => {
    for (let index = 0; index < 25; index += 1) {
      db.photos.push({
        id: 200 + index,
        album_id: 10,
        title: `Photo ${String(index)}`,
        url: null,
        created_at: index,
      })
    }

    const { user } = renderWithProviders(<AlbumDetailPage />, {
      route: OWN_ALBUM,
      path: '/albums/:albumId',
    })

    expect(await screen.findByText(/Showing 1–20 of 26/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText(/Showing 21–26 of 26/)).toBeInTheDocument()
  })

  it('invites the owner to upload into an empty album, and merely states it to a visitor', async () => {
    db.photos = []

    const { unmount } = renderWithProviders(<AlbumDetailPage />, {
      route: OWN_ALBUM,
      path: '/albums/:albumId',
    })
    expect(await screen.findByText('No photos yet — upload the first one.')).toBeInTheDocument()
    unmount()

    db.callerPermissions = ['album.view.any', 'photo.view.any']
    renderWithProviders(<AlbumDetailPage />, { route: OTHER_ALBUM, path: '/albums/:albumId' })

    expect(await screen.findByText('This album has no photos.')).toBeInTheDocument()
  })
})

describe('When the API refuses a photo change', () => {
  it('puts a rejected title back on its field', async () => {
    server.use(
      http.put('http://localhost:8084/photos/:id', () =>
        unprocessable({ title: ['Title has already been taken.'] }),
      ),
    )
    const { user } = renderWithProviders(<PhotoDetailPage />, {
      route: '/albums/10/photos/100',
      path: '/albums/:albumId/photos/:photoId',
    })

    const input = await screen.findByLabelText('Title')
    await user.clear(input)
    await user.type(input, 'Golden hour')
    await user.click(screen.getByRole('button', { name: 'Save title' }))

    expect(await screen.findByText('Title has already been taken.')).toBeInTheDocument()
  })

  it('reports a refused deletion and keeps the photo on screen', async () => {
    server.use(http.delete('http://localhost:8084/photos/:id', () => forbidden()))
    const { user } = renderWithProviders(<PhotoDetailPage />, {
      route: '/albums/10/photos/100',
      path: '/albums/:albumId/photos/:photoId',
    })

    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }),
    )

    expect(await screen.findByText(/not allowed to perform this action/i)).toBeInTheDocument()
    expect(db.photos.some((photo) => photo.id === 100)).toBe(true)
  })

  it('reports a refused upload on the form that started it', async () => {
    server.use(
      http.post('http://localhost:8084/albums/:albumId/photos', () =>
        unprocessable({ file: ['The file could not be processed.'] }),
      ),
    )
    const { user } = renderWithProviders(<AlbumDetailPage />, {
      route: OWN_ALBUM,
      path: '/albums/:albumId',
    })

    await user.click(await screen.findByRole('button', { name: /upload photo/i }))
    await user.type(screen.getByLabelText('Title'), 'Harbour at dusk')
    await user.upload(screen.getByLabelText('Image'), imageFile())
    await user.click(screen.getByRole('button', { name: 'Upload' }))

    expect(await screen.findByText('The file could not be processed.')).toBeInTheDocument()
  })

  it('abandons a rename when the album dialog is closed', async () => {
    const { user } = renderWithProviders(<AlbumDetailPage />, {
      route: OWN_ALBUM,
      path: '/albums/:albumId',
    })

    await user.click(await screen.findByRole('button', { name: 'Rename' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(db.albums.find((album) => album.id === 10)?.title).toBe('Vacation 2025')
  })
})

describe('A flagged album, seen by someone who can act on it', () => {
  it('shows the flag and the reason recorded with it', async () => {
    db.albums[0]!.is_deleted = true
    db.albums[0]!.delete_reason = 'Reported for review'
    grantRole('admin')

    renderWithProviders(<AlbumDetailPage />, { route: OWN_ALBUM, path: '/albums/:albumId' })

    expect(await screen.findByText('Flagged for review')).toBeInTheDocument()
    expect(screen.getByText(/Reason: Reported for review/)).toBeInTheDocument()
  })

  it('reports a refused photo deletion from the album screen', async () => {
    server.use(http.delete('http://localhost:8084/photos/:id', () => forbidden()))
    const { user } = renderWithProviders(<AlbumDetailPage />, {
      route: OWN_ALBUM,
      path: '/albums/:albumId',
    })

    const card = (await screen.findByRole('heading', { name: 'Beach sunset' })).closest('figure')
    await user.click(within(card!).getByRole('button', { name: 'Delete' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }),
    )

    expect(await screen.findByText(/not allowed to perform this action/i)).toBeInTheDocument()
    expect(db.photos.some((photo) => photo.id === 100)).toBe(true)
  })
})

describe('Filtering an album’s photos down to nothing', () => {
  it('says the filter matched nothing, not that the album is empty', async () => {
    const { user } = renderWithProviders(<AlbumDetailPage />, {
      route: OWN_ALBUM,
      path: '/albums/:albumId',
    })

    await user.type(await screen.findByLabelText('Photo title'), 'nothing-matches-this')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByText('No photos match this filter.')).toBeInTheDocument()
  })
})

describe('Choosing and then unchoosing a file', () => {
  it('drops the preview when the selection is cleared', async () => {
    const { user } = renderWithProviders(<AlbumDetailPage />, {
      route: OWN_ALBUM,
      path: '/albums/:albumId',
    })

    await user.click(await screen.findByRole('button', { name: /upload photo/i }))
    const input = screen.getByLabelText('Image')

    await user.upload(input, imageFile())
    expect(screen.getByText('Preview of the selected file.')).toBeInTheDocument()

    await user.upload(input, [])
    expect(screen.queryByText('Preview of the selected file.')).not.toBeInTheDocument()
  })
})
