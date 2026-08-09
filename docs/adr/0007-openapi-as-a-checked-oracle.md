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

Three gates keep the oracle honest, because a vendored document is a snapshot:

- `make spec-verify` (`openapi-typescript --check`, part of `make check` and CI)
  holds the committed types to the committed document.
- `.github/workflows/spec-drift.yml` refetches the live document on a schedule
  and fails when it has moved.
- `dtoShapes.test.ts` asserts that **every** schema in the document is either
  mirrored or listed as deliberately not mirrored.

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
