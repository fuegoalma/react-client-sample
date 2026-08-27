import { ListQueryBuilder } from '@/services/listQuery'
import type {
  Album,
  AlbumCreateRequest,
  AlbumSoftDeleteRequest,
  AlbumUpdateRequest,
  AlbumView,
  ListQuery,
  PaginatedPayload,
} from '@/types'

import { baseApi, listTags, memberTags, LIST_ID } from './baseApi'

/**
 * `DELETE /albums/{id}` is one route with two outcomes decided server-side by
 * the caller's permissions; the optional reason is only read for a soft delete.
 */
export interface DeleteAlbumArgs extends AlbumSoftDeleteRequest {
  readonly id: number
}

export const albumsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** The caller's own albums. Available to every authenticated user. */
    myAlbums: build.query<PaginatedPayload<Album>, ListQuery>({
      query: (params) => ({
        url: '/albums/my',
        method: 'GET',
        params: ListQueryBuilder.toParams(params),
      }),
      providesTags: (result) => listTags('Album', result),
    }),

    /** Every album in the system. Requires `album.index.any`. */
    albums: build.query<PaginatedPayload<Album>, ListQuery>({
      query: (params) => ({
        url: '/albums',
        method: 'GET',
        params: ListQueryBuilder.toParams(params),
      }),
      providesTags: (result) => listTags('Album', result),
    }),

    album: build.query<AlbumView, number>({
      query: (id) => ({ url: `/albums/${id}`, method: 'GET' }),
      providesTags: (_result, _error, id) => [{ type: 'Album', id }],
    }),

    createAlbum: build.mutation<Album, AlbumCreateRequest>({
      query: (body) => ({ url: '/albums', method: 'POST', body }),
      invalidatesTags: [{ type: 'Album', id: LIST_ID }, 'Me'],
    }),

    updateAlbum: build.mutation<Album, { id: number; body: AlbumUpdateRequest }>({
      query: ({ id, body }) => ({ url: `/albums/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => memberTags('Album', id),
    }),

    deleteAlbum: build.mutation<null, DeleteAlbumArgs>({
      query: ({ id, reason }) => ({
        url: `/albums/${id}`,
        method: 'DELETE',
        ...(reason !== undefined && reason !== '' && { body: { reason } }),
      }),
      invalidatesTags: (_result, _error, { id }) => [...memberTags('Album', id), 'Me'],
    }),

    /** Lifts a pseudo-deletion after review. Requires `album.restore`. */
    restoreAlbum: build.mutation<Album, number>({
      query: (id) => ({ url: `/albums/${id}/restore`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [...memberTags('Album', id), 'Me'],
    }),
  }),
})

/**
 * Warms `GET /albums/{id}` before anything asks for it — a list screen calls it
 * as the pointer reaches a row, so the detail view usually has the album by the
 * time the click lands. Bound here rather than at the call site because only
 * this module knows the endpoint's name.
 */
export const usePrefetchAlbum = () => albumsApi.usePrefetch('album')

export const {
  useMyAlbumsQuery,
  useAlbumsQuery,
  useAlbumQuery,
  useCreateAlbumMutation,
  useUpdateAlbumMutation,
  useDeleteAlbumMutation,
  useRestoreAlbumMutation,
} = albumsApi
