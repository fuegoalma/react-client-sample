export interface User {
  readonly id: number
  readonly first_name: string
  readonly last_name: string
  readonly email: string
  readonly created_at: string
  readonly updated_at: string
  /**
   * Whether the address has been proven. Recorded, not enforced — the API gates
   * nothing on it, so this is here for the client to prompt with.
   */
  readonly email_verified: boolean
}

/** `GET /users/{id}` and `GET /users/me` — both always embed the account's albums. */
export interface UserWithAlbums extends User {
  readonly albums: readonly Album[]
}

/** `GET /users/me` — the profile plus the caller's role names. */
export interface Me extends UserWithAlbums {
  readonly roles: readonly string[]
}

/** `GET /users/me/permissions` — what the client builds its UI from. */
export interface MePermissions {
  readonly roles: readonly string[]
  readonly permissions: readonly string[]
}

export interface UserCreateRequest {
  readonly first_name: string
  readonly last_name: string
  readonly email: string
  readonly password: string
}

export type UserUpdateRequest = Partial<UserCreateRequest>

/** List/summary shape of an album. */
export interface Album {
  readonly id: number
  readonly title: string
  readonly is_deleted: boolean
  readonly delete_reason: string | null
  readonly created_at: string
  readonly updated_at: string
}

/**
 * Single-album shape — adds the owner's name and the album's photos.
 *
 * Deliberately **not** `extends Album`: the list shape carries timestamps and
 * this one does not. The API serves the two from different DTOs and only the
 * list is sortable by date, so extending would invent two fields the response
 * never sends — which the contract suite reads as drift, correctly.
 */
export interface AlbumView {
  readonly id: number
  readonly title: string
  readonly is_deleted: boolean
  readonly delete_reason: string | null
  readonly first_name: string
  readonly last_name: string
  readonly photos: readonly Photo[]
}

export interface AlbumCreateRequest {
  readonly title: string
}

export type AlbumUpdateRequest = Partial<AlbumCreateRequest>

/** Optional body of a soft delete — the reason a flagged album carries. */
export interface AlbumSoftDeleteRequest {
  readonly reason?: string
}

export interface Photo {
  readonly id: number
  readonly title: string
  readonly url: string | null
  /** There is no `updated_at`: only the title may change, and no column records it. */
  readonly created_at: string
}

export interface PhotoUpdateRequest {
  readonly title: string
}

export interface Permission {
  readonly name: string
  readonly description: string
}

export interface Role {
  readonly id: number
  readonly name: string
  readonly description: string
  /** Seeded roles cannot be renamed or deleted. */
  readonly is_system: boolean
}

export interface RoleWithPermissions extends Role {
  readonly permissions: readonly Permission[]
}

export interface RoleCreateRequest {
  readonly name: string
  readonly description?: string
  readonly permissions?: readonly string[]
}

export type RoleUpdateRequest = Partial<RoleCreateRequest>

/** Full replacement of a user's role set — an empty array revokes all. */
export interface RoleAssignRequest {
  readonly roles: readonly string[]
}
