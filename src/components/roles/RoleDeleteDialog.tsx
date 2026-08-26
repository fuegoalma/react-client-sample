import { ConfirmDialog } from '@/components/ui'
import { useMutationAction } from '@/hooks'
import { useDeleteRoleMutation } from '@/repositories'

interface RoleDeleteDialogProps {
  /** The role being deleted, or `null` when the dialog is closed. */
  readonly role: { readonly id: number; readonly name: string } | null
  readonly onClose: () => void
}

/**
 * `DELETE /roles/{id}`, confirmed the way every other delete in this client is.
 *
 * Whether the role may be deleted at all is `RolePolicy`'s answer, asked before
 * the button is offered; what is left here is the confirmation and the request.
 */
export function RoleDeleteDialog({ role, onClose }: RoleDeleteDialogProps) {
  if (role === null) return null

  // Mounted only for a role, so nothing survives from the last one confirmed.
  return <DeleteRoleConfirmation role={role} onClose={onClose} />
}

interface ConfirmationProps extends Omit<RoleDeleteDialogProps, 'role'> {
  readonly role: NonNullable<RoleDeleteDialogProps['role']>
}

function DeleteRoleConfirmation({ role, onClose }: ConfirmationProps) {
  const [deleteRole, { isLoading }] = useDeleteRoleMutation()
  const { run } = useMutationAction()

  const confirm = (): Promise<void> =>
    run(deleteRole(role.id).unwrap(), {
      success: `Role “${role.name}” was deleted.`,
      // 409 when the role is a system role, or when deleting it would leave
      // nobody able to manage roles.
      failure: 'The role could not be deleted.',
      onDone: onClose,
    })

  return (
    <ConfirmDialog
      open
      title="Delete role"
      confirmLabel="Delete"
      isBusy={isLoading}
      onConfirm={() => void confirm()}
      onCancel={onClose}
    >
      <p className="mb-0">
        <strong>{role.name}</strong> will be deleted and revoked from every user holding it.
      </p>
    </ConfirmDialog>
  )
}
