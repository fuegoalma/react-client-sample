import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ConfirmDialog, ListScreen, PageHeader, type Column } from '@/components'
import { roleListSpec } from '@/forms'
import { useListQuery, useMutationAction, usePermissions } from '@/hooks'
import { useDeleteRoleMutation, useRolesQuery } from '@/repositories'
import type { Role } from '@/types'

/**
 * The role catalog. Listing needs `role.index` (admin+), but composing,
 * inspecting and deleting a role need `role.manage`/`role.view` — so an admin
 * sees the list and a super admin sees the controls.
 */
export function RolesPage() {
  const list = useListQuery(roleListSpec)
  const { data, error, isLoading, isFetching } = useRolesQuery(list.query)
  const { roles: policy } = usePermissions()
  const { run } = useMutationAction()

  const [deleteRole, { isLoading: isDeleting }] = useDeleteRoleMutation()
  const [deleting, setDeleting] = useState<Role | null>(null)

  const canManage = policy.canRecompose()
  const canView = policy.canView()

  const remove = (role: Role): Promise<void> =>
    run(deleteRole(role.id).unwrap(), {
      success: `Role “${role.name}” was deleted.`,
      // 409 when the role is a system role, or when deleting it would leave
      // nobody able to manage roles.
      failure: 'The role could not be deleted.',
      onDone: () => {
        setDeleting(null)
      },
    })

  const columns: readonly Column<Role>[] = [
    {
      key: 'name',
      header: 'Name',
      sortAttribute: 'name',
      render: (role) =>
        canView ? (
          <Link to={`/roles/${role.id}`}>{role.name}</Link>
        ) : (
          <span className="fw-semibold">{role.name}</span>
        ),
    },
    {
      key: 'description',
      header: 'Description',
      className: 'text-secondary',
      render: (role) => role.description,
    },
    {
      key: 'system',
      header: 'Type',
      render: (role) =>
        role.is_system ? (
          <span className="badge text-bg-light text-secondary">system</span>
        ) : (
          <span className="badge text-bg-info">custom</span>
        ),
    },
    {
      key: 'actions',
      header: <span className="visually-hidden">Actions</span>,
      className: 'text-end',
      render: (role) => (
        <div className="dataTable__actions">
          {canView && (
            <Link className="btn btn-sm btn-outline-secondary" to={`/roles/${role.id}`}>
              {canManage ? 'Edit' : 'View'}
            </Link>
          )}
          {policy.canDelete(role) && (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => {
                setDeleting(role)
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
        title="Roles"
        subtitle="A role is a named set of permissions. Effective access is the union of a user's roles."
        actions={
          canManage && (
            <Link className="btn btn-sm btn-primary" to="/roles/new">
              <i className="bi bi-plus-lg me-1" aria-hidden="true" />
              Compose role
            </Link>
          )
        }
      />

      <ListScreen
        list={list}
        result={{ data, error, isLoading, isFetching }}
        columns={columns}
        rowKey={(role) => role.id}
        caption="Roles"
        emptyMessage="No roles defined."
        filteredEmptyMessage="No roles match this filter."
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete role"
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
          <strong>{deleting?.name}</strong> will be deleted and revoked from every user holding it.
        </p>
      </ConfirmDialog>
    </>
  )
}
