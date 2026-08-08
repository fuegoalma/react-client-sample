import type { Permission } from '@/types'

import { baseApi } from './baseApi'

/**
 * The read-only permission catalog roles are composed from. Permissions live in
 * the API's migrations, so there is deliberately no create/update/delete.
 */
export const permissionsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    permissions: build.query<readonly Permission[], void>({
      query: () => ({ url: '/permissions', method: 'GET' }),
      providesTags: ['Permission'],
    }),
  }),
})

export const { usePermissionsQuery } = permissionsApi
