import type { FilterDefinition, SortSpec } from '@/types'

/**
 * The client's counterpart to the API's `*SearchForm`: one declaration per
 * resource of what its list endpoint accepts.
 *
 * The API validates the *query* params of every index endpoint against a
 * per-resource whitelist — an unknown `sort` attribute is a 422 — so that
 * contract has to live somewhere on this side too. Keeping it here rather than
 * inline in each screen means a filter, a sortable column and the default order
 * are declared once and can be asserted against the OpenAPI spec in one test.
 */
export interface ListSpec {
  /** Filterable attributes, as the API names them, plus how to render them. */
  readonly filters: readonly FilterDefinition[]
  /** The API's `sortableAttributes()` whitelist. */
  readonly sortable: readonly string[]
  readonly defaultSort?: readonly SortSpec[]
  readonly perPage?: number
}

const partial = (key: string, label: string): FilterDefinition => ({
  key,
  label,
  placeholder: 'Partial match',
})

/** `GET /users` — moderator and above. */
export const userListSpec: ListSpec = {
  filters: [
    partial('first_name', 'First name'),
    partial('last_name', 'Last name'),
    partial('email', 'Email'),
  ],
  sortable: ['id', 'first_name', 'last_name', 'email', 'created_at', 'updated_at'],
  defaultSort: [{ attribute: 'id', direction: 'asc' }],
}

/**
 * `GET /albums/my` and `GET /albums` share the album search form server-side,
 * so they share one spec here.
 *
 * No owner filter: the album list response carries no owner, so there is no
 * column to filter against — and a user's albums are already listed on their
 * own page, which is the question that filter was trying to answer.
 */
export const albumListSpec: ListSpec = {
  filters: [partial('title', 'Album title')],
  sortable: ['id', 'user_id', 'title', 'created_at', 'updated_at'],
  defaultSort: [{ attribute: 'created_at', direction: 'desc' }],
}

/**
 * Appended to `albumListSpec` on the all-albums screen, but only for a caller
 * who can act on a flagged album — a moderator can flag one but never sees it
 * again, so the control would do nothing for them.
 */
export const ALBUM_DELETION_FILTER: FilterDefinition = {
  key: 'is_deleted',
  label: 'Deletion state',
  type: 'select',
  options: [
    { value: '', label: 'Live albums' },
    { value: '1', label: 'Flagged for review' },
  ],
}

/** `GET /albums/{id}/photos` — the nested collection; there is no flat one. */
export const photoListSpec: ListSpec = {
  filters: [partial('title', 'Photo title')],
  sortable: ['id', 'title', 'created_at'],
  defaultSort: [{ attribute: 'created_at', direction: 'desc' }],
}

/** `GET /roles` — admin and above. */
export const roleListSpec: ListSpec = {
  filters: [partial('name', 'Name')],
  sortable: ['id', 'name'],
  defaultSort: [{ attribute: 'name', direction: 'asc' }],
}

/** Adds a conditionally-available filter without mutating the base spec. */
export function withFilter(spec: ListSpec, filter: FilterDefinition): ListSpec {
  return { ...spec, filters: [...spec.filters, filter] }
}
