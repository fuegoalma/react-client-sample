import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ListScreen, PageHeader, type Column } from '@/components'
import { UserDeleteDialog } from '@/components/users/UserDeleteDialog'
import { UserFormDialog } from '@/components/users/UserFormDialog'
import { paths } from '@/app/paths'
import { userListSpec } from '@/forms'
import { useListQuery, usePermissions } from '@/hooks'
import { useUsersQuery, usePrefetchUser } from '@/repositories'
import { DateTime } from '@/services'
import type { User } from '@/types'

/** All user accounts (`user.index.any`, moderator and above). */
export function UsersPage() {
  const list = useListQuery(userListSpec)
  const prefetchUser = usePrefetchUser()
  const { data, error, isLoading, isFetching } = useUsersQuery(list.query)
  const { users: policy } = usePermissions()

  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<User | null>(null)

  const canCreate = policy.canCreate()
  const canAssignRoles = policy.canAssignRoles()

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
        <Link to={paths.user(user.id)}>
          {user.first_name} {user.last_name}
          {policy.isSelf(user.id) && <span className="badge text-bg-light ms-2">You</span>}
        </Link>
      ),
    },
    { key: 'email', header: 'Email', sortAttribute: 'email', render: (user) => user.email },
    {
      key: 'created_at',
      header: 'Created',
      sortAttribute: 'created_at',
      className: 'text-secondary',
      render: (user) => DateTime.toDate(user.created_at),
    },
    {
      key: 'actions',
      header: <span className="visually-hidden">Actions</span>,
      className: 'text-end',
      render: (user) => (
        <div className="dataTable__actions">
          <Link className="btn btn-sm btn-outline-secondary" to={paths.user(user.id)}>
            Open
          </Link>
          {canAssignRoles && (
            <Link className="btn btn-sm btn-outline-secondary" to={paths.userRoles(user.id)}>
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
        // The row links straight to the account; fetching it as the pointer
        // arrives means the detail screen usually has it before the click.
        onRowFocus={(user) => {
          prefetchUser(user.id)
        }}
      />

      <UserFormDialog
        open={creating}
        onClose={() => {
          setCreating(false)
        }}
      />

      <UserDeleteDialog
        user={deleting}
        onClose={() => {
          setDeleting(null)
        }}
      />
    </>
  )
}
