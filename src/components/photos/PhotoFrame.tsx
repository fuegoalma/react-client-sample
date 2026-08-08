import type { Photo } from '@/types'

interface PhotoFrameProps {
  readonly photo: Photo
  /** Tiles below the fold defer their fetch; a detail view's image does not. */
  readonly lazy?: boolean
}

/**
 * A photo's image, or a placeholder standing in for one.
 *
 * The API converts every upload to a WebP scaled to fit 500×500, so there is
 * only ever one file to show — but `url` is nullable, and both the tile and the
 * detail screen have to answer that the same way.
 */
export function PhotoFrame({ photo, lazy = false }: PhotoFrameProps) {
  return (
    <div className="photoCard__frame">
      {photo.url === null ? (
        <i className="photoCard__placeholder bi bi-image" aria-hidden="true" />
      ) : (
        <img
          className="photoCard__image"
          src={photo.url}
          alt={photo.title}
          {...(lazy && { loading: 'lazy' as const })}
        />
      )}
    </div>
  )
}
