import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { PhotoDeleteDialog } from '@/components/photos/PhotoDeleteDialog'
import { PhotoFrame } from '@/components/photos/PhotoFrame'
import {
  FormAlert,
  FormField,
  PageHeader,
  QueryBoundary,
  SubmitButton,
  fieldClass,
  type Crumb,
} from '@/components'
import { photoUpdateSchema, type PhotoUpdateValues } from '@/forms'
import { useApiForm, useNotifications, usePermissions } from '@/hooks'
import { useAlbumQuery, usePhotoQuery, useUpdatePhotoMutation } from '@/repositories'

/**
 * A single photo.
 *
 * The route is nested under its album (`/albums/:albumId/photos/:photoId`)
 * even though the API's member endpoints are flat, because `GET /photos/{id}`
 * returns no album reference — and without it the client cannot tell whether
 * the caller owns the photo, which is what its base abilities depend on.
 */
export function PhotoDetailPage() {
  const { albumId, photoId } = useParams()
  const album = Number(albumId)
  const id = Number(photoId)
  const navigate = useNavigate()

  const { data: photo, error, isLoading } = usePhotoQuery(id, { skip: Number.isNaN(id) })
  // For the trail only, and served from the cache: the album page is the only
  // route to this screen.
  const { data: parentAlbum } = useAlbumQuery(album, { skip: Number.isNaN(album) })
  const [updatePhoto, { isLoading: isSaving }] = useUpdatePhotoMutation()
  const { photos: policy, albums: albumPolicy, ownsAlbum } = usePermissions()
  const { reportSuccess } = useNotifications()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const isOwn = ownsAlbum(album)
  const canEdit = policy.canUpdate(isOwn)
  const canDelete = policy.canDelete(isOwn)

  const {
    register,
    handleSubmit,
    applyApiError,
    formState: { errors },
  } = useApiForm(
    photoUpdateSchema,
    { title: '' },
    // Adopted as soon as the photo loads. Resetting from an effect instead
    // would land *after* the field is on screen, and could overwrite a title
    // the user had already started typing.
    photo === undefined ? undefined : { title: photo.title },
  )

  const breadcrumbs: readonly Crumb[] = [
    // The same rule as the album screen's own trail, asked of the same policy.
    albumPolicy.albumsCrumb(isOwn),
    { label: parentAlbum?.title ?? 'Album', to: `/albums/${String(album)}` },
    { label: photo?.title ?? '' },
  ]

  const onSubmit = async (values: PhotoUpdateValues): Promise<void> => {
    try {
      await updatePhoto({ id, albumId: album, body: values }).unwrap()
      reportSuccess('Photo updated.')
    } catch (unknownError) {
      applyApiError(unknownError)
    }
  }

  return (
    <QueryBoundary isLoading={isLoading} error={error}>
      {photo !== undefined && (
        <>
          <PageHeader
            breadcrumbs={breadcrumbs}
            title={photo.title}
            subtitle="Only the title can change — the album and the stored file are immutable."
            actions={
              <>
                <Link className="btn btn-sm btn-outline-secondary" to={`/albums/${album}`}>
                  Back to album
                </Link>
                {canDelete && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => {
                      setConfirmingDelete(true)
                    }}
                  >
                    Delete
                  </button>
                )}
              </>
            }
          />

          <div className="row g-4">
            <div className="col-md-6">
              <div className="photoCard">
                <PhotoFrame photo={photo} />
              </div>
            </div>

            <div className="col-md-6">
              <div className="appCard p-3">
                <h2 className="h6">Details</h2>
                <dl className="row small mb-3">
                  <dt className="col-4 text-secondary">ID</dt>
                  <dd className="col-8">{photo.id}</dd>
                  {/* The API stores a converted, resized WebP — there is no
                      original to link to, only this file at full size. */}
                  <dt className="col-4 text-secondary">File</dt>
                  <dd className="col-8 text-break">
                    {photo.url === null ? (
                      '—'
                    ) : (
                      <a href={photo.url} target="_blank" rel="noreferrer">
                        Open in new tab
                      </a>
                    )}
                  </dd>
                </dl>

                {canEdit ? (
                  <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
                    <FormAlert error={errors.root} />
                    <FormField id="photo-title" label="Title" error={errors.title}>
                      <input
                        id="photo-title"
                        className={fieldClass(errors.title)}
                        maxLength={255}
                        {...register('title')}
                      />
                    </FormField>
                    <SubmitButton isBusy={isSaving} label="Save title" busyLabel="Saving…" />
                  </form>
                ) : (
                  <p className="text-secondary small mb-0">
                    You do not have permission to edit this photo.
                  </p>
                )}
              </div>
            </div>
          </div>

          <PhotoDeleteDialog
            photo={confirmingDelete ? photo : null}
            albumId={album}
            onClose={() => {
              setConfirmingDelete(false)
            }}
            onDeleted={() => {
              // The photo is gone, so its own screen cannot stay on display.
              void navigate(`/albums/${album}`, { replace: true })
            }}
          />
        </>
      )}
    </QueryBoundary>
  )
}
