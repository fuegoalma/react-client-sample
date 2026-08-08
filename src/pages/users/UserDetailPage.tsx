import { Link, useParams } from 'react-router-dom'

import { PageHeader, QueryBoundary } from '@/components'
import { UserUpdateForm } from '@/components/users/UserUpdateForm'
import { usePermissions } from '@/hooks'
import { useUserQuery } from '@/repositories'

/**
 * A single account with its albums (`user.view.any` — ownership does not grant
 * it, so this screen is moderator and above even for your own profile; your own
 * account lives at /profile instead).
 */
export function UserDetailPage() {
  const { userId } = useParams()
  const id = Number(userId)

  const { data: user, error, isLoading } = useUserQuery(id, { skip: Number.isNaN(id) })
  const { users: policy } = usePermissions()

  const canUpdate = policy.canUpdate(id)
  const canAssignRoles = policy.canAssignRoles()

  return (
    <QueryBoundary isLoading={isLoading} error={error}>
      {user !== undefined && (
        <>
          <PageHeader
            breadcrumbs={[
              { label: 'Users', to: '/users' },
              { label: `${user.first_name} ${user.last_name}` },
            ]}
            title={`${user.first_name} ${user.last_name}`}
            subtitle={user.email}
            actions={
              <>
                <Link className="btn btn-sm btn-outline-secondary" to="/users">
                  Back
                </Link>
                {canAssignRoles && (
                  <Link className="btn btn-sm btn-outline-primary" to={`/users/${id}/roles`}>
                    Manage roles
                  </Link>
                )}
              </>
            }
          />

          <div className="row g-4">
            <div className="col-lg-6">
              <section className="appCard p-3">
                <h2 className="h6">Albums ({user.albums.length})</h2>
                {user.albums.length === 0 ? (
                  <p className="text-secondary small mb-0">This user has no albums.</p>
                ) : (
                  <ul className="list-unstyled mb-0">
                    {user.albums.map((album) => (
                      <li key={album.id} className="py-1 border-bottom">
                        <Link to={`/albums/${album.id}`}>{album.title}</Link>
                        {album.is_deleted && (
                          <span className="badge text-bg-warning ms-2">Flagged</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="col-lg-6">
              <section className="appCard p-3">
                <h2 className="h6">Update account</h2>

                {canUpdate ? (
                  <>
                    <p className="text-secondary small">
                      Leave a field blank to keep its current value.
                    </p>
                    <UserUpdateForm
                      userId={id}
                      idPrefix="user"
                      placeholders={user}
                      successMessage="User updated."
                    />
                  </>
                ) : (
                  <p className="text-secondary small mb-0">
                    You do not have permission to edit this account.
                  </p>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </QueryBoundary>
  )
}
