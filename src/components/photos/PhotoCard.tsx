import { Link } from 'react-router-dom'

import type { Photo } from '@/types'

import { PhotoFrame } from './PhotoFrame'

interface PhotoCardProps {
  readonly photo: Photo
  readonly albumId: number
  readonly canEdit: boolean
  readonly canDelete: boolean
  readonly onDelete: (photo: Photo) => void
}

/**
 * A photo tile. Uploads are stored as WebP scaled to fit 500×500, so the tile
 * never needs a larger source than the API returns.
 */
export function PhotoCard({ photo, albumId, canEdit, canDelete, onDelete }: PhotoCardProps) {
  return (
    <figure className="photoCard mb-0">
      <PhotoFrame photo={photo} lazy />

      <figcaption className="photoCard__body">
        <h3 className="photoCard__title">{photo.title}</h3>

        <div className="photoCard__actions">
          <Link
            className="btn btn-sm btn-outline-secondary"
            to={`/albums/${albumId}/photos/${photo.id}`}
          >
            {canEdit ? 'Edit' : 'View'}
          </Link>
          {canDelete && (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => {
                onDelete(photo)
              }}
            >
              Delete
            </button>
          )}
        </div>
      </figcaption>
    </figure>
  )
}
