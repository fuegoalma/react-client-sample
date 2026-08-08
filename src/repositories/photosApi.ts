import { ListQueryBuilder } from '@/services/listQuery'
import type { ListQuery, PaginatedPayload, Photo, PhotoUpdateRequest } from '@/types'

import { baseApi, LIST_ID } from './baseApi'

/** Photos are a child resource of albums — there is no flat collection. */
export interface AlbumPhotosArgs {
  readonly albumId: number
  readonly query: ListQuery
}

export interface UploadPhotoArgs {
  readonly albumId: number
  readonly title: string
  readonly file: File
}

export const photosApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    albumPhotos: build.query<PaginatedPayload<Photo>, AlbumPhotosArgs>({
      query: ({ albumId, query }) => ({
        url: `/albums/${albumId}/photos`,
        method: 'GET',
        params: ListQueryBuilder.toParams(query),
      }),
      providesTags: (result, _error, { albumId }) => [
        { type: 'Photo' as const, id: `${LIST_ID}-${albumId}` },
        ...(result?.items ?? []).map((photo) => ({ type: 'Photo' as const, id: photo.id })),
      ],
    }),

    photo: build.query<Photo, number>({
      query: (id) => ({ url: `/photos/${id}`, method: 'GET' }),
      providesTags: (_result, _error, id) => [{ type: 'Photo', id }],
    }),

    /**
     * The API's only multipart endpoint. `fetchBaseQuery` leaves the
     * Content-Type unset for a FormData body so the browser can add the
     * multipart boundary itself.
     */
    uploadPhoto: build.mutation<Photo, UploadPhotoArgs>({
      query: ({ albumId, title, file }) => {
        const body = new FormData()
        body.append('title', title)
        body.append('file', file)
        return { url: `/albums/${albumId}/photos`, method: 'POST', body }
      },
      invalidatesTags: (_result, _error, { albumId }) => [
        { type: 'Photo', id: `${LIST_ID}-${albumId}` },
        { type: 'Album', id: albumId },
      ],
    }),

    /** Only the title may change — the album and the stored file are immutable. */
    updatePhoto: build.mutation<Photo, { id: number; albumId: number; body: PhotoUpdateRequest }>({
      query: ({ id, body }) => ({ url: `/photos/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id, albumId }) => [
        { type: 'Photo', id },
        { type: 'Photo', id: `${LIST_ID}-${albumId}` },
        { type: 'Album', id: albumId },
      ],
    }),

    deletePhoto: build.mutation<null, { id: number; albumId: number }>({
      query: ({ id }) => ({ url: `/photos/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { id, albumId }) => [
        { type: 'Photo', id },
        { type: 'Photo', id: `${LIST_ID}-${albumId}` },
        { type: 'Album', id: albumId },
      ],
    }),
  }),
})

export const {
  useAlbumPhotosQuery,
  usePhotoQuery,
  useUploadPhotoMutation,
  useUpdatePhotoMutation,
  useDeletePhotoMutation,
} = photosApi
