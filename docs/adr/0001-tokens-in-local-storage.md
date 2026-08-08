# 1. The refresh token lives in `localStorage`

**Status:** accepted

## Context

The API returns both tokens in the JSON body of `POST /auth/login`. The usual
advice — keep the refresh token in an `httpOnly` cookie so script cannot read
it — is not available to us: a value delivered in a response body has already
passed through JavaScript by the time we see it.

The session must also survive a reload, or every refresh of the page would
sign the user out.

## Decision

Persist the token pair in `localStorage`, behind the `TokenStorage` interface
(`src/contracts/TokenStorage.ts`), injected into the store at
`createAppStore({ tokenStorage })`.

## Consequences

- The XSS trade-off is real and accepted: script running on this origin can read
  the tokens. It is mitigated by the API's short access-token lifetime and by
  refresh-token rotation, which makes a stolen token detectable — see
  [0002](0002-single-flight-token-refresh.md).
- Nothing above the composition root knows where tokens are kept. Tests inject
  `InMemoryTokenStorage`; changing to `sessionStorage`, to memory-only, or to a
  cookie the day the API sets one is a second implementation of the interface
  and no other edit.
- The implementation swallows storage exceptions, because a private-mode browser
  throws on write. A failure degrades to an in-memory session rather than
  breaking sign-in.
