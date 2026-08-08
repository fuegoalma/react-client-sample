import { useState } from 'react'

import { ConfirmDialog } from '@/components/ui'
import { useMutationAction } from '@/hooks'
import { useDeleteAlbumMutation } from '@/repositories'
import type { AlbumDeleteMode } from '@/services'

interface AlbumDeleteDialogProps {
  /** The album being deleted, or `null` when the dialog is closed. */
  readonly album: { readonly id: number; readonly title: string } | null
  /** Which outcome the API will produce for this caller. */
  readonly mode: AlbumDeleteMode
  readonly onClose: () => void
  readonly onDeleted?: () => void
}

/**
 * `DELETE /albums/{id}` has one route and two outcomes, decided server-side by
 * the caller's permissions. Both are confirmed here so every album screen
 * explains the *actual* consequence — and only the soft delete, which is a
 * review action, asks for a reason.
 */
export function AlbumDeleteDialog({ album, ...rest }: AlbumDeleteDialogProps) {
  if (album === null) return null

  // Mounted only for an album, so the review reason starts empty every time.
  return <DeleteAlbumConfirmation album={album} {...rest} />
}

interface ConfirmationProps extends Omit<AlbumDeleteDialogProps, 'album'> {
  readonly album: NonNullable<AlbumDeleteDialogProps['album']>
}

function DeleteAlbumConfirmation({ album, mode, onClose, onDeleted }: ConfirmationProps) {
  const [deleteAlbum, { isLoading }] = useDeleteAlbumMutation()
  const { run } = useMutationAction()
  const [reason, setReason] = useState('')

  const confirm = async (): Promise<void> => {
    await run(
      deleteAlbum({
        id: album.id,
        ...(mode === 'soft' && reason.trim() !== '' && { reason: reason.trim() }),
      }).unwrap(),
      {
        success:
          mode === 'permanent'
            ? `“${album.title}” was permanently deleted.`
            : `“${album.title}” was flagged for review.`,
        failure: 'The album could not be deleted.',
        onDone: () => {
          setReason('')
          onClose()
          onDeleted?.()
        },
      },
    )
  }

  return (
    <ConfirmDialog
      open
      title={mode === 'permanent' ? 'Delete album permanently' : 'Flag album for review'}
      confirmLabel={mode === 'permanent' ? 'Delete permanently' : 'Flag album'}
      confirmVariant={mode === 'permanent' ? 'danger' : 'warning'}
      isBusy={isLoading}
      onConfirm={() => void confirm()}
      onCancel={() => {
        setReason('')
        onClose()
      }}
    >
      {mode === 'permanent' ? (
        <p className="mb-0">
          <strong>{album.title}</strong>, its photos and their files will be removed. This cannot be
          undone.
        </p>
      ) : (
        <>
          <p>
            <strong>{album.title}</strong> will be hidden from its owner pending an
            administrator&apos;s review, not removed. An administrator can restore it.
          </p>
          <label className="form-label" htmlFor="delete-reason">
            Reason <span className="text-secondary">(optional)</span>
          </label>
          <input
            id="delete-reason"
            className="form-control"
            maxLength={255}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
            }}
            placeholder="Reported for review"
          />
        </>
      )}
    </ConfirmDialog>
  )
}
