import { ListQueryBuilder } from '@/services/listQuery'
import type {
  ListQuery,
  PaginatedPayload,
  Role,
  RoleCreateRequest,
  RoleUpdateRequest,
  RoleWithPermissions,
} from '@/types'

import { baseApi, LIST_ID } from './baseApi'

export const rolesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** Name + description only. Requires `role.index` (admin+). */
    roles: build.query<PaginatedPayload<Role>, ListQuery>({
      query: (params) => ({
        url: '/roles',
        method: 'GET',
        params: ListQueryBuilder.toParams(params),
      }),
      providesTags: (result) => [
        { type: 'Role' as const, id: LIST_ID },
        ...(result?.items ?? []).map((role) => ({ type: 'Role' as const, id: role.id })),
      ],
    }),

    /** Includes the role's permission set. Requires `role.view` (super admin). */
    role: build.query<RoleWithPermissions, number>({
      query: (id) => ({ url: `/roles/${id}`, method: 'GET' }),
      providesTags: (_result, _error, id) => [{ type: 'Role', id }],
    }),

    createRole: build.mutation<Role, RoleCreateRequest>({
      query: (body) => ({ url: '/roles', method: 'POST', body }),
      invalidatesTags: [{ type: 'Role', id: LIST_ID }],
    }),

    /** Re-composing a role changes what its holders may do, including the caller. */
    updateRole: build.mutation<Role, { id: number; body: RoleUpdateRequest }>({
      query: ({ id, body }) => ({ url: `/roles/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Role', id },
        { type: 'Role', id: LIST_ID },
        'MePermissions',
      ],
    }),

    deleteRole: build.mutation<null, number>({
      query: (id) => ({ url: `/roles/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Role', id },
        { type: 'Role', id: LIST_ID },
        'MePermissions',
      ],
    }),
  }),
})

export const {
  useRolesQuery,
  useRoleQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} = rolesApi
