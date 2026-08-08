import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQueryWithReauth } from '@/api'

/**
 * The repository layer's root. Every resource injects its endpoints into this
 * one API so they share a cache, a tag graph and the re-authenticating
 * transport — the client's counterpart to the API's `ApiRepositoryInterface`.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'UserRoles', 'Me', 'MePermissions', 'Album', 'Photo', 'Role', 'Permission'],
  endpoints: () => ({}),
})

/** Invalidating a whole collection as well as the affected member. */
export const LIST_ID = 'LIST' as const
