import { ConfirmDialog } from '@/components/ui'
import { useMutationAction } from '@/hooks'
import { useDeletePhotoMutation } from '@/repositories'

interface PhotoDeleteDialogProps {
  /** The photo being deleted, or `null` when the dialog is closed. */
  readonly photo: { readonly id: number; readonly title: string } | null
  /** The album the photo hangs in — the mutation needs it to patch the grid. */
  readonly albumId: number
  readonly onClose: () => void
  /** Runs after a successful delete: the photo's own screen has to leave it. */
  readonly onDeleted?: () => void
}

/**
 * `DELETE /photos/{id}`, confirmed the same way wherever it is offered.
 *
 * The album screen and the photo screen both delete a photo, and both spelled
 * out the same confirmation, the same mutation and the same reporting — the
 * album's equivalent had been a component since it was written, and this is its
 * counterpart.
 */
export function PhotoDeleteDialog({ photo, ...rest }: PhotoDeleteDialogProps) {
  if (photo === null) return null

  // Mounted only for a photo, so nothing survives from the last one confirmed.
  return <DeletePhotoConfirmation photo={photo} {...rest} />
}

interface ConfirmationProps extends Omit<PhotoDeleteDialogProps, 'photo'> {
  readonly photo: NonNullable<PhotoDeleteDialogProps['photo']>
}

function DeletePhotoConfirmation({ photo, albumId, onClose, onDeleted }: ConfirmationProps) {
  const [deletePhoto, { isLoading }] = useDeletePhotoMutation()
  const { run } = useMutationAction()

  const confirm = (): Promise<void> =>
    run(deletePhoto({ id: photo.id, albumId }).unwrap(), {
      success: `“${photo.title}” was deleted.`,
      failure: 'The photo could not be deleted.',
      onDone: () => {
        onClose()
        onDeleted?.()
      },
    })

  return (
    <ConfirmDialog
      open
      title="Delete photo"
      confirmLabel="Delete"
      isBusy={isLoading}
      onConfirm={() => void confirm()}
      onCancel={onClose}
    >
      <p className="mb-0">
        <strong>{photo.title}</strong> and its stored file will be removed. This cannot be undone.
      </p>
    </ConfirmDialog>
  )
}
