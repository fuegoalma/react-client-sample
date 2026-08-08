import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PhotoCard } from '@/components/photos/PhotoCard'
import type { Photo } from '@/types'

import { renderWithProviders } from '../../utils/renderWithProviders'

const photo: Photo = { id: 100, title: 'Beach sunset', url: 'http://api.test/a.webp' }

describe('PhotoCard', () => {
  it('shows the stored image and links to the photo under its album', () => {
    renderWithProviders(
      <PhotoCard photo={photo} albumId={10} canEdit canDelete onDelete={vi.fn()} />,
    )

    expect(screen.getByRole('img', { name: 'Beach sunset' })).toHaveAttribute(
      'src',
      'http://api.test/a.webp',
    )
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/albums/10/photos/100',
    )
  })

  it('falls back to a placeholder when the API returned no file', () => {
    renderWithProviders(
      <PhotoCard
        photo={{ ...photo, url: null }}
        albumId={10}
        canEdit
        canDelete
        onDelete={vi.fn()}
      />,
    )

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('offers only viewing to a caller who may not edit', () => {
    renderWithProviders(
      <PhotoCard photo={photo} albumId={10} canEdit={false} canDelete={false} onDelete={vi.fn()} />,
    )

    expect(screen.getByRole('link', { name: 'View' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('hands the photo back when deletion is asked for', async () => {
    const onDelete = vi.fn()
    const { user } = renderWithProviders(
      <PhotoCard photo={photo} albumId={10} canEdit canDelete onDelete={onDelete} />,
    )

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalledWith(photo)
  })
})
