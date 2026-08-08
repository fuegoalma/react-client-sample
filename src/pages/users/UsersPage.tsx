import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ConfirmDialog, ListScreen, PageHeader, type Column } from '@/components'
import { UserFormDialog } from '@/components/users/UserFormDialog'
import { userListSpec } from '@/forms'
import { useListQuery, useMutationAction, usePermissions } from '@/hooks'
import { useDeleteUserMutation, useUsersQuery } from '@/repositories'
import type { User } from '@/types'

/** All user accounts (`user.index.any`, moderator and above). */
export function UsersPage() {
  const list = useListQuery(userListSpec)
  const { data, error, isLoading, isFetching } = useUsersQuery(list.query)
  const { users: policy } = usePermissions()
  const { run } = useMutationAction()

  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation()
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<User | null>(null)

  const canCreate = policy.canCreate()
  const canAssignRoles = policy.canAssignRoles()

  const remove = (user: User): Promise<void> =>
    run(deleteUser(user.id).unwrap(), {
      success: `${user.first_name} ${user.last_name} was deleted.`,
      // A 409 here means the last-role-manager invariant refused the delete;
      // the API's own wording explains it best, and `run` surfaces it.
      failure: 'The user could not be deleted.',
      onDone: () => {
        setDeleting(null)
      },
    })

  const columns: readonly Column<User>[] = [
    {
      key: 'id',
      header: 'ID',
      sortAttribute: 'id',
      className: 'text-secondary',
      render: (user) => user.id,
    },
    {
      key: 'name',
      header: 'Name',
      sortAttribute: 'last_name',
      render: (user) => (
        <Link to={`/users/${user.id}`}>
          {user.first_name} {user.last_name}
          {policy.isSelf(user.id) && <span className="badge text-bg-light ms-2">You</span>}
        </Link>
      ),
    },
    { key: 'email', header: 'Email', sortAttribute: 'email', render: (user) => user.email },
    {
      key: 'actions',
      header: <span className="visually-hidden">Actions</span>,
      className: 'text-end',
      render: (user) => (
        <div className="dataTable__actions">
          <Link className="btn btn-sm btn-outline-secondary" to={`/users/${user.id}`}>
            Open
          </Link>
          {canAssignRoles && (
            <Link className="btn btn-sm btn-outline-secondary" to={`/users/${user.id}/roles`}>
              Roles
            </Link>
          )}
          {policy.canDelete(user.id) && (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => {
                setDeleting(user)
              }}
            >
              Delete
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Every account in the system."
        actions={
          canCreate && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => {
                setCreating(true)
              }}
            >
              <i className="bi bi-person-plus me-1" aria-hidden="true" />
              New user
            </button>
          )
        }
      />

      <ListScreen
        list={list}
        result={{ data, error, isLoading, isFetching }}
        columns={columns}
        rowKey={(user) => user.id}
        caption="Users"
        emptyMessage="No users found."
        filteredEmptyMessage="No users match this filter."
      />

      <UserFormDialog
        open={creating}
        onClose={() => {
          setCreating(false)
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete user"
        confirmLabel="Delete"
        isBusy={isDeleting}
        onConfirm={() => {
          if (deleting !== null) void remove(deleting)
        }}
        onCancel={() => {
          setDeleting(null)
        }}
      >
        <p className="mb-0">
          <strong>
            {deleting?.first_name} {deleting?.last_name}
          </strong>{' '}
          will be deleted along with their albums, photos and files. This cannot be undone.
        </p>
      </ConfirmDialog>
    </>
  )
}
