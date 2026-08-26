import { ConfirmDialog } from '@/components/ui'
import { useMutationAction } from '@/hooks'
import { useDeleteUserMutation } from '@/repositories'

interface UserDeleteDialogProps {
  /** The account being deleted, or `null` when the dialog is closed. */
  readonly user: {
    readonly id: number
    readonly first_name: string
    readonly last_name: string
  } | null
  readonly onClose: () => void
}

/**
 * `DELETE /users/{id}`, confirmed the way every other delete in this client is.
 *
 * Albums and photos have had a dialog of their own since they were written; the
 * accounts list spelled the same sequence — the pending record, the mutation,
 * the reporting and the confirmation copy — out inside the page instead. One
 * shape, one implementation.
 */
export function UserDeleteDialog({ user, onClose }: UserDeleteDialogProps) {
  if (user === null) return null

  // Mounted only for an account, so nothing survives from the last one confirmed.
  return <DeleteUserConfirmation user={user} onClose={onClose} />
}

interface ConfirmationProps extends Omit<UserDeleteDialogProps, 'user'> {
  readonly user: NonNullable<UserDeleteDialogProps['user']>
}

function DeleteUserConfirmation({ user, onClose }: ConfirmationProps) {
  const [deleteUser, { isLoading }] = useDeleteUserMutation()
  const { run } = useMutationAction()

  const name = `${user.first_name} ${user.last_name}`

  const confirm = (): Promise<void> =>
    run(deleteUser(user.id).unwrap(), {
      success: `${name} was deleted.`,
      // A 409 here means the last-role-manager invariant refused the delete;
      // the API's own wording explains it best, and `run` surfaces it.
      failure: 'The user could not be deleted.',
      onDone: onClose,
    })

  return (
    <ConfirmDialog
      open
      title="Delete user"
      confirmLabel="Delete"
      isBusy={isLoading}
      onConfirm={() => void confirm()}
      onCancel={onClose}
    >
      <p className="mb-0">
        <strong>{name}</strong> will be deleted along with their albums, photos and files. This
        cannot be undone.
      </p>
    </ConfirmDialog>
  )
}
