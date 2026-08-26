# 5. The mock API is a re-implementation, not fixtures

**Status:** accepted

## Context

The functional suite needs answers to every request the client makes. Canned
responses per test would make each test agree with whatever the client happened
to send, which proves nothing about the contract.

## Decision

`tests/mocks/handlers.ts` is a small re-implementation of the API: the response
envelope, pagination with filters and a sort whitelist, token rotation,
single-use tokens scoped by purpose, and the 401/403/404/409/422/429 answers.
`onUnhandledRequest: 'error'` — a request the mock does not recognise fails the
test rather than hanging it.

Its permission logic (`canOn`, `OWN_ABILITIES` in `tests/mocks/guards.ts`) is
**re-derived rather than imported from `src/`**, and so is the status→`error_code`
table in `tests/mocks/envelope.ts` — for the same reason, and it is the one the
client now branches on ([ADR 8](0008-branch-on-the-error-code.md)).

## Consequences

- Importing the client's own catalog would make the mock agree with the client
  by construction, and the RBAC tests would prove only that the client agrees
  with itself.
- Keeping the gates in `guards.ts` rather than in each handler removes three
  lines of preamble from twenty-odd endpoints — and with them twenty chances to
  order 401, 403 and 404 differently.
- The same handlers serve the published demo
  ([0006](0006-runtime-configuration.md) explains how it is pointed at them), so
  there is one fake to maintain and the demo cannot drift from what the tests
  assert.
- Being a mirror, it can still be _wrong together_ with the client. That gap is
  what `tests/contract/` closes by checking both against the API's own OpenAPI
  document.
