import type { PathParams } from 'msw'

import { db, type MockUser } from './db'
import { forbidden, notFound, unauthorized } from './envelope'

/**
 * The gates every handler passes through, mirroring the API's own middleware.
 *
 * Written out per handler, these were three lines of preamble repeated twenty-odd
 * times — and three chances per endpoint to get the order of 401, 403 and 404
 * subtly wrong. Here they are decided once.
 */

interface MswArgs {
  readonly request: Request
  readonly params: PathParams
}

export interface AuthedContext extends MswArgs {
  /** The authenticated caller; a handler wrapped in `authed` always has one. */
  readonly caller: MockUser
}

type Answer = Response | Promise<Response>

/** Authenticates the way the API does — a stateless access token. */
function authenticate(request: Request): MockUser | null {
  const header = request.headers.get('Authorization')
  const token = header?.startsWith('Bearer ') === true ? header.slice(7) : null
  if (token === null) return null

  // A stale token 401s until the transport rotates the pair.
  if (db.expiredAccessTokens.includes(token)) return null

  const session = db.sessions.find((candidate) => candidate.accessToken === token)
  if (session === undefined) return null

  return db.users.find((user) => user.id === session.userId) ?? null
}

export function can(permission: string): boolean {
  return db.callerPermissions.includes(permission)
}

/** Mirrors `AccessControlService::canOn` — `.any`, or ownership of the subject. */
const OWN_ABILITIES = new Set([
  'album.view',
  'album.update',
  'album.delete',
  'photo.view',
  'photo.create',
  'photo.update',
  'photo.delete',
  'user.update',
])

export function canOn(ability: string, ownerId: number, callerId: number): boolean {
  if (can(`${ability}.any`)) return true
  return ownerId === callerId && OWN_ABILITIES.has(ability)
}

/** Answers 401 unless the request carries a live access token. */
export function authed(handler: (context: AuthedContext) => Answer) {
  return ({ request, params }: MswArgs): Answer => {
    const caller = authenticate(request)
    if (caller === null) return unauthorized()
    return handler({ request, params, caller })
  }
}

/** …and 403 unless the caller also holds the permission. */
authed.requiring = (permission: string, handler: (context: AuthedContext) => Answer) =>
  authed((context) => (can(permission) ? handler(context) : forbidden()))

/**
 * Looks a record up by the id in the path. Returning `notFound()` in place of
 * the record lets a handler answer with it directly, so no handler spells out
 * the same find-or-404 again.
 */
export function byId<T extends { id: number }>(
  rows: readonly T[],
  raw: PathParams[string],
): T | undefined {
  const id = Number(raw)
  return rows.find((row) => row.id === id)
}

export { notFound }
