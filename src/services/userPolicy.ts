import type { PermissionChecker } from '@/contracts'

import { ABILITIES, PERMISSIONS } from './permissions'

/**
 * Account authorization, mirroring what `UserService` and `AccessControlService`
 * decide server-side. Pure — the caller's own id is passed in rather than read
 * from anywhere, so every branch is directly assertable.
 *
 * The asymmetry is deliberate and matches the API: `user.update` is granted by
 * ownership, while `user.view` and `user.delete` are role-only **even on your
 * own account** — which is why `/users/{id}` is a moderator screen and your own
 * account is edited at `/profile` instead.
 */
export class UserPolicy {
  constructor(
    private readonly access: PermissionChecker,
    private readonly currentUserId: number | null,
  ) {}

  isSelf(userId: number): boolean {
    return this.currentUserId !== null && this.currentUserId === userId
  }

  /** Whether the accounts list is reachable at all. */
  canListAll(): boolean {
    return this.access.can(PERMISSIONS.userIndexAny)
  }

  canCreate(): boolean {
    return this.access.can(PERMISSIONS.userCreate)
  }

  /** Ownership does not grant this — `user.view` is not a base ability. */
  canView(userId: number): boolean {
    return this.access.canOn(ABILITIES.userView, this.isSelf(userId))
  }

  canUpdate(userId: number): boolean {
    return this.access.canOn(ABILITIES.userUpdate, this.isSelf(userId))
  }

  /**
   * Role-only, like `canView`. The API additionally refuses to delete the last
   * `role.manage` holder (409) and a `role.manage` holder's account (403), but
   * neither is knowable here: `GET /users` carries no roles.
   */
  canDelete(userId: number): boolean {
    return this.access.canOn(ABILITIES.userDelete, this.isSelf(userId))
  }

  canAssignRoles(): boolean {
    return this.access.can(PERMISSIONS.roleAssign)
  }
}
