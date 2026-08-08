# 2. One refresh at a time, behind a mutex

**Status:** accepted

## Context

Refresh tokens rotate: `POST /auth/refresh` returns a new pair and invalidates
the one presented. The API treats a re-used refresh token as evidence of theft
and revokes the whole session.

A screen typically has several queries in flight at once. If the access token
expires, they all get a 401 at the same moment, and each would try to refresh
with the same token — the second one arriving at a server that has just
invalidated it, and signing the user out.

## Decision

`src/api/baseQueryWithReauth.ts` holds a module-level mutex. Every request waits
on it before firing, and a 401 acquires it to refresh; requests that queued
behind the refresh replay against the new token.

`/auth/*` is never retried — a 401 there means the credentials were wrong, not
that the session expired.

## Consequences

- Refreshing is single-flight. Concurrency, which is the normal case, no longer
  ends the session.
- A refresh has **three** outcomes, not two, and the distinction is
  load-bearing. `refreshed` and `rejected` are obvious; `no-session` is the case
  where there was nothing to refresh. A rejected refresh dispatches
  `loggedOut()`, which clears storage and resets the RTK Query cache. Doing that
  for a _missing_ session live-locks: the cache reset re-fires every mounted
  query without a token, each 401s, and the transport arrives back here. This
  was a real bug, and it is why `useAuth.signOut()` navigates rather than
  leaving screens mounted.
