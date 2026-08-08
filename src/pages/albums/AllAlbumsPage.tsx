import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { AlbumDeleteButton } from '@/components/albums/AlbumDeleteButton'
import { AlbumDeleteDialog } from '@/components/albums/AlbumDeleteDialog'
import { ListScreen, PageHeader, type Column } from '@/components'
import { albumListSpec, ALBUM_DELETION_FILTER, withFilter } from '@/forms'
import { useListQuery, useMutationAction, usePermissions } from '@/hooks'
import { useAlbumsQuery, useRestoreAlbumMutation } from '@/repositories'
import type { AlbumDeleteMode } from '@/services'
import type { Album } from '@/types'

/**
 * Every album in the system (`album.index.any`).
 *
 * One screen for both audiences: what a caller may do here is decided by
 * `AlbumPolicy`, not by a separate route. A moderator flags albums for review;
 * an admin additionally sees the deletion state, deletes permanently, and
 * restores.
 */
export function AllAlbumsPage() {
  const { albums: policy, ownsAlbum } = usePermissions()
  const showsDeletionState = policy.showsDeletionState()

  // The deletion-state filter is only useful to a caller who can act on a
  // flagged album, so the spec is composed rather than fixed.
  const spec = useMemo(
    () => (showsDeletionState ? withFilter(albumListSpec, ALBUM_DELETION_FILTER) : albumListSpec),
    [showsDeletionState],
  )

  const list = useListQuery(spec)
  const { data, error, isLoading, isFetching } = useAlbumsQuery(list.query)

  const [restoreAlbum, { isLoading: isRestoring }] = useRestoreAlbumMutation()
  const { run } = useMutationAction()
  // The mode is settled when the button is offered; re-deriving it at render
  // time would need a fallback for an answer that cannot happen.
  const [deleting, setDeleting] = useState<{ album: Album; mode: AlbumDeleteMode } | null>(null)

  const restore = (album: Album): Promise<void> =>
    run(restoreAlbum(album.id).unwrap(), {
      success: `“${album.title}” was restored.`,
      failure: 'The album could not be restored.',
    })

  const columns: readonly Column<Album>[] = [
    {
      key: 'title',
      header: 'Title',
      sortAttribute: 'title',
      render: (album) => <Link to={`/albums/${album.id}`}>{album.title}</Link>,
    },
    {
      key: 'id',
      header: 'ID',
      sortAttribute: 'id',
      className: 'text-secondary',
      render: (album) => album.id,
    },
    ...(showsDeletionState
      ? ([
          {
            key: 'state',
            header: 'State',
            render: (album) =>
              album.is_deleted ? (
                <span className="badge text-bg-warning">Flagged</span>
              ) : (
                <span className="badge text-bg-light text-secondary">Live</span>
              ),
          },
          {
            key: 'reason',
            header: 'Delete reason',
            className: 'text-secondary small',
            render: (album) => album.delete_reason ?? '—',
          },
        ] satisfies Column<Album>[])
      : []),
    {
      key: 'actions',
      header: <span className="visually-hidden">Actions</span>,
      className: 'text-end',
      render: (album) => {
        const mode = policy.deleteMode(ownsAlbum(album.id))

        return (
          <div className="dataTable__actions">
            <Link className="btn btn-sm btn-outline-secondary" to={`/albums/${album.id}`}>
              Open
            </Link>

            {album.is_deleted && policy.canRestore() && (
              <button
                type="button"
                className="btn btn-sm btn-outline-success"
                disabled={isRestoring}
                onClick={() => void restore(album)}
              >
                Restore
              </button>
            )}

            {mode !== null && (
              <AlbumDeleteButton
                mode={mode}
                onClick={() => {
                  setDeleting({ album, mode })
                }}
              />
            )}
          </div>
        )
      },
    },
  ]

  return (
    <>
      <PageHeader
        title="All albums"
        subtitle={
          showsDeletionState
            ? 'Every album in the system, including those flagged for review.'
            : 'Every album in the system. Deleting flags an album for an administrator to review.'
        }
      />

      <ListScreen
        list={list}
        result={{ data, error, isLoading, isFetching }}
        columns={columns}
        rowKey={(album) => album.id}
        caption="All albums"
        emptyMessage="There are no albums yet."
        filteredEmptyMessage="No albums match this filter."
      />

      <AlbumDeleteDialog
        album={deleting?.album ?? null}
        mode={deleting?.mode ?? 'permanent'}
        onClose={() => {
          setDeleting(null)
        }}
      />
    </>
  )
}
