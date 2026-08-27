import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQueryWithReauth } from '@/api'

/**
 * The repository layer's root. Every resource injects its endpoints into this
 * one API so they share a cache, a tag graph and the re-authenticating
 * transport — the client's counterpart to the API's `ApiRepositoryInterface`.
 */
const TAG_TYPES = [
  'User',
  'UserRoles',
  'Me',
  'MePermissions',
  'Album',
  'Photo',
  'Role',
  'Permission',
] as const

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: TAG_TYPES,
  endpoints: () => ({}),
})

/** Invalidating a whole collection as well as the affected member. */
export const LIST_ID = 'LIST' as const

type TagType = (typeof TAG_TYPES)[number]
type TagId = string | number

/**
 * What a list endpoint provides: the collection itself, plus every member it
 * returned, so a mutation on one row invalidates the page it appeared on.
 *
 * Every list endpoint said this for itself, in five identical blocks. `listId`
 * is a parameter because photos have no flat collection — theirs is scoped to
 * an album — and that is a real second caller, not a hypothetical one.
 */
export function listTags<T extends TagType>(
  type: T,
  result: { readonly items: readonly { readonly id: number }[] } | undefined,
  listId: TagId = LIST_ID,
): { type: T; id: TagId }[] {
  return [{ type, id: listId }, ...(result?.items ?? []).map((item) => ({ type, id: item.id }))]
}

/**
 * What a mutation on one member invalidates: the member and the collection it
 * belongs to. Anything else an endpoint touches is spread in beside this.
 */
export function memberTags<T extends TagType>(
  type: T,
  id: number,
  listId: TagId = LIST_ID,
): { type: T; id: TagId }[] {
  return [
    { type, id },
    { type, id: listId },
  ]
}
