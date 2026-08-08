import type { PermissionChecker } from '@/contracts'
import type { Role } from '@/types'

import { PERMISSIONS } from './permissions'

/**
 * Role authorization, mirroring `RoleService`. Pure — it only reads the checker
 * and the role's own flag.
 *
 * The one rule worth a service: a **system** role (the three seeded ones) may be
 * re-composed but never renamed or deleted — the API answers 422/409 — so the
 * three questions have different answers for the same role and must not be
 * re-derived per screen.
 *
 * Not mirrored, and not mirrorable: anti-escalation, which forbids a holder of
 * `role.assign` without `role.manage` from granting a role that carries
 * `role.manage`/`role.assign`. `GET /roles` returns name and description only,
 * so the client cannot tell which roles those are; the API's 403 is surfaced
 * verbatim instead.
 */
export class RolePolicy {
  constructor(private readonly access: PermissionChecker) {}

  canList(): boolean {
    return this.access.can(PERMISSIONS.roleIndex)
  }

  /** Reading a role's permission set, i.e. opening the composition screen. */
  canView(): boolean {
    return this.access.can(PERMISSIONS.roleView)
  }

  canCreate(): boolean {
    return this.access.can(PERMISSIONS.roleManage)
  }

  /** Changing which permissions a role grants — allowed on system roles too. */
  canRecompose(): boolean {
    return this.access.can(PERMISSIONS.roleManage)
  }

  canRename(role: Pick<Role, 'is_system'>): boolean {
    return this.canRecompose() && !role.is_system
  }

  canDelete(role: Pick<Role, 'is_system'>): boolean {
    return this.canRecompose() && !role.is_system
  }

  /** Assigning roles to an account (`PUT /users/{id}/roles`). */
  canAssign(): boolean {
    return this.access.can(PERMISSIONS.roleAssign)
  }
}
