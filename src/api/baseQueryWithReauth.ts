import type { FetchArgs } from '@reduxjs/toolkit/query'
import { Mutex } from 'async-mutex'

import type { AuthState } from '@/app/authSlice'
import { credentialsReceived, loggedOut } from '@/app/authSlice'
import { notifyError } from '@/app/notificationsSlice'
import { toStoredTokens } from '@/contracts'
import type { TokenPair } from '@/types'

import { envelopeBaseQuery, type AppBaseQuery } from './baseQuery'

interface AuthAwareState {
  readonly auth: AuthState
}

/**
 * Serialises refreshes. The API rotates refresh tokens and treats a re-used one
 * as a leak — revoking the whole session — so two parallel refreshes would log
 * the user out. Every request waits here while one is in flight.
 */
const refreshMutex = new Mutex()

function requestUrl(args: string | FetchArgs): string {
  return typeof args === 'string' ? args : args.url
}

/** The auth endpoints answer 401 on bad credentials — never retry those. */
function isAuthRequest(args: string | FetchArgs): boolean {
  return requestUrl(args).startsWith('/auth/')
}

function isTokenPair(value: unknown): value is TokenPair {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate['access_token'] === 'string' && typeof candidate['refresh_token'] === 'string'
  )
}

type ReauthArgs = Parameters<AppBaseQuery>

/**
 * Why three outcomes and not a boolean: "the refresh was rejected" and "there
 * was no session to refresh" call for opposite responses. The first ends the
 * session; the second must not, because ending an already-ended session
 * re-dispatches `loggedOut`, which resets the RTK Query cache, which makes every
 * mounted query re-fire without a token — arriving back here in a loop.
 */
type RefreshOutcome = 'refreshed' | 'rejected' | 'no-session'

/** Exchanges the stored refresh token for a fresh pair. */
async function refreshSession(
  api: ReauthArgs[1],
  extraOptions: ReauthArgs[2],
): Promise<RefreshOutcome> {
  const { refreshToken } = (api.getState() as AuthAwareState).auth
  if (refreshToken === null) return 'no-session'

  const result = await envelopeBaseQuery(
    { url: '/auth/refresh', method: 'POST', body: { refresh_token: refreshToken } },
    api,
    extraOptions,
  )

  if (result.error !== undefined || !isTokenPair(result.data)) return 'rejected'

  api.dispatch(credentialsReceived(toStoredTokens(result.data)))
  return 'refreshed'
}

/**
 * The transport the application actually uses: on a 401 it refreshes once —
 * behind the mutex, so concurrent requests share a single rotation — and
 * replays the original request. A failed refresh ends the session.
 */
export const baseQueryWithReauth: AppBaseQuery = async (args, api, extraOptions) => {
  // A refresh may already be in flight; don't fire with a token about to rotate.
  await refreshMutex.waitForUnlock()

  const result = await envelopeBaseQuery(args, api, extraOptions)
  if (result.error?.code !== 401 || isAuthRequest(args)) return result

  if (refreshMutex.isLocked()) {
    // Another request is refreshing — wait for its outcome and reuse it.
    await refreshMutex.waitForUnlock()
  } else {
    const release = await refreshMutex.acquire()
    try {
      const outcome = await refreshSession(api, extraOptions)

      // Already signed out — the 401 is the expected answer, not a session end.
      if (outcome === 'no-session') return result

      if (outcome === 'rejected') {
        api.dispatch(loggedOut())
        api.dispatch(notifyError('Your session has expired. Please sign in again.'))
        return result
      }
    } finally {
      release()
    }
  }

  const { accessToken } = (api.getState() as AuthAwareState).auth
  if (accessToken === null) return result

  return envelopeBaseQuery(args, api, extraOptions)
}
