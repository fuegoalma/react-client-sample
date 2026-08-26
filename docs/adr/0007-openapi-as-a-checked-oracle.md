# 7. The OpenAPI document is checked against, not generated from

**Status:** accepted

## Context

The API documents itself with an OpenAPI 3.0 document, and that document is the
source of truth for every request and response shape. The usual way to make a
frontend depend on it is to generate the client from it — `openapi-typescript`
for the types, or `orval` for types plus ready-made query hooks — and to
regenerate in CI so the compiler reports any divergence.

Two things make the direct route a poor fit here. The document marks almost
every property optional (`id?`, `title?`), so consuming the generated types as
the application's own would put `| undefined` on every field of every DTO and
buy the loss back in non-null assertions. And the generated hooks would replace
a repository layer that carries what a generator cannot produce: the RTK Query
tag graph, the envelope-stripping base query, the single-flight refresh
([ADR 2](0002-single-flight-token-refresh.md)), and `ListQueryBuilder`.

## Decision

`openapi-typescript` generates `tests/contract/schema.d.ts`, and that file is
used **only as a compile-time oracle**. The DTOs in `src/types/` stay
hand-written — precise and `readonly` — and `tests/contract/dtoShapes.test.ts`
holds each one to its schema in both directions: same field names, same field
types. Drift fails `make typecheck` with the offending field named.

`orval` is not used, and the repository layer stays hand-written.

Four gates keep the oracle honest, because a vendored document is a snapshot:

- `make spec-verify` (`openapi-typescript --check`, part of `make check` and CI)
  holds the committed types to the committed document.
- `make spec-drift` asks the source whether that document has moved. It fetches
  to a temporary file and reports, where `sync-spec` overwrites both halves of
  the snapshot and leaves you to work out what changed.
- `dtoShapes.test.ts` asserts that **every** schema in the document is either
  mirrored or listed as deliberately not mirrored.
- `endpoints.test.ts` asserts the same for operations, in both directions: no
  call the document does not describe, and no operation left unused.

Only the second of those can notice the API itself moving, and the distinction
matters: `spec-verify` compares the two halves of one snapshot, and the two stay
consistent with each other indefinitely after the document they were taken from
has changed. Every other gate reads the vendored copy, so all of them keep
passing against a document nobody serves any more.

`.github/workflows/spec-drift.yml` automates that check daily. It is gated on the
`API_SPEC_URL` repository variable, and the URL that variable holds is **the API
repository's own committed document**, not a running instance:

```
https://raw.githubusercontent.com/fuegoalma/yii2-rest-api-sample/master/config/openapi.yaml
```

That is what makes the check possible in CI at all. The API is a separate
project that runs on `localhost`, and a hosted runner cannot reach it — but the
document is a file under source control in a public repository, and a file needs
no server. `config/openapi.yaml` is what the API serves at `/docs/openapi.yaml`,
so asking GitHub for it and asking a running API for it are the same question.

Spec drift is therefore **not** local-first, and the parallel with the end-to-end
suite goes only so far: E2E needs a live API answering requests, which no
variable can conjure, so it stays local. A document does not.

`make spec-drift` is the same check on demand, for the working copy in front of
you. It and `make sync-spec` both read `SPEC_URL`, which defaults to that same
raw URL: one source for the daily job, the on-demand check and the refresh, so
what CI compares against and what a developer refreshes from cannot be two
different documents. Overriding it asks an instance instead.

## Consequences

- The DTOs are duplicated effort by design. The oracle is what makes the
  duplicate safe, so a schema left out of it is the real risk — hence the
  coverage assertion, added after ten of twenty-six schemas turned out to be
  checked and `Pagination` had quietly disagreed with the API about `from`/`to`.
- Comparing types across the two sides has to strip `readonly`, which the
  generator does not emit. Without that the comparison silently skipped every
  schema with an array field.
- Adopting `orval` later means giving up the tag graph, or maintaining a layer
  on top of the generated one. Undoing this decision is a rewrite of
  `src/repositories/`, not a configuration change.
- The mock API is checked against the same document but written independently
  ([ADR 5](0005-mock-api-as-independent-mirror.md)) — a mock that agreed with
  the client by construction is what let the `Pagination` mistake survive.

## The one exemption, and the rule for it

"Every documented operation is used" stopped being literally true when the API
grew `GET /metrics`, `GET /docs` and `GET /docs/openapi.yaml` — a Prometheus
scrape target and its own documentation site. They are operator surface that
happens to share a host; a browser client calling them would be doing something
odd, so _unused_ is the correct state rather than a gap.

They are named in `NOT_CALLED` in `endpoints.test.ts`. An escape hatch that is
not written down is how an oracle quietly stops being one, so the rule is
narrow: **an entry must be an operation no client could sensibly call.**
Anything a client _could_ call belongs in a repository instead, and "we have not
got round to it yet" is not a reason to add a line here. A second assertion
holds the list itself to the document, so a skip cannot outlive the operation it
names.
