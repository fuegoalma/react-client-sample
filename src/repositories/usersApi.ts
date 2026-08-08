import { ListQueryBuilder } from '@/services/listQuery'
import type {
  ListQuery,
  Me,
  MePermissions,
  PaginatedPayload,
  Role,
  RoleAssignRequest,
  User,
  UserCreateRequest,
  UserUpdateRequest,
  UserWithAlbums,
} from '@/types'

import { baseApi, LIST_ID } from './baseApi'

export const usersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** The caller's own profile. Never gated, whatever roles they hold. */
    me: build.query<Me, void>({
      query: () => ({ url: '/users/me', method: 'GET' }),
      providesTags: ['Me'],
    }),

    /** The caller's roles and effective permissions — what the UI is built from. */
    myPermissions: build.query<MePermissions, void>({
      query: () => ({ url: '/users/me/permissions', method: 'GET' }),
      providesTags: ['MePermissions'],
    }),

    users: build.query<PaginatedPayload<User>, ListQuery>({
      query: (params) => ({
        url: '/users',
        method: 'GET',
        params: ListQueryBuilder.toParams(params),
      }),
      providesTags: (result) => [
        { type: 'User' as const, id: LIST_ID },
        ...(result?.items ?? []).map((user) => ({ type: 'User' as const, id: user.id })),
      ],
    }),

    user: build.query<UserWithAlbums, number>({
      query: (id) => ({ url: `/users/${id}`, method: 'GET' }),
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),

    createUser: build.mutation<User, UserCreateRequest>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: [{ type: 'User', id: LIST_ID }],
    }),

    updateUser: build.mutation<User, { id: number; body: UserUpdateRequest }>({
      query: ({ id, body }) => ({ url: `/users/${id}`, method: 'PUT', body }),
      // Updating yourself changes /users/me too, so refresh it unconditionally.
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: LIST_ID },
        'Me',
      ],
    }),

    deleteUser: build.mutation<null, number>({
      query: (id) => ({ url: `/users/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'User', id },
        { type: 'User', id: LIST_ID },
        { type: 'Album', id: LIST_ID },
      ],
    }),

    userRoles: build.query<readonly Role[], number>({
      query: (id) => ({ url: `/users/${id}/roles`, method: 'GET' }),
      providesTags: (_result, _error, id) => [{ type: 'UserRoles', id }],
    }),

    /** Full replacement of a user's role set — an empty array revokes all. */
    replaceUserRoles: build.mutation<readonly Role[], { id: number; body: RoleAssignRequest }>({
      query: ({ id, body }) => ({ url: `/users/${id}/roles`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'UserRoles', id },
        { type: 'User', id },
        'Me',
        'MePermissions',
      ],
    }),
  }),
})

/** Warms `GET /users/{id}`, for the same reason as `usePrefetchAlbum`. */
export const usePrefetchUser = () => usersApi.usePrefetch('user')

export const {
  useMeQuery,
  useMyPermissionsQuery,
  useUsersQuery,
  useUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useUserRolesQuery,
  useReplaceUserRolesMutation,
} = usersApi
