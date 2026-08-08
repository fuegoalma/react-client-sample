import type { PermissionChecker } from '@/contracts'

/**
 * The per-record abilities `canOn()` is asked about, named `<resource>.<action>`
 * exactly as the API composes them from its controllers' `accessResource()`.
 *
 * A global permission is one of these plus `.any` (see `PERMISSIONS`), which is
 * why the two catalogs must be read together and neither may be spelled inline.
 */
export const ABILITIES = {
  albumView: 'album.view',
  albumUpdate: 'album.update',
  albumDelete: 'album.delete',
  photoView: 'photo.view',
  photoCreate: 'photo.create',
  photoUpdate: 'photo.update',
  photoDelete: 'photo.delete',
  userView: 'user.view',
  userUpdate: 'user.update',
  userDelete: 'user.delete',
} as const

/**
 * Abilities the API grants implicitly by ownership, to every authenticated
 * user, without any role — the "base user" set.
 *
 * Deliberately absent (and absent server-side too): `user.view`, `user.delete`
 * and every `*.index`, which are role-only even on your own records.
 */
export const OWN_ABILITIES: ReadonlySet<string> = new Set([
  ABILITIES.albumView,
  ABILITIES.albumUpdate,
  ABILITIES.albumDelete,
  ABILITIES.photoView,
  ABILITIES.photoCreate,
  ABILITIES.photoUpdate,
  ABILITIES.photoDelete,
  ABILITIES.userUpdate,
])

/** Permission names used by the UI. Mirrors the API's migration-seeded catalog. */
export const PERMISSIONS = {
  albumIndexAny: 'album.index.any',
  albumViewAny: 'album.view.any',
  albumUpdateAny: 'album.update.any',
  albumDeleteAny: 'album.delete.any',
  albumSoftDeleteAny: 'album.soft-delete.any',
  albumRestore: 'album.restore',
  photoViewAny: 'photo.view.any',
  photoCreateAny: 'photo.create.any',
  photoUpdateAny: 'photo.update.any',
  photoDeleteAny: 'photo.delete.any',
  userIndexAny: 'user.index.any',
  userViewAny: 'user.view.any',
  userCreate: 'user.create',
  userUpdateAny: 'user.update.any',
  userDeleteAny: 'user.delete.any',
  roleIndex: 'role.index',
  roleView: 'role.view',
  roleManage: 'role.manage',
  roleAssign: 'role.assign',
  permissionIndex: 'permission.index',
} as const

/**
 * Client-side mirror of the API's `AccessControlService`.
 *
 * Pure and immutable — built from `GET /users/me/permissions` and rebuilt when
 * that query changes, which is what makes every branch trivially unit-testable.
 */
export class PermissionService implements PermissionChecker {
  private readonly granted: ReadonlySet<string>

  constructor(
    readonly roles: readonly string[] = [],
    readonly permissions: readonly string[] = [],
  ) {
    this.granted = new Set(permissions)
  }

  can(permission: string): boolean {
    return this.granted.has(permission)
  }

  canOn(ability: string, isOwn: boolean): boolean {
    if (this.can(`${ability}.any`)) return true
    return isOwn && OWN_ABILITIES.has(ability)
  }
}

/** A caller with no roles at all: the base user. */
export const BASE_USER_PERMISSIONS = new PermissionService()
