import type { AlbumDeleteMode } from '@/services'

interface AlbumDeleteButtonProps {
  /** Which outcome the API will produce for this caller, from `AlbumPolicy`. */
  readonly mode: AlbumDeleteMode
  /** Appended to the verb where the screen needs to name the subject. */
  readonly noun?: string
  readonly onClick: () => void
}

/**
 * The control for `DELETE /albums/{id}`, which has one route and two outcomes.
 *
 * Which outcome a caller gets is `AlbumPolicy`'s answer; what that outcome
 * should *look* and *read* like is this component's, so a permanent delete is
 * never dressed as a review flag on one screen and not another.
 */
export function AlbumDeleteButton({ mode, noun, onClick }: AlbumDeleteButtonProps) {
  const permanent = mode === 'permanent'
  const verb = permanent ? 'Delete' : 'Flag'

  return (
    <button
      type="button"
      className={`btn btn-sm ${permanent ? 'btn-outline-danger' : 'btn-outline-warning'}`}
      onClick={onClick}
    >
      {noun === undefined ? verb : `${verb} ${noun}`}
    </button>
  )
}
