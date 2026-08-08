import { PageHeader, QueryBoundary } from '@/components'
import { UserUpdateForm } from '@/components/users/UserUpdateForm'
import { useAuth } from '@/hooks'
import { useMeQuery, useMyPermissionsQuery } from '@/repositories'

/**
 * The caller's own account — the two never-gated endpoints (`/users/me` and
 * `/users/me/permissions`), a partial self-update, and the session controls.
 */
export function ProfilePage() {
  const { data: me, error: meError, isLoading } = useMeQuery()
  const { data: mine } = useMyPermissionsQuery()
  const { signOut } = useAuth()

  return (
    <>
      <PageHeader title="Profile" subtitle="Your account, roles and sessions." />

      <QueryBoundary isLoading={isLoading} error={meError}>
        {me !== undefined && (
          <div className="row g-4">
            <div className="col-lg-7">
              <section className="appCard p-3">
                <h2 className="h6">Account details</h2>
                <dl className="row mb-4 small">
                  <dt className="col-sm-4 text-secondary">Name</dt>
                  <dd className="col-sm-8">
                    {me.first_name} {me.last_name}
                  </dd>
                  <dt className="col-sm-4 text-secondary">Email</dt>
                  <dd className="col-sm-8">{me.email}</dd>
                  <dt className="col-sm-4 text-secondary">Albums</dt>
                  <dd className="col-sm-8">{me.albums.length}</dd>
                </dl>

                <h2 className="h6">Update details</h2>
                <p className="text-secondary small">
                  Leave a field blank to keep its current value.
                </p>

                <UserUpdateForm
                  userId={me.id}
                  idPrefix="profile"
                  placeholders={me}
                  successMessage="Your profile has been updated."
                />
              </section>
            </div>

            <div className="col-lg-5">
              <section className="appCard p-3 mb-4">
                <h2 className="h6">Roles and permissions</h2>
                {me.roles.length === 0 ? (
                  <p className="text-secondary small mb-2">
                    No roles — a base user. You can manage your own albums and photos.
                  </p>
                ) : (
                  <p className="mb-2">
                    {me.roles.map((role) => (
                      <span key={role} className="badge text-bg-primary me-1">
                        {role}
                      </span>
                    ))}
                  </p>
                )}

                <details>
                  <summary className="small text-secondary">
                    Effective permissions ({mine?.permissions.length ?? 0})
                  </summary>
                  <ul className="small mt-2 mb-0">
                    {(mine?.permissions ?? []).map((permission) => (
                      <li key={permission}>
                        <code>{permission}</code>
                      </li>
                    ))}
                  </ul>
                </details>
              </section>

              <section className="appCard p-3">
                <h2 className="h6">Sessions</h2>
                <p className="text-secondary small">
                  Signing out revokes this device&apos;s refresh token. Signing out everywhere
                  revokes every session of your account.
                </p>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => void signOut()}
                  >
                    Sign out
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => void signOut(true)}
                  >
                    Sign out everywhere
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}
      </QueryBoundary>
    </>
  )
}
