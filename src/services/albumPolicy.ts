import type { PermissionChecker } from '@/contracts'

import { ABILITIES, PERMISSIONS } from './permissions'

/**
 * `DELETE /albums/{id}` is one route with two outcomes, chosen by the caller's
 * permissions — so the client must decide which confirmation to show and
 * whether to collect a review reason.
 */
export type AlbumDeleteMode = 'permanent' | 'soft'

/**
 * Album-specific authorization decisions, kept out of the components so the
 * rules can be asserted directly. Pure — it only reads the checker.
 */
export class AlbumPolicy {
  constructor(private readonly access: PermissionChecker) {}

  /** Every authenticated user may create an album (a base ability). */
  canCreate(): boolean {
    return true
  }

  /** Whether the "All albums" screen is reachable at all. */
  canListAll(): boolean {
    return this.access.can(PERMISSIONS.albumIndexAny)
  }

  canView(isOwn: boolean): boolean {
    return this.access.canOn(ABILITIES.albumView, isOwn)
  }

  canUpdate(isOwn: boolean): boolean {
    return this.access.canOn(ABILITIES.albumUpdate, isOwn)
  }

  /**
   * Which delete the API will perform, or `null` when the caller may not delete
   * at all. Permanent wins when a role carries both, exactly as server-side.
   */
  deleteMode(isOwn: boolean): AlbumDeleteMode | null {
    if (isOwn || this.access.can(PERMISSIONS.albumDeleteAny)) return 'permanent'
    if (this.access.can(PERMISSIONS.albumSoftDeleteAny)) return 'soft'
    return null
  }

  canRestore(): boolean {
    return this.access.can(PERMISSIONS.albumRestore)
  }

  /**
   * Where an album screen's trail should point, given how the caller reached it.
   *
   * Their own album belongs under "My albums"; someone else's belongs under the
   * all-albums screen — but only if they may open it. A caller who can view an
   * album without being able to list any gets a label and no link, because a
   * crumb that answers 403 is worse than a crumb that does nothing.
   *
   * It lives here rather than in a page because both the album screen and the
   * photo screen beneath it need the same answer.
   */
  albumsCrumb(isOwn: boolean): { label: string; to?: string } {
    if (isOwn) return { label: 'My albums', to: '/albums' }
    if (this.canListAll()) return { label: 'All albums', to: '/all-albums' }
    return { label: 'Albums' }
  }

  /**
   * Whether to render the soft-deletion columns (`is_deleted`, `delete_reason`)
   * and the corresponding filter on the all-albums screen. Only a caller who
   * can act on a soft-deleted album has any use for them — a moderator, who can
   * only flag albums, never sees one again afterwards.
   */
  showsDeletionState(): boolean {
    return this.canRestore() || this.access.can(PERMISSIONS.albumDeleteAny)
  }
}
