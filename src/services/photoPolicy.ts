import type { PermissionChecker } from '@/contracts'

import { ABILITIES } from './permissions'

/**
 * Photo authorization, kept out of the components so every branch can be
 * asserted directly. Pure — it only reads the checker.
 *
 * `isOwn` is the **album's** ownership, not the photo's: a photo belongs to
 * whoever owns its album, and `GET /photos/{id}` returns no album reference.
 * That is exactly why the client nests photos under their album in the route.
 */
export class PhotoPolicy {
  constructor(private readonly access: PermissionChecker) {}

  canView(isOwn: boolean): boolean {
    return this.access.canOn(ABILITIES.photoView, isOwn)
  }

  /** Uploading into an album, i.e. `POST /albums/{id}/photos`. */
  canUpload(isOwn: boolean): boolean {
    return this.access.canOn(ABILITIES.photoCreate, isOwn)
  }

  /** Only the title may change — the album and the stored file are immutable. */
  canUpdate(isOwn: boolean): boolean {
    return this.access.canOn(ABILITIES.photoUpdate, isOwn)
  }

  canDelete(isOwn: boolean): boolean {
    return this.access.canOn(ABILITIES.photoDelete, isOwn)
  }
}
