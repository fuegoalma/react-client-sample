import { useCallback } from 'react'

import { PageHeader, QueryBoundary } from '@/components'
import { ChangePasswordCard } from '@/components/users/ChangePasswordCard'
import { EmailVerificationBadge } from '@/components/users/EmailVerificationBadge'
import { UserUpdateForm } from '@/components/users/UserUpdateForm'
import { useAuth, useMutationAction } from '@/hooks'
import { useMeQuery, useMyPermissionsQuery, useResendVerificationMutation } from '@/repositories'

/**
 * The caller's own account — the two never-gated endpoints (`/users/me` and
 * `/users/me/permissions`), a partial self-update, and the session controls.
 */
export function ProfilePage() {
  const { data: me, error: meError, isLoading } = useMeQuery()
  const { data: mine } = useMyPermissionsQuery()
  const { signOut } = useAuth()
  const [resendVerification] = useResendVerificationMutation()
  const { run } = useMutationAction()

  // 204 whether or not anything was sent — the endpoint is a no-op once the
  // address is confirmed — so the wording must not claim a message went out.
  const resendConfirmation = useCallback(
    () =>
      run(resendVerification().unwrap(), {
        success: 'If your address is unconfirmed, a new token is on its way.',
        failure: 'Could not request a new confirmation.',
      }),
    [run, resendVerification],
  )

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
                  <dd className="col-sm-8">
                    {me.email} <EmailVerificationBadge verified={me.email_verified} />
                  </dd>
                  <dt className="col-sm-4 text-secondary">Albums</dt>
                  <dd className="col-sm-8">{me.albums.length}</dd>
                </dl>

                {!me.email_verified && (
                  <p className="small">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => void resendConfirmation()}
                    >
                      Resend confirmation
                    </button>{' '}
                    <span className="text-secondary">
                      Your account works either way — confirming just proves the address is yours.
                    </span>
                  </p>
                )}

                <h2 className="h6">Update details</h2>
                <p className="text-secondary small">
                  Leave a field blank to keep its current value.
                </p>

                {/* The password is not here: it has its own form, which asks
                    for the current one first. */}
                <UserUpdateForm
                  userId={me.id}
                  idPrefix="profile"
                  placeholders={me}
                  successMessage="Your profile has been updated."
                  canChangePassword={false}
                />
              </section>
            </div>

            <div className="col-lg-5">
              <ChangePasswordCard />

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
