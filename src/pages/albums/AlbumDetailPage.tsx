import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { AlbumDeleteButton } from '@/components/albums/AlbumDeleteButton'
import { AlbumDeleteDialog } from '@/components/albums/AlbumDeleteDialog'
import { AlbumFormDialog } from '@/components/albums/AlbumFormDialog'
import { PhotoCard } from '@/components/photos/PhotoCard'
import { PhotoUploadDialog } from '@/components/photos/PhotoUploadDialog'
import {
  ConfirmDialog,
  FilterBar,
  PageHeader,
  PaginationBar,
  QueryBoundary,
  type Crumb,
} from '@/components'
import { photoListSpec } from '@/forms'
import { useListQuery, useMutationAction, usePermissions } from '@/hooks'
import { useAlbumPhotosQuery, useAlbumQuery, useDeletePhotoMutation } from '@/repositories'
import type { Photo } from '@/types'

/**
 * A single album with its photos.
 *
 * The album query returns the owner and an embedded photo list; the photos are
 * nevertheless loaded from the nested collection endpoint, because that is the
 * one that paginates — an album with a hundred photos should not render them
 * all at once.
 */
export function AlbumDetailPage() {
  const { albumId } = useParams()
  const id = Number(albumId)
  const navigate = useNavigate()

  const { data: album, error, isLoading } = useAlbumQuery(id, { skip: Number.isNaN(id) })

  const photoList = useListQuery(photoListSpec)
  const { data: photos, isLoading: loadingPhotos } = useAlbumPhotosQuery(
    { albumId: id, query: photoList.query },
    { skip: Number.isNaN(id) },
  )

  const { albums: policy, photos: photoPolicy, ownsAlbum } = usePermissions()
  const { run } = useMutationAction()
  const [deletePhoto, { isLoading: isDeletingPhoto }] = useDeletePhotoMutation()

  const [editing, setEditing] = useState(false)
  const [deletingAlbum, setDeletingAlbum] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingPhoto, setDeletingPhoto] = useState<Photo | null>(null)

  const isOwn = ownsAlbum(id)
  const deleteMode = policy.deleteMode(isOwn)
  const canUpdate = policy.canUpdate(isOwn)
  const canUploadPhoto = photoPolicy.canUpload(isOwn)
  const canEditPhoto = photoPolicy.canUpdate(isOwn)
  const canDeletePhoto = photoPolicy.canDelete(isOwn)

  /*
   * Where this album's parent list is, asked once and used everywhere it is
   * needed: the trail, the Back button beside it, and where a delete returns to.
   * Spelling "/albums" into any of them re-derives the rule the policy owns —
   * and got it wrong, sending a moderator viewing someone else's album to their
   * own list.
   */
  const albumsCrumb = policy.albumsCrumb(isOwn)
  const breadcrumbs: readonly Crumb[] = [albumsCrumb, { label: album?.title ?? '' }]

  const removePhoto = (photo: Photo): Promise<void> =>
    run(deletePhoto({ id: photo.id, albumId: id }).unwrap(), {
      success: `“${photo.title}” was deleted.`,
      failure: 'The photo could not be deleted.',
      onDone: () => {
        setDeletingPhoto(null)
      },
    })

  return (
    <>
      <QueryBoundary isLoading={isLoading} error={error}>
        {album !== undefined && (
          <>
            <PageHeader
              breadcrumbs={breadcrumbs}
              title={album.title}
              subtitle={
                <>
                  Owned by {album.first_name} {album.last_name}
                  {album.is_deleted && (
                    <span className="badge text-bg-warning ms-2">Flagged for review</span>
                  )}
                  {album.delete_reason !== null && (
                    <span className="ms-2">Reason: {album.delete_reason}</span>
                  )}
                </>
              }
              actions={
                <>
                  {/* No link when the caller has no list to go back to — one
                      that answers 403 is worse than none, the same rule the
                      trail applies to the crumb itself. */}
                  {albumsCrumb.to !== undefined && (
                    <Link className="btn btn-sm btn-outline-secondary" to={albumsCrumb.to}>
                      Back
                    </Link>
                  )}
                  {canUpdate && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        setEditing(true)
                      }}
                    >
                      Rename
                    </button>
                  )}
                  {canUploadPhoto && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        setUploading(true)
                      }}
                    >
                      <i className="bi bi-upload me-1" aria-hidden="true" />
                      Upload photo
                    </button>
                  )}
                  {deleteMode !== null && (
                    <AlbumDeleteButton
                      mode={deleteMode}
                      noun="album"
                      onClick={() => {
                        setDeletingAlbum(true)
                      }}
                    />
                  )}
                </>
              }
            />

            <FilterBar
              filters={photoList.filterDefinitions}
              values={photoList.filters}
              onApply={photoList.applyFilters}
              onReset={photoList.reset}
              isFiltered={photoList.isFiltered}
            />

            <QueryBoundary
              isLoading={loadingPhotos}
              isEmpty={photos?.items.length === 0}
              emptyMessage={
                photoList.isFiltered
                  ? 'No photos match this filter.'
                  : canUploadPhoto
                    ? 'No photos yet — upload the first one.'
                    : 'This album has no photos.'
              }
            >
              {photos !== undefined && (
                <>
                  <div className="photoGrid">
                    {photos.items.map((photo) => (
                      <PhotoCard
                        key={photo.id}
                        photo={photo}
                        albumId={id}
                        canEdit={canEditPhoto}
                        canDelete={canDeletePhoto}
                        onDelete={setDeletingPhoto}
                      />
                    ))}
                  </div>

                  {photos.pagination.last_page > 1 && (
                    <div className="appCard mt-3">
                      <PaginationBar
                        pagination={photos.pagination}
                        onPageChange={photoList.setPage}
                      />
                    </div>
                  )}
                </>
              )}
            </QueryBoundary>

            <AlbumFormDialog
              open={editing}
              album={album}
              onClose={() => {
                setEditing(false)
              }}
            />

            <PhotoUploadDialog
              open={uploading}
              albumId={id}
              onClose={() => {
                setUploading(false)
              }}
            />

            <AlbumDeleteDialog
              album={deletingAlbum ? album : null}
              mode={deleteMode ?? 'permanent'}
              onClose={() => {
                setDeletingAlbum(false)
              }}
              onDeleted={() => {
                // The album is gone, so this screen cannot stay — back to the
                // list the caller came from. "My albums" is the fallback rather
                // than a 403 risk: it needs no permission at all, so it is
                // reachable even by a caller who may not list anything else.
                void navigate(albumsCrumb.to ?? '/albums', { replace: true })
              }}
            />

            <ConfirmDialog
              open={deletingPhoto !== null}
              title="Delete photo"
              confirmLabel="Delete"
              isBusy={isDeletingPhoto}
              onConfirm={() => {
                if (deletingPhoto !== null) void removePhoto(deletingPhoto)
              }}
              onCancel={() => {
                setDeletingPhoto(null)
              }}
            >
              <p className="mb-0">
                <strong>{deletingPhoto?.title}</strong> and its stored file will be removed. This
                cannot be undone.
              </p>
            </ConfirmDialog>
          </>
        )}
      </QueryBoundary>
    </>
  )
}
