# Handbook

The long-form documentation: setup, every command, the architecture and its
reasoning, testing conventions and the pipeline. The [README](../README.md) is
the short version; the [ADRs](adr/) record the decisions on their own.

A React 19 + TypeScript client for the Photos REST API (users, albums and photos,
JWT with a two-token model, flat RBAC). It uses **every** endpoint the API exposes,
follows SOLID, DRY and KISS, and ships with unit, functional and end-to-end tests
plus a CI/CD pipeline.

The project runs entirely in Docker, like the API it talks to.

---

## Stack

| Concern           | Choice                                                                    |
| ----------------- | ------------------------------------------------------------------------- |
| Runtime / build   | Node 24, Vite 7, React 19, TypeScript 5 (`strict`, no `any`)              |
| Routing           | React Router 7                                                            |
| Server state      | Redux Toolkit 2 + **RTK Query** (one API, one module per resource)        |
| Forms             | React Hook Form + Zod                                                     |
| Styling           | Bootstrap 5.3 compiled from SCSS; all application styles are SCSS         |
| Unit + functional | Vitest + React Testing Library + MSW                                      |
| End-to-end        | Playwright, against the real API                                          |
| Code style        | Prettier + ESLint (type-aware) + Stylelint, behind `cs-check` / `cs-fix`  |
| Container         | Multi-stage Dockerfile: Vite dev server locally, **Apache** in production |

---

## Requirements

- **Docker** (Engine 20.10+)
- **Docker Compose v2** — the `docker compose` plugin (with a space), _not_ the legacy `docker-compose` v1
- **Node 24** on the host, but only for the Playwright suite (it drives a real browser)

The API must be running and reachable — by default at `http://localhost:8084`.

---

## Getting Started

### 1. Initialize the project

```bash
make init
```

### 2. Configure your environment

`make init` copies `.env.example` to `.env`. Every variable it holds:

| Variable             | Default                 | What it does                                                                                                              |
| -------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `VITE_APP_NAME`      | `Photos Client`         | Product name in the navbar and browser tab                                                                                |
| `VITE_API_BASE_URL`  | `http://localhost:8084` | The API the client calls. Resolved **by the browser**, so it stays `localhost` even though the client runs in a container |
| `CLIENT_PORT`        | `8092`                  | Host port the dev server is published on (8084/8085 belong to the API stack)                                              |
| `PREVIEW_PORT`       | `8093`                  | Host port `make preview` serves the built bundle on                                                                       |
| `VITE_USE_POLLING`   | `0`                     | Set to `1` when your bind mount does not deliver file-watch events and HMR goes quiet                                     |
| `E2E_BASE_URL`       | `http://localhost:8092` | What Playwright opens                                                                                                     |
| `E2E_ADMIN_EMAIL`    | _(empty)_               | An account holding a role-managing role. Without it the RBAC end-to-end tests **skip** — see [Testing](#testing)          |
| `E2E_ADMIN_PASSWORD` | `secret123`             | That account's password                                                                                                   |

### 3. Run setup

```bash
make setup
```

It builds the image, starts the container, waits for the dev server and checks
that the API answers `GET /health`.

| Service            | URL                                                    |
| ------------------ | ------------------------------------------------------ |
| Client             | http://localhost:8092                                  |
| REST API           | http://localhost:8084                                  |
| Production preview | http://localhost:8093 (only while `make preview` runs) |

Register an account at `/register`. A fresh account has **no roles** — to see the
moderator/admin/super-admin screens, grant one from the API's console
(`make rbac-assign role=super_admin email=…` in the API project).

---

## Commands

Everything runs through the `Makefile` (`make help` prints this list). Targets run
**inside the container** unless marked otherwise.

### Lifecycle

| Command        | What it does                                                                    |
| -------------- | ------------------------------------------------------------------------------- |
| `make init`    | Create `.env` from `.env.example`                                               |
| `make setup`   | Build, start, and check the API is reachable                                    |
| `make up`      | Start the stack                                                                 |
| `make down`    | Stop and remove the stack                                                       |
| `make restart` | Restart the container                                                           |
| `make rebuild` | Rebuild the image and restart — after changing the `Dockerfile` or dependencies |
| `make logs`    | Follow container logs                                                           |
| `make sh`      | Interactive shell inside the container                                          |
| `make install` | `npm install` inside the container                                              |
| `make clean`   | Remove build output and caches                                                  |

You do **not** need a build step while developing: the container runs the Vite dev
server with HMR over a bind mount, so edits under `src/` appear immediately.

### Build and preview

| Command           | What it does                                                                  |
| ----------------- | ----------------------------------------------------------------------------- |
| `make build`      | Type-check and build the production bundle into `dist/`                       |
| `make preview`    | Build, then serve `dist/` on `PREVIEW_PORT` (8093) beside the dev server      |
| `make prod-build` | Build the deployable Apache image from the Dockerfile's `prod` stage _(host)_ |
| `make prod-run`   | Run that image on `PROD_PORT` (8092 by default) _(host)_                      |

`make prod-run` publishes 8092, which the dev stack also uses — run `make down`
first, or override: `make prod-run PROD_PORT=8094 PROD_API_URL=https://api.example.com`.

### Tests

| Command                | What it does                                               |
| ---------------------- | ---------------------------------------------------------- |
| `make test`            | The whole Vitest suite (unit + functional)                 |
| `make test-unit`       | Unit only — services, forms, transport, in isolation       |
| `make test-functional` | Functional only — whole pages against MSW                  |
| `make test-one file=…` | A single test file                                         |
| `make e2e-install`     | Install the Playwright browser — once per machine _(host)_ |
| `make test-e2e`        | The Playwright suite against the running stack _(host)_    |

### Quality gates

| Command          | What it does                                                            |
| ---------------- | ----------------------------------------------------------------------- |
| `make cs-check`  | Report style violations (Prettier + ESLint + Stylelint), change nothing |
| `make cs-fix`    | Reformat the whole codebase in one command                              |
| `make typecheck` | The TypeScript compiler in check-only mode                              |
| `make check`     | `cs-check` + `typecheck` + `test` — exactly what CI runs                |

---

## Docker Environment

One **multi-stage** [`Dockerfile`](../Dockerfile) — a single source of truth for the
environment:

| Stage   | Used by                              | What it contains                                                                             |
| ------- | ------------------------------------ | -------------------------------------------------------------------------------------------- |
| `base`  | —                                    | Node 24 + the installed dependencies                                                         |
| `dev`   | `docker-compose.yml` (`target: dev`) | The Vite dev server with HMR; your code is bind-mounted, `node_modules` comes from the image |
| `build` | `prod`                               | Runs `npm run build` to produce the static bundle                                            |
| `prod`  | CD pipeline (`target: prod`)         | Self-contained image: **Apache** serving the built bundle, no volumes                        |

The production image serves the SPA through Apache with `mod_rewrite`
(`FallbackResource /index.html`, so a deep link resolves client-side),
`mod_deflate` and a cache policy that treats fingerprinted assets as immutable
while never caching the shell.

**The API URL is injected at container start, not baked at build.** The
entrypoint writes `env.js` into the document root, the client reads
`window.__APP_CONFIG__` and falls back to Vite's build-time env — so the same
image runs against any environment:

```bash
make prod-build     # docker build --target prod -t photos-react-client .
docker run --rm -p 8092:80 -e VITE_API_BASE_URL=https://api.example.com photos-react-client
```

`make prod-run` is that `docker run` with the defaults filled in.

---

## Architecture

The layering mirrors the API's **Controller → Form Request → Service →
Repository → ActiveRecord**, translated to what a client actually has:

| API layer          | Client layer                                             | Location                                                                         |
| ------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Controller         | Route page + container hook                              | [`src/pages/`](../src/pages/), [`src/hooks/`](../src/hooks/)                     |
| Form Request       | Zod schema mirroring the API's own validators            | [`src/forms/`](../src/forms/)                                                    |
| Service            | Framework-free business logic (policy, query building)   | [`src/services/`](../src/services/)                                              |
| Repository         | RTK Query endpoints — **the only place that knows URLs** | [`src/repositories/`](../src/repositories/)                                      |
| ActiveRecord / DTO | Readonly DTOs mirroring the OpenAPI schemas              | [`src/types/`](../src/types/)                                                    |
| `models/contract/` | Interfaces, injected at the composition root             | [`src/contracts/`](../src/contracts/), [`src/app/store.ts`](../src/app/store.ts) |

```
src/
  app/            store, router, slices, typed hooks        (composition root)
  config/         runtime configuration (env.js ?? import.meta.env)
  contracts/      TokenStorage, PermissionChecker           (the DI seams)
  types/          DTOs + envelope, pagination, ApiError
  api/            transport: envelope, errors, re-auth
  repositories/   one module per resource, injected into one RTK Query API
  services/       PermissionService, AlbumPolicy, ListQueryBuilder, TokenStorage
  forms/          rules + schemas — the client's form requests
  hooks/          useAuth, usePermissions, useListQuery, useApiForm,
                  useMutationAction, useToggleSelection, useNotifications
  components/     layout/, guards/, ui/, and per-resource dialogs
  pages/          one folder per screen
  styles/         SCSS: variables → Bootstrap → our components
```

**A deliberate deviation.** The Service layer is used only where it carries
logic — permission evaluation, the album delete policy, list-query building,
token storage. Plain CRUD screens go page-hook → repository directly rather than
through a pass-through service that would add a file and no meaning. Adding one
anyway would satisfy the diagram at the cost of KISS.

The same rule cuts the other way: an abstraction with no caller is deleted, not
kept "in case". A schema no form used, a `PermissionService` method only its own
test called, an `expand` no list spec declared — all removed. What remains is
shared because something shares it: [`ListScreen`](../src/components/ui/ListScreen.tsx)
(the filter bar, table and pager every list wires up),
[`FormModal`](../src/components/ui/FormModal.tsx) (the shell every editing dialog
had spelled out), [`useMutationAction`](../src/hooks/useMutationAction.ts) (the
try/report/catch seven screens repeated), and
[`UserUpdateForm`](../src/components/users/UserUpdateForm.tsx) (one form for the
profile and the admin's view of an account).

### Transport

`fetchBaseQuery` is wrapped twice, in [`src/api/`](../src/api/):

- **Envelope** — every response is `{success, data, code}`; the transport strips
  it, so repositories and everything above them work with plain DTOs.
- **Errors** — HTTP, network and parse failures are normalised into one
  `ApiError { code, message, fieldErrors }`. A 422's `data.error` maps straight
  onto the offending form fields; a 409's message (a safety invariant refusing
  the operation) is shown verbatim.
- **Re-authentication** — on a 401 the transport refreshes once behind a mutex
  and replays the original request. The mutex matters: refresh tokens **rotate**
  and the API treats a re-used one as a leak, revoking the whole session — so two
  concurrent refreshes would sign the user out. A _rejected_ refresh ends the
  session and clears the cached server state; a _missing_ one does neither,
  because ending an already-ended session would reset the cache, re-fire every
  mounted query without a token, and arrive straight back here.

### Authorization

`GET /users/me/permissions` is the API's own answer to "what may this caller
do", and [`PermissionService`](../src/services/permissions.ts) mirrors the server's
`AccessControlService` on top of it: `can(permission)` for global permissions,
`canOn(ability, isOwn)` for the abilities ownership grants implicitly. Album
ownership is derived from `GET /users/me`, which carries the caller's albums —
the album list responses do not name an owner.

The UI only _hides_; the API re-checks every request and answers 403 regardless.

---

## Screens and endpoint coverage

All **33** operations are used. The `PATCH` aliases are skipped deliberately —
they are identical to `PUT`.

| Screen                                | Endpoints                                                            |
| ------------------------------------- | -------------------------------------------------------------------- |
| `/login`, `/register`                 | `POST /auth/login`, `POST /auth/register`                            |
| (transport)                           | `POST /auth/refresh`                                                 |
| Account menu                          | `POST /auth/logout`, `POST /auth/logout-all`                         |
| `/health` + footer badge              | `GET /health`                                                        |
| `/profile`                            | `GET /users/me`, `GET /users/me/permissions`, `PUT /users/{id}`      |
| `/albums`                             | `GET /albums/my`, `POST /albums`                                     |
| `/all-albums`                         | `GET /albums`, `POST /albums/{id}/restore`                           |
| `/albums/{id}`                        | `GET`, `PUT`, `DELETE /albums/{id}`, `GET\|POST /albums/{id}/photos` |
| `/albums/{id}/photos/{id}`            | `GET\|PUT\|DELETE /photos/{id}`                                      |
| `/users`                              | `GET /users`, `POST /users`                                          |
| `/users/{id}`                         | `GET`, `PUT`, `DELETE /users/{id}`                                   |
| `/users/{id}/roles`                   | `GET\|PUT /users/{id}/roles`                                         |
| `/roles`, `/roles/new`, `/roles/{id}` | `GET`, `POST /roles`, `GET\|PUT\|DELETE /roles/{id}`                 |
| `/permissions`                        | `GET /permissions`                                                   |

### What each role sees

Navigation is built from the caller's permissions, so nobody is shown a link that
would answer 403.

| Role            | Adds                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Base user**   | My albums (create, rename, delete), photos in them (upload, rename, delete), own profile                                                                      |
| **Moderator**   | All albums and Users; may **flag** any album for review (a soft delete, with an optional reason); full access to any photo                                    |
| **Admin**       | User CRUD and role assignment; sees the `is_deleted` / `delete_reason` columns and their filter; deletes albums **permanently** and **restores** flagged ones |
| **Super admin** | Composing roles from the permission catalog, and the catalog itself                                                                                           |

### The all-albums screen

`/all-albums` lists **every album in the system** (`album.index.any`). It is one
screen for two audiences, because what a caller may do there is a permission
question, not a routing one:

- A **moderator** sees the list and can **flag** an album for review. The deletion
  columns are hidden from them — a flagged album disappears from their view, so
  the columns would say nothing.
- An **admin** additionally sees the deletion state and its filter, deletes
  **permanently**, and can **restore** a flagged album.

Ownership still wins: your own album is always deleted permanently, whatever
roles you hold. That decision lives in
[`AlbumPolicy`](../src/services/albumPolicy.ts), not in the components.

### Photo uploads

`POST /albums/{id}/photos` is the API's only `multipart/form-data` endpoint. The
client enforces the same extension whitelist (`jpg, jpeg, png, webp, gif, avif`)
and shows a preview; the API has the final say, since it validates the actual
image content and converts every upload to WebP scaled to fit 500×500.

### Passwords

Create forms (registration, admin user-create) ask for a password **and its
confirmation** — a masked field cannot be proof-read, and a single typo would
otherwise produce an account nobody can sign in to.

Edit forms (profile, user detail) put the password behind a **"Change password"**
checkbox, and that checkbox is the only switch — for validation and for sending
alike:

| Checkbox | Password fields            | Validated?                      | Sent to the API? |
| -------- | -------------------------- | ------------------------------- | ---------------- |
| off      | empty                      | no                              | no               |
| off      | both filled, matching      | no                              | no               |
| off      | both filled, **different** | **no** — the form still submits | no               |
| on       | anything                   | length **and** match enforced   | yes              |

While unticked the inputs are not rendered at all, so a browser has nothing to
autofill: an account's password only ever changes because someone asked for it.

### Elsewhere in the UI

- **Breadcrumbs** on nested screens (album, photo, user, user roles, role editor),
  naming each record rather than repeating its id. The album's parent follows how
  you reached it — _My albums_ for your own, _All albums_ for someone else's.
- **List state lives in the URL.** Page, sorting and filters are query parameters,
  so a filtered list is linkable and the back button behaves.
- **Toasts** report the outcome of every mutation. Errors stay until dismissed —
  a 409 explains which safety rule refused the operation and is worth reading twice.

---

## The contract suite

`tests/contract/` checks the client against a **vendored copy of the API's own
OpenAPI document** rather than against a hand-written transcription of it. Three
things are asserted: the DTO field names and types in
[`src/types/`](../src/types/), through types generated from the document and
checked by `tsc`; every URL the client issues, read out of the repository and
transport sources; and each `ListSpec`'s filters and sortable whitelist.

```bash
make sync-spec       # refetch openapi.yaml from a running API, regenerate types
make test-contract   # see what moved
```

The copy is committed because CI has no API to ask. Two deliberate asymmetries
are encoded in the tests rather than left implicit: `POST /auth/refresh` is
issued by the transport, not a repository, and `/albums` offers a `user_id`
filter the client does not — an album list response carries no owner, so there
would be nothing to filter against.

## The published demo

`npm run build:demo` produces a build that starts
[the suite's own MSW handlers](../tests/mocks/handlers.ts) in a service worker
and answers every request in the browser. It is deployed to GitHub Pages by
[`pages.yml`](../.github/workflows/pages.yml), chained to a green CI exactly as
CD is.

The visitor is given the highest role, so the RBAC screens — which against the
real API would need an account nobody hands out — are explorable. Because it is
the same mock the tests run against, there is one fake to maintain and the demo
cannot drift from what the suite proves.

## Testing

Four suites. **411 Vitest tests** across 38 files (unit, contract and
functional) at **100% coverage — lines, branches, functions and statements** —
plus **21 Playwright specs**.

The project is developed **test-first**, and the 100% floor is enforced rather
than aspirational: an uncovered line fails the build on the commit that
introduced it, so there is no "we'll add tests later". New behaviour starts from
a failing test; a refactor starts from characterisation tests that must stay
green _without their assertions changing_; a bug fix starts from a test that
reproduces the bug.

```bash
make test              # every Vitest project
make test-unit         # services, forms, transport — in isolation
make test-contract     # the client against the API's OpenAPI document
make test-functional   # whole pages against MSW
make test-one file=tests/unit/services/albumPolicy.test.ts
make test-e2e          # Playwright, against the real API (host)
```

- **Unit** ([`tests/unit/`](../tests/unit/)) — services, form schemas, the error
  normaliser and the list-query serialiser. No React, no network.
- **Functional** ([`tests/functional/`](../tests/functional/)) — every page, plus
  the shared components and hooks, rendered with a real store and router against
  **MSW handlers written from the OpenAPI spec**. The mock re-implements the API's behaviour — the envelope, pagination,
  the RBAC gates, token rotation — rather than returning canned responses, so a
  test meets the same decisions the client will. Unhandled requests fail the test.
- **End-to-end** ([`tests/e2e/`](../tests/e2e/)) — Playwright against the **real**
  API. [`smoke.spec.ts`](../tests/e2e/smoke.spec.ts) covers a base user's whole
  journey: register, create an album, upload a photo, rename it, delete both,
  sign out. [`privileged.spec.ts`](../tests/e2e/privileged.spec.ts) covers the RBAC
  screens, including a moderator flagging an album for review and an admin
  seeing the flag and restoring it. [`styling.spec.ts`](../tests/e2e/styling.spec.ts)
  asserts the handful of behaviours that only exist once the stylesheet is
  loaded — hover contrast, and the account menu's open state — which the other
  suites run without any CSS and so cannot see. Each run registers its own
  accounts, so no database reset is needed.

Run the Playwright suite once per machine after installing its browser:

```bash
make e2e-install
make up && make test-e2e
```

The privileged tests need an account that already holds a role-managing role — a
role cannot be granted over HTTP without one. Appoint it from the API's console
and point `E2E_ADMIN_EMAIL` at it; without it they skip rather than pretend to
have run.

```bash
# in the API project
make rbac-assign role=super_admin email=you@example.com
# here, in .env
E2E_ADMIN_EMAIL=you@example.com
```

Coverage thresholds are **100** on every metric, enforced in
[`vitest.config.ts`](../vitest.config.ts). Only files with no executable logic of
their own are excluded — the entry point that mounts the app, the type
declarations and the `index.ts` barrels. The router and the app root are _not_
excluded: the route table and its permission gates are real logic, and
[`tests/functional/routing.test.tsx`](../tests/functional/routing.test.tsx) covers
them.

Reaching 100% is a design constraint, not a chore. A branch no test can take is
usually a branch nothing can take, and the honest answer is to delete it rather
than to silence the report — which is why `hasAllowedImageExtension` uses
`lastIndexOf`, why a `select` filter's `options` are required by its type, and
why an account's `albums` stopped being optional. Exactly one `/* v8 ignore */`
exists in the codebase, on a fallback TypeScript demands but a rejected parse
can never reach; it carries a comment saying so.

> **Note on the test environment.** jsdom has no `fetch`, so requests go through
> Node's — which rejects jsdom's `AbortSignal`, `File` and `FormData` as foreign.
> [`tests/environment/jsdomWithNodeFetch.ts`](../tests/environment/jsdomWithNodeFetch.ts)
> keeps the DOM but restores those globals, which is what lets the functional
> suite exercise the real transport instead of a stubbed one.

---

## Code Style

Prettier, ESLint (type-aware) and Stylelint, behind two commands that mirror the
API's `cs-check` / `cs-fix`:

```bash
make cs-check   # show violations, change nothing
make cs-fix     # reformat the whole codebase in one command
```

## Static Analysis

The TypeScript compiler in check-only mode — `strict`, plus
`noUncheckedIndexedAccess`, `noImplicitReturns` and friends. No `any`.

```bash
make typecheck
make check      # cs-check + typecheck + test, exactly what CI runs
```

---

## Styling

Bootstrap 5.3 is **compiled from its SCSS sources**, so the framework itself is
built from our variables rather than overridden after the fact
([`src/styles/_variables.scss`](../src/styles/_variables.scss) is loaded first, then
Bootstrap, then our own components). All application styles are SCSS too; there
is no other stylesheet language in the project. Bootstrap's JavaScript is
deliberately not used — it manipulates the DOM directly, which fights React for
ownership of the same nodes, and the CSS is the part that carries the design.

Two overrides exist because Bootstrap derives colours with `color-contrast()`,
which falls back to black when white would not clear its 4.5 threshold: our red
scored 4.38, so `.btn-outline-danger` had unreadable black text on a red fill
([`components/_buttons.scss`](../src/styles/components/_buttons.scss)), and the
dropdown's hover tint was two values away from its own background
([`_variables.scss`](../src/styles/_variables.scss)).

Class names say what they are: `.appCard` is a panel, `.dataTable` is a table,
and both take their surface from the one `app-card-surface` mixin so the two
cannot drift. There are no inline `style` attributes — a width belongs in the
stylesheet with the rest of the design.

---

## Continuous Integration & Delivery

- **CI** ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) — on every push
  and pull request, the same three gates as locally and in the same order: code
  style, static analysis, tests (with coverage). A second job runs the Playwright
  suite; since the API is not part of this repository, it is **skipped unless the
  `E2E_API_URL` repository variable is set**, and is otherwise run locally with
  `make test-e2e`.
- **CD** ([`.github/workflows/cd.yml`](../.github/workflows/cd.yml)) — chained to a
  green CI on `master`. It builds the `prod` stage with Buildx and smoke-tests
  the real image: Apache serves the shell, falls back to it for a client-side
  route, and the entrypoint injected the API URL. The release then runs through a
  `production` GitHub Environment, but is **simulated** — this sample provisions
  no server.

---

## Troubleshooting

| Symptom                                             | Cause and fix                                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Login fails, footer badge reads **API unavailable** | The API is not running. Start it, then check `curl http://localhost:8084/health`                                               |
| `429` / "Too many attempts" on sign-in              | The API rate-limits auth per IP (5/minute). Wait out the window, or raise `LOGIN_RATE_LIMIT_ATTEMPTS` in the API's environment |
| `make up` fails with a port already allocated       | 8092 or 8093 is taken. Change `CLIENT_PORT` / `PREVIEW_PORT` in `.env`                                                         |
| A new dependency is missing inside the container    | `node_modules` lives in a named volume, not the bind mount — run `make rebuild`                                                |
| HMR does not pick up edits                          | Set `VITE_USE_POLLING=1` in `.env` and `make restart`                                                                          |
| `make test-e2e` cannot launch a browser             | Run `make e2e-install` once per machine                                                                                        |
| The RBAC end-to-end tests all skip                  | `E2E_ADMIN_EMAIL` is unset — see [Testing](#testing)                                                                           |
| `make prod-run` fails with a port conflict          | The dev stack holds 8092. `make down` first, or `make prod-run PROD_PORT=8094`                                                 |

---

## Project Structure

```
├── .github/workflows/  # CI (cs-check, typecheck, tests) + CD (build image, deploy)
├── Dockerfile          # Multi-stage image: base → dev → build → prod (Apache)
├── .dockerignore       # Allow-list build context
├── docker-compose.yml  # Local dev stack (Vite dev server + preview port)
├── docker/apache/      # Production vhost + the entrypoint that writes env.js
├── index.html          # The shell; loads /env.js before the bundle
├── public/env.js       # Runtime-config stub, overwritten in the production image
├── src/                # Application code (see Architecture)
├── tests/
│   ├── unit/           # Layers in isolation (services, forms, transport)
│   ├── functional/     # Pages, components/ and hooks/ against MSW
│   ├── e2e/            # Playwright against the real API
│   ├── mocks/          # MSW handlers, their gates, and the state behind them
│   ├── environment/    # jsdom with Node's fetch globals
│   └── utils/          # renderWithProviders, checkerFor
├── .env.example        # Every environment variable, documented above
├── vite.config.ts      # Build, dev server, preview, SCSS options
├── vitest.config.ts    # Two test projects + the 100% coverage thresholds
├── playwright.config.ts
├── eslint.config.js    # Type-aware linting, with its exceptions justified
├── .prettierrc.json / .stylelintrc.json
├── tsconfig.json       # Solution file → tsconfig.app.json + tsconfig.node.json
├── init.sh             # First-time project initialization
├── setup.sh            # Build, start, and check the API is reachable
├── Makefile            # Every command (make help)
└── CLAUDE.md           # The deeper "why" behind each layer, for AI assistants
```

For the reasoning behind the architecture — why the transport refreshes behind a
mutex, why the test environment is custom, why each lint exception exists — see
[`CLAUDE.md`](../CLAUDE.md). The repository is also indexed with
[CodeGraph](https://github.com/colbymchenry/codegraph) (`.codegraph/`, local and
gitignored) for symbol lookup and impact analysis.
