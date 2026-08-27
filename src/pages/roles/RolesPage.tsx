import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ListScreen, PageHeader, type Column } from '@/components'
import { RoleDeleteDialog } from '@/components/roles/RoleDeleteDialog'
import { paths } from '@/app/paths'
import { roleListSpec } from '@/forms'
import { useListQuery, usePermissions } from '@/hooks'
import { useRolesQuery } from '@/repositories'
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

  const [deleting, setDeleting] = useState<Role | null>(null)

  const canManage = policy.canRecompose()
  const canView = policy.canView()

  const columns: readonly Column<Role>[] = [
    {
      key: 'name',
      header: 'Name',
      sortAttribute: 'name',
      render: (role) =>
        canView ? (
          <Link to={paths.role(role.id)}>{role.name}</Link>
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
            <Link className="btn btn-sm btn-outline-secondary" to={paths.role(role.id)}>
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
            <Link className="btn btn-sm btn-primary" to={paths.newRole}>
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

      <RoleDeleteDialog
        role={deleting}
        onClose={() => {
          setDeleting(null)
        }}
      />
    </>
  )
}
