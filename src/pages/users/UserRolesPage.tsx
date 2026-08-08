import { Link, useParams } from 'react-router-dom'

import { PageHeader, QueryBoundary, SubmitButton } from '@/components'
import { useMutationAction, useToggleSelection } from '@/hooks'
import {
  useReplaceUserRolesMutation,
  useRolesQuery,
  useUserQuery,
  useUserRolesQuery,
} from '@/repositories'
import { MAX_PER_PAGE } from '@/types'

/**
 * Role assignment (`role.assign`, admin and above).
 *
 * `PUT /users/{id}/roles` is a full replacement, so the form edits the whole
 * set and an empty selection revokes everything. Two server-side rules can
 * refuse the change — anti-escalation (403) and the last-role-manager
 * invariant (409) — and both are surfaced with the API's own wording.
 */
export function UserRolesPage() {
  const { userId } = useParams()
  const id = Number(userId)
  const skip = Number.isNaN(id)

  const { data: user, isLoading: loadingUser, error } = useUserQuery(id, { skip })
  const { data: assigned, isLoading: loadingAssigned } = useUserRolesQuery(id, { skip })
  // The catalog is small and never paginated in practice; ask for one full page.
  const { data: catalog, isLoading: loadingCatalog } = useRolesQuery({ perPage: MAX_PER_PAGE })

  const [replaceRoles, { isLoading: isSaving }] = useReplaceUserRolesMutation()
  const { run } = useMutationAction()

  const { selected, toggle, clear } = useToggleSelection((assigned ?? []).map((role) => role.name))

  const save = (): Promise<void> =>
    run(replaceRoles({ id, body: { roles: selected } }).unwrap(), {
      success:
        selected.length === 0
          ? 'All roles revoked — this account is now a base user.'
          : 'Roles updated.',
      // Anti-escalation answers 403 and the last-role-manager invariant 409;
      // both are surfaced with the API's own wording.
      failure: 'The roles could not be updated.',
    })

  return (
    <QueryBoundary isLoading={loadingUser || loadingAssigned || loadingCatalog} error={error}>
      {user !== undefined && (
        <>
          <PageHeader
            breadcrumbs={[
              { label: 'Users', to: '/users' },
              { label: `${user.first_name} ${user.last_name}`, to: `/users/${String(id)}` },
              { label: 'Roles' },
            ]}
            title="Roles"
            subtitle={`${user.first_name} ${user.last_name} — ${user.email}`}
            actions={
              <Link className="btn btn-sm btn-outline-secondary" to={`/users/${id}`}>
                Back to user
              </Link>
            }
          />

          <form
            className="appCard p-3"
            onSubmit={(event) => {
              event.preventDefault()
              void save()
            }}
          >
            <p className="text-secondary small">
              A role only ever adds abilities. With none selected the account keeps its base
              abilities: creating albums and managing its own albums, photos and profile.
            </p>

            <ul className="list-unstyled mb-4">
              {(catalog?.items ?? []).map((role) => (
                <li key={role.id} className="py-2 border-bottom">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`role-${role.id}`}
                      checked={selected.includes(role.name)}
                      onChange={() => {
                        toggle(role.name)
                      }}
                    />
                    <label className="form-check-label" htmlFor={`role-${role.id}`}>
                      <span className="fw-semibold">{role.name}</span>
                      {role.is_system && (
                        <span className="badge text-bg-light text-secondary ms-2">system</span>
                      )}
                      <span className="d-block small text-secondary">{role.description}</span>
                    </label>
                  </div>
                </li>
              ))}
            </ul>

            <div className="d-flex align-items-center gap-3">
              <SubmitButton isBusy={isSaving} label="Save roles" busyLabel="Saving…" />
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={isSaving || selected.length === 0}
                onClick={clear}
              >
                Clear all
              </button>
              <span className="small text-secondary">
                {selected.length === 0 ? 'No roles selected' : selected.join(', ')}
              </span>
            </div>
          </form>
        </>
      )}
    </QueryBoundary>
  )
}
