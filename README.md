# Photos REST API — React client

[![CI](https://github.com/fuegoalma/react-client-sample/actions/workflows/ci.yml/badge.svg)](https://github.com/fuegoalma/react-client-sample/actions/workflows/ci.yml)
[![CD](https://github.com/fuegoalma/react-client-sample/actions/workflows/cd.yml/badge.svg)](https://github.com/fuegoalma/react-client-sample/actions/workflows/cd.yml)
[![Demo](https://github.com/fuegoalma/react-client-sample/actions/workflows/pages.yml/badge.svg)](https://fuegoalma.github.io/react-client-sample/)

**[▶ Live demo](https://fuegoalma.github.io/react-client-sample/)** · **[UI kit](https://fuegoalma.github.io/react-client-sample/storybook/)** — no
sign-up, no server. Every response comes from an in-browser mock of the API,
which is the _same_ mock the test suite runs against, so you can create albums,
upload photos and hand yourself roles. Sign in with `ada@example.com` /
`secret123`.

A React 19 + TypeScript client for a Yii2 REST API of **users, albums and
photos** — JWT with a two-token model, flat role-based access control. It uses
every endpoint the API exposes, and is checked against the API's own OpenAPI
document rather than against a hand-written copy of it.

---

## Stack

| Concern         | Choice                                                                    |
| --------------- | ------------------------------------------------------------------------- |
| Build / runtime | Vite 7, React 19, TypeScript 5 (`strict`, no `any`), Node 24              |
| Server state    | Redux Toolkit 2 + **RTK Query** — one API, one module per resource        |
| Routing         | React Router 7, permission gates as layout routes                         |
| Forms           | React Hook Form + Zod, mirroring the API's own validators                 |
| Styling         | Bootstrap 5.3 compiled from SCSS; every application style is SCSS         |
| Tests           | Vitest + Testing Library + MSW; Playwright against the real API           |
| Container       | Multi-stage Dockerfile: Vite dev server locally, **Apache** in production |

## What is worth looking at

- **[`src/api/`](src/api/)** — the transport. A 401 refreshes once and replays
  the request, behind a mutex: refresh tokens rotate, and two concurrent
  refreshes would sign the user out ([ADR 2](docs/adr/0002-single-flight-token-refresh.md)).
- **[`src/services/`](src/services/)** — the client's mirror of the server's
  permission model, and one pure policy per resource. `AlbumPolicy.deleteMode()`
  is the interesting one: a single `DELETE` route with two outcomes, where a
  permanent delete beats a review flag ([ADR 4](docs/adr/0004-permissions-mirrored-client-side.md)).
- **[`tests/contract/`](tests/contract/)** — DTO shapes, every URL the client
  issues, and each list's filters and sort whitelist, all checked against the
  vendored `openapi.yaml`. `make sync-spec` refetches it.
- **[`tests/mocks/`](tests/mocks/)** — a small re-implementation of the API,
  not canned responses, with its permission logic deliberately re-derived rather
  than imported from `src/` ([ADR 5](docs/adr/0005-mock-api-as-independent-mirror.md)).
- **[The UI kit](https://fuegoalma.github.io/react-client-sample/storybook/)** —
  one modal shell, one table, one loading/failed/empty triad, each shown on its
  own in both themes with axe running per component.

**411 Vitest tests at 100% coverage** — lines, branches, functions and
statements — plus 21 Playwright specs. Coverage is a build gate, not a report:
an uncovered line fails the commit that introduced it.

## Running it

Everything runs in Docker; the API it talks to is a separate project and must be
running on `http://localhost:8084`.

```bash
./init.sh && ./setup.sh   # .env, build, start, wait for the API
make check                # cs-check · typecheck · build · size · tests
```

The client is served at <http://localhost:8092>. `make help` lists every target.

## Documentation

- **[Handbook](docs/handbook.md)** — setup, commands, architecture, testing
  conventions, the pipeline, and troubleshooting.
- **[Architecture decision records](docs/adr/)** — six decisions with their
  trade-offs: token storage, single-flight refresh, where the service layer
  stops, the permission mirror, the mock API, and runtime configuration.

## License

[MIT](LICENSE).
