import { Outlet } from 'react-router-dom'

import { Spinner } from '@/components/ui'
import { usePermissions } from '@/hooks'

interface RequirePermissionProps {
  /** The caller needs at least one of these to reach the route. */
  readonly anyOf: readonly string[]
}

/**
 * Route-level authorization. This only decides what to *render* — the API
 * re-checks every permission and answers 403 regardless, so a hand-typed URL
 * gains nothing.
 */
export function RequirePermission({ anyOf }: RequirePermissionProps) {
  const { permissions, isLoading } = usePermissions()

  if (isLoading) return <Spinner label="Checking permissions…" />

  if (!anyOf.some((permission) => permissions.can(permission))) {
    return (
      <div className="emptyState" role="alert">
        <h2 className="h5">Not permitted</h2>
        <p className="mb-0">Your account does not have the permissions required for this page.</p>
      </div>
    )
  }

  return <Outlet />
}
