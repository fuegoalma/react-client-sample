import type { HealthCheck } from '@/types'

import { baseApi } from './baseApi'

function isHealthCheck(value: unknown): value is HealthCheck {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return candidate['status'] === 'ok' || candidate['status'] === 'error'
}

/** What the API reports when it is down but still answering. */
const UNHEALTHY: HealthCheck = { status: 'error', checks: { database: 'error' } }

/**
 * The liveness probe — public, unauthenticated, unthrottled.
 *
 * A 503 is a *result* here, not a transport failure: the API answers it with a
 * body saying which check failed. Mapping it to a successful query keeps the
 * status page rendering the real reason instead of a generic error.
 */
export const healthApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    health: build.query<HealthCheck, void>({
      async queryFn(_arg, _api, _extraOptions, baseQuery) {
        const result = await baseQuery({ url: '/health', method: 'GET' })

        if (result.error === undefined) {
          return isHealthCheck(result.data)
            ? { data: result.data }
            : {
                error: {
                  code: 0,
                  errorCode: 'unrecognised_response',
                  message: 'Unrecognised health response.',
                  fieldErrors: {},
                },
              }
        }

        if (result.error.code === 503) return { data: UNHEALTHY }

        return { error: result.error }
      },
    }),
  }),
})

export const { useHealthQuery } = healthApi
