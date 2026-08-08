import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryMeta,
} from '@reduxjs/toolkit/query'

import type { AuthState } from '@/app/authSlice'
import { config } from '@/config'
import type { ApiError } from '@/types'

import { toApiError } from './errors'

/** The slice of state the transport needs. Declared locally to avoid a cycle. */
interface AuthAwareState {
  readonly auth: AuthState
}

export type AppBaseQuery = BaseQueryFn<
  string | FetchArgs,
  unknown,
  ApiError,
  object,
  FetchBaseQueryMeta
>

const rawBaseQuery = fetchBaseQuery({
  baseUrl: config.apiBaseUrl,
  prepareHeaders(headers, { getState }) {
    const { accessToken } = (getState() as AuthAwareState).auth
    if (accessToken !== null) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }
    return headers
  },
})

function isEnvelope(value: unknown): value is { data: unknown } {
  return typeof value === 'object' && value !== null && 'success' in value && 'data' in value
}

/**
 * Strips the `{success, data, code}` wrapper so repositories and everything
 * above them work with plain DTOs. A 204 arrives as `null` and passes through.
 */
export function unwrapEnvelope(body: unknown): unknown {
  return isEnvelope(body) ? body.data : body
}

/**
 * Transport: authenticated requests, envelope unwrapping, and one normalised
 * error shape. Re-authentication is layered on top of this, not baked into it.
 */
export const envelopeBaseQuery: AppBaseQuery = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions)

  if (result.error !== undefined) {
    return { error: toApiError(result.error, result.meta), meta: result.meta }
  }

  return { data: unwrapEnvelope(result.data), meta: result.meta }
}
