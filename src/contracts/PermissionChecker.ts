/**
 * The two questions the UI asks about authorization, mirroring the API's
 * `AccessControlInterface`. The server stays the authority — this only decides
 * what to render.
 */
export interface PermissionChecker {
  /** A global permission, e.g. `user.index.any`. */
  readonly can: (permission: string) => boolean

  /**
   * A per-record ability, e.g. `album.update`. Granted when a role carries the
   * `.any` variant, or when the caller owns the subject and the ability is one
   * the API grants implicitly by ownership.
   */
  readonly canOn: (ability: string, isOwn: boolean) => boolean

  readonly roles: readonly string[]
  readonly permissions: readonly string[]
}
