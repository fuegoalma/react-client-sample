# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React 19 + TypeScript single-page client for a REST API of **users, albums and photos**, with JWT authentication (a two-token model: stateless access token + revocable, rotating refresh token) and flat, role-based access control. Everything runs inside Docker (Compose **v2** — invoke it as `docker compose`, with a space, not the legacy `docker-compose`); all npm/tooling commands go through `docker compose exec client` via the `Makefile` shortcuts below (e.g. `make test`, not `npm test`).

The client is served at **http://localhost:8092**; the API it talks to lives at **http://localhost:8084** and documents itself with Swagger UI at **http://localhost:8084/docs** — that spec is the source of truth for every request and response shape, and is what the mock API in `tests/mocks/` is written from. The API must be running for anything past the login screen to work.

The local stack is the **Vite dev server with HMR** behind a bind mount, so editing anything under `src/` is picked up immediately — `make rebuild` is only needed when the image itself changes (`Dockerfile`, `package.json`, `docker-compose.yml`). The environment is one multi-stage `Dockerfile` (`base` → `dev` / `build` → `prod`); the CD pipeline builds the self-contained `prod` stage, which serves the compiled bundle from **Apache**, not Node.

**The API URL is never baked into the bundle.** The production image's entrypoint writes `env.js` into the Apache document root at container start and the client reads `window.__APP_CONFIG__` from it (`src/config/index.ts`), falling back to Vite's build-time env in development. One built image therefore runs against any environment — see **Runtime configuration**.

## Codebase Navigation (CodeGraph) and rtk — mandatory tooling

**The hard rule: in any task that touches this codebase, the first tool call that looks for code is a `codegraph` call.** Not `Grep`, not `Glob`, not `Read`, not `find`. If your opening move on a task is `grep -rn "something" src/`, you have already broken this rule — stop and run the `codegraph` equivalent from the table below instead. This applies to exploration, planning and implementation alike; "I was only orienting myself" is not an exception, it is exactly the case CodeGraph exists for.

This repo has a [CodeGraph](https://github.com/colbymchenry/codegraph) index (`.codegraph/`, local-only, gitignored). Pick the command by the question you actually have:

| Your question                          | Command                             |
| -------------------------------------- | ----------------------------------- |
| Where is `X`? Does `X` exist?          | `codegraph query "X"`               |
| How does area/feature Y work?          | `codegraph explore "Y"`             |
| Show me `X` with its neighbours        | `codegraph node X`                  |
| Who calls `X`? / what does `X` call?   | `codegraph callers X` / `callees X` |
| What breaks if I change `X`?           | `codegraph impact X`                |
| Which tests cover these changed files? | `codegraph affected <files...>`     |
| Is the index current?                  | `codegraph status`                  |

Two of these are **required at specific moments**, not optional conveniences:

- **`codegraph impact <symbol>` before editing anything shared** — `PermissionService`, any policy in `src/services/`, `useApiForm`, `useListQuery`, `baseApi`, `DataTable`, a contract in `src/contracts/`, a type in `src/types/`. It answers "what else did I just change" in one call.
- **`codegraph affected <files...>` after a batch of edits, before running tests** — it names the suites that actually cover the change, so a targeted run comes first and `make check` only confirms.

Run `codegraph sync` after a batch of edits so later lookups reflect the current code.

**What `Read`/`Grep` are still for.** CodeGraph replaces the _searching_, not the reading: once you know the file and line, `Read` it and `Edit` it normally. `Grep` remains correct for things that are not symbols — a string literal in a test, a CSS class name, a value in `.env`/`Makefile`/YAML, or a textual sweep across non-indexed files.

**The exception is bounded, and you must say it out loud.** Falling back to `grep`/`find`/whole-file reads for a _symbol_ question is allowed only when: (a) `codegraph status` reports the index stale **and** `codegraph sync` fails; (b) the command errors or returns nothing for a symbol you can prove exists; or (c) the target genuinely is not an indexed symbol (see the previous paragraph). In cases (a) and (b) **state in your reply which command you tried and what it returned** before using the direct tool. An unexplained `grep` for a symbol is a violation, not a shortcut — silent fallback is what makes this rule fail in practice.

**rtk** (Rust Token Killer, see `~/.claude/RTK.md`) is the token-optimized proxy for everyday dev/CLI operations — a Claude Code hook transparently rewrites commands (e.g. `git status` → `rtk git status`), so it applies by default at zero effort, but meta commands (`rtk gain`, `rtk discover`, `rtk proxy <cmd>`) must be invoked directly. Only fall back to the raw command (`rtk proxy <cmd>`) when rtk can't handle the case.

**All code MUST follow SOLID, DRY, and KISS.** Non-negotiable for every change: no duplicated logic (extract shared code into components, hooks or services — including in tests), depend on the interfaces in `src/contracts/` rather than concretions, keep each module to a single responsibility, and prefer the simplest design that works. Do not add an abstraction for a hypothetical future need — see **the deliberate deviation** under Architecture for what that means here in practice. When touching code that violates these principles, fix the violation rather than extending it.

## Commands

All tooling runs inside the `client` container; use the `Makefile` shortcuts (`make help` lists them all) rather than typing `docker compose exec client ...` by hand:

```bash
# First-time setup
make init          # creates .env from .env.example
make setup         # builds + starts the container, waits for the dev server, checks the API's /health

# Docker lifecycle
make up / down / restart
make rebuild       # rebuild the image (after changing the Dockerfile or dependencies)
make logs          # follow container logs
make sh            # interactive shell inside the container
make install       # npm install inside the container

# Build
make build         # tsc --build + vite build (the production bundle)
make build-demo    # the MSW-backed demo bundle published to GitHub Pages
make preview       # serve the built bundle

# Tests (Vitest: three projects — unit, contract and functional)
make test                                   # all three
make test-coverage                          # the same, with the 100% thresholds enforced
make test-unit
make test-contract                          # the client against the API's OpenAPI document
make test-functional
make test-one file=tests/unit/services/albumPolicy.test.ts

# Code style (Prettier + ESLint + Stylelint)
make cs-check      # report violations, change nothing
make cs-fix        # reformat the whole codebase in one command

# Static analysis (TypeScript in check-only mode)
make typecheck
make size          # the built bundle against its budget
make check         # cs-check + spec-verify + typecheck + build + size + test-coverage — what CI runs
make clean         # remove build output and caches

# The UI kit, the API contract and the README's screenshots
make storybook       # the component workshop on :6006 (host)
make build-storybook
make sync-spec       # refetch openapi.yaml from a running API, regenerate its types
make spec-verify     # the offline half: do the committed types match the committed spec?
make screenshots     # regenerate the README screenshots from the running stack (host)
```

**Playwright runs on the host, not in the container**, because it drives a real browser:

```bash
make e2e-install   # install the Chromium build — once per machine
make test-e2e      # sources .env, then runs the suite against the running stack
```

`make test-e2e` needs `make up` first (it drives the real client against the real API). Adding a new recurring command should get a `Makefile` target rather than being typed out in full each time; the npm scripts behind the targets live in `package.json` and must keep working directly too, because **CI calls the npm scripts, not `make`**.

## Architecture

The layering deliberately mirrors the API's own **Controller → Form Request → Service → Repository → ActiveRecord**, translated to what a client actually has:

| API layer               | Client layer                                                          | Location                             |
| ----------------------- | --------------------------------------------------------------------- | ------------------------------------ |
| Controller              | Route page + container hook (orchestration; no business rules)        | `src/pages/`, `src/hooks/`           |
| Form Request (write)    | Zod schema mirroring the API's own validators                         | `src/forms/schemas.ts`               |
| Form Request (search)   | `ListSpec` — the resource's filters + sortable whitelist              | `src/forms/listSpecs.ts`             |
| Service                 | Framework-free business logic (policy, query building, token storage) | `src/services/`                      |
| Repository              | RTK Query endpoint definitions — **the only place that knows URLs**   | `src/repositories/`                  |
| ActiveRecord / DTO      | Readonly DTO types mirroring the OpenAPI schemas                      | `src/types/`                         |
| `models/contract/` + DI | Interfaces, injected at the composition root                          | `src/contracts/`, `src/app/store.ts` |

```
src/
  app/            store, router, slices, typed hooks        (composition root)
  config/         runtime configuration (env.js ?? import.meta.env)
  contracts/      TokenStorage, PermissionChecker           (the DI seams)
  types/          DTOs + envelope, pagination, ApiError, ListQuery
  api/            transport: envelope unwrap, error normalisation, re-auth
  repositories/   one module per resource, all injected into one RTK Query API
  services/       PermissionService, one policy per resource, ListQueryBuilder, TokenStorage
  forms/          rules + schemas + listSpecs — the client's form requests
  hooks/          useAuth, usePermissions, useListQuery, useApiForm,
                  useNotifications, useMutationAction, useToggleSelection
  components/     layout/, guards/, ui/, and per-resource dialogs
  pages/          one folder per screen
  styles/         SCSS: our variables → Bootstrap → our components
```

**The deliberate deviation — do not "fix" this.** The Service layer is used **only where it carries logic**: permission evaluation, the per-resource policies, list-query building, token storage. A screen with no rules of its own goes page-hook → repository directly. Inserting a pass-through service that only forwards a call would satisfy the diagram and add a file with no meaning — which is exactly what KISS forbids. If you add a service, it must decide something.

**Business rules never live in a page.** A page orchestrates: it reads a policy, calls a repository, renders. The moment a screen spells out an ability string, compares the caller's id, or reads `is_system` to decide what to offer, that rule belongs in the resource's policy service — where it is asserted once instead of re-derived per screen.

**Dependency injection is confined to the composition root.** `createAppStore({ tokenStorage })` in `src/app/store.ts` is where the one runtime dependency is injected; tests pass `InMemoryTokenStorage` there. `PermissionService` and the four policies are _pure_ — constructed from data by `usePermissions()` on every render — so they need no container at all. There is deliberately no `ServicesProvider`.

**Barrel files.** Each layer has an `index.ts` re-exporting its public surface; import from `@/components`, `@/services`, `@/forms`, `@/hooks` rather than reaching into individual files. Because a barrel hides how widely a symbol is used, run `codegraph impact <symbol>` before changing anything one of them re-exports. The path aliases are `@/*` → `src/*` and `@tests/*` → `tests/*`, declared in `tsconfig.app.json` (as `./src/*`, with no `baseUrl` — that option is deprecated in TypeScript 7) and mirrored in `vite.config.ts` and `vitest.config.ts`. **All three must agree.**

### Transport (`src/api/`)

`fetchBaseQuery` is wrapped twice. Nothing above this layer knows the API wraps its payloads or how a 401 is recovered from.

- **`baseQuery.ts`** — attaches `Authorization: Bearer <accessToken>` from the store, then strips the API's `{success, data, code}` envelope so repositories see plain DTOs. A `204` arrives as `null` and passes through untouched.
- **`errors.ts`** — normalises every failure (HTTP, network, parse) into one `ApiError { code, message, fieldErrors, retryAfter? }`. A 422's `data.error` becomes `fieldErrors` (only entries that actually look like message lists — a `YII_DEBUG` stack trace under the same key is dropped, and an empty array is not a field error). Yii's generic _"An error occurred during execution"_ is replaced with a status-specific message a user can act on; a _meaningful_ server message — a 409 explaining which safety invariant refused the operation — is kept verbatim and must stay that way.
- **`baseQueryWithReauth.ts`** — on a 401, refreshes once and replays the original request. **The mutex is load-bearing:** refresh tokens _rotate_ and the API treats a re-used one as a leak, revoking the whole session — so two concurrent refreshes would sign the user out. Every request waits on `refreshMutex` before firing and while a refresh is in flight. Requests to `/auth/*` are never retried (a 401 there means bad credentials).

  **A refresh has three outcomes, not two, and the distinction is load-bearing.** `refreshSession` returns `'refreshed'`, `'rejected'` or `'no-session'`. A _rejected_ refresh dispatches `loggedOut()`, which clears the token storage and resets the RTK Query cache. A _missing_ session must do neither: ending an already-ended session re-dispatches `loggedOut()`, the reset re-fires every mounted query without a token, each 401s, and the transport arrives back here — a live-lock. This was a real bug; it made signing out untestable and is why `useAuth.signOut()` navigates rather than leaving screens mounted.

### Authentication

The token pair is the only auth state in Redux (`src/app/authSlice.ts`); the profile and permissions are server state and live in the RTK Query cache. Persistence goes through the `TokenStorage` contract, injected at the store — the store never touches `localStorage` itself.

**Why localStorage:** the API returns the refresh token in the JSON body, so an httpOnly cookie is not available to us. The XSS trade-off is accepted, documented, and confined to `LocalStorageTokenStorage` — changing the strategy means one new implementation of the contract and nothing else. The implementation swallows storage exceptions (private-mode browsers throw) so a failure degrades to an in-memory session rather than breaking sign-in.

`useAuth()` is the session's public surface. Signing out is **best-effort by design**: the API's logout is idempotent, and the local session must end even if the request fails, so the token is always dropped locally regardless of the response.

**`signOut(everywhere?)` navigates, and that is part of signing out — not an extra each screen remembers.** Ending the session resets the RTK Query cache, so any screen left mounted would immediately re-issue its queries without a token. The navbar and the profile screen both call it; neither owns a copy of the sequence.

### Authorization (RBAC)

`GET /users/me/permissions` is the API's own answer to "what may this caller do", and `PermissionService` (`src/services/permissions.ts`) mirrors the server's `AccessControlService` on top of it:

- `can(permission)` — a global permission, e.g. `user.index.any`.
- `canOn(ability, isOwn)` — granted when a role carries the `.any` variant **or** the caller owns the subject and the ability is in `OWN_ABILITIES` (own album/photo/profile — what a base user gets with no roles at all).

`OWN_ABILITIES` deliberately excludes `user.view`, `user.delete` and every `*.index`, matching the server: those are role-only even on your own records. Each action checks **only its own** permission, so a custom role of just `photo.delete.any` can delete any photo without being able to view one — keep it that way. The two catalogs are `PERMISSIONS` (global names, `<resource>.<action>.any`) and `ABILITIES` (the per-record names `canOn` takes); `OWN_ABILITIES` is built _from_ `ABILITIES` so the two cannot drift. **Never spell an ability or permission inline** — a bare `'photo.update'` in a component is exactly the drift these catalogs exist to prevent.

**Ownership is derived, not returned.** Album list responses carry no owner, so `usePermissions()` builds a set of owned album ids from `GET /users/me` (which includes the caller's albums) and exposes `ownsAlbum(id)`. This is also why the all-albums screen has no owner column and no owner filter — there is nothing in the response to render or filter on. A photo's ownership **is its album's** — `GET /photos/{id}` returns no album reference, which is why photos are routed under their album.

**One policy per resource that has rules**, each pure, each constructed from the `PermissionChecker` and exposed by `usePermissions()` as `albums` / `photos` / `users` / `roles`. They are the client's counterpart to the API's per-resource services, and they are where a rule goes instead of into a page:

- `AlbumPolicy` (`albumPolicy.ts`) owns the genuinely tricky one: `DELETE /albums/{id}` is a single route with two outcomes. `deleteMode(isOwn)` returns `'permanent'` for the owner or a holder of `album.delete.any`, `'soft'` for `album.soft-delete.any`, and `null` otherwise — **permanent wins when a role has both**, exactly as server-side. `showsDeletionState()` gates the `is_deleted`/`delete_reason` columns and their filter on being able to _act_ on a flagged album; a moderator, who can only flag one and then never sees it again, is deliberately not shown them. `albumsCrumb(isOwn)` answers where an album screen's trail points back to — the caller's own list, the all-albums screen, or a label with no link when they may view an album without being able to list any. It lives here because the album screen and the photo screen beneath it need the same answer, and once did not agree: the photo screen offered an "All albums" link that answered 403.
- `PhotoPolicy` (`photoPolicy.ts`) — `canView`/`canUpload`/`canUpdate`/`canDelete`, all on the **album's** ownership.
- `UserPolicy` (`userPolicy.ts`) — takes the caller's id, so `isSelf()` and the ownership asymmetry live in one place: `user.update` is ownership-granted, `user.view` and `user.delete` are not.
- `RolePolicy` (`rolePolicy.ts`) — a system role may be **re-composed but never renamed or deleted**, so `canRecompose()`, `canRename(role)` and `canDelete(role)` are three different answers about the same role.

**Anti-escalation and the last-role-manager invariant stay server-only** — not an oversight: `GET /roles` returns name and description without permission sets, so the client cannot tell which roles carry `role.manage`. Both are surfaced from the API's own 403/409 wording instead.

Route guards are `RequireAuth` and `RequirePermission anyOf={[...]}` (`src/components/guards/`), applied as layout routes in `src/app/router.tsx`. **The UI only hides** — the API re-checks every request and answers 403 regardless, so a hand-typed URL gains nothing.

### Forms and validation

`src/forms/rules.ts` holds the primitives (name, email, password, title, role name) mirroring the API's validators; `schemas.ts` composes them per form. Client-side rules exist to reject what the server would reject anyway — the server still owns what the client cannot check (email uniqueness, unknown permission names, the last-role-manager invariant).

`useApiForm(schema, defaultValues, values?)` (`src/hooks/useApiForm.ts`) is the bridge. Form state is typed by the schema's _input_ and `handleSubmit` receives its _output_, so a schema can trim or default on the way through. `applyApiError(error)` projects a failed request onto the form: 422 field errors land on their inputs, anything else becomes a form-level message under `root`. The optional third argument is React Hook Form's `values` — use it for a form whose subject loads asynchronously. **Do not reset from an effect instead:** that lands _after_ the field is on screen and can overwrite a value the user has already begun typing (this was a real bug).

**Passwords.** Create forms (register, admin user-create) ask for `password` + `password_confirm` and reject a mismatch on the confirmation field. Edit forms (profile, user detail) add a `change_password` checkbox, and **that checkbox is the only switch, for validation and for sending alike**:

| Checkbox | Password fields            | Validated?                      | Sent? |
| -------- | -------------------------- | ------------------------------- | ----- |
| off      | empty                      | no                              | no    |
| off      | both filled, matching      | no                              | no    |
| off      | both filled, **different** | **no** — the form still submits | no    |
| on       | anything                   | length **and** match enforced   | yes   |

The `superRefine` returns immediately while the flag is off, and `toUserPayload()` ignores the password on the same condition — one flag read in two places, so they cannot disagree and send an unvalidated password. While unticked the inputs are **not rendered at all**, so a browser has nothing to autofill. `toUserPayload()` is also the only place that decides which keys become request attributes: `password_confirm` and `change_password` are form state and never leave it.

**Both account-edit screens submit the same form.** `UserUpdateForm` (`src/components/users/UserUpdateForm.tsx`) is `PUT /users/{id}` as a component; `/profile` and `/users/{id}` differ only in the subject, the id prefix and the confirmation message. `EMPTY_USER_UPDATE_VALUES` (`src/forms/rules.ts`) is the blank state — it is both the form's initial value and what a successful save resets to, so the two cannot drift.

**`FormAlert` takes the field error, not its message.** `<FormAlert error={errors.root} />` — reaching into `.message` at each call site was one optional access written out once per form, and each one an untested branch.

### Routing and screens

The route table is `src/app/router.tsx`; permission gates are declared once per audience as layout routes rather than repeated inside screens. **All 33 API operations are used** (the `PATCH` aliases are skipped deliberately — they are identical to `PUT`):

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

**`/all-albums` is one screen for two audiences.** What a caller may do there is a permission question, not a routing one: a moderator sees every album and _flags_ one for review (soft delete, optional reason); an admin additionally sees the deletion-state columns and filter, deletes permanently, and restores. Ownership still wins — your own album is always deleted permanently. Do not split this into two routes.

**Photos are nested under their album** (`/albums/:albumId/photos/:photoId`) even though the API's member endpoints are flat, because `GET /photos/{id}` returns no album reference — without `albumId` in the path the client cannot tell whether the caller owns the photo, which is what its base abilities depend on.

**List screens** all share `useListQuery()` (`src/hooks/useListQuery.ts`), which keeps page, sort and filters **in the URL** so a filtered list is linkable and the back button works. It takes the resource's **`ListSpec`** (`src/forms/listSpecs.ts`) — the client's `*SearchForm`, declaring that resource's filters, its `sortable` whitelist and its default order in one place, transcribed from the OpenAPI spec and asserted against it in `tests/unit/forms/listSpecs.test.ts`. A `sort` attribute outside the whitelist is **dropped** rather than sent (the sort comes from a user-editable URL, and the API 422s an unknown one), falling back to the default order. `AllAlbumsPage` composes its spec with `withFilter(albumListSpec, ALBUM_DELETION_FILTER)`; the hook memoises on the _serialised_ form of the spec, so the resolved `ListQuery` stays referentially stable and RTK Query does not see a new request every render. `ListQueryBuilder` (`src/services/listQuery.ts`) is the single serialiser for `page`, `per_page`, `sort` (`-` prefix = descending), `expand` and filters — it drops untouched filters and clamps `per_page` to 1–100, which the API 422s outside. `ListSpec` itself declares no `expand`: no resource needed one, and carrying the plumbing for a case with no caller is exactly the speculative generality KISS forbids.

**A list screen is `ListScreen`, not four components wired together by hand.** `src/components/ui/ListScreen.tsx` owns the `FilterBar` + `QueryBoundary` + `DataTable` + `PaginationBar` arrangement that every list repeated identically; a screen supplies its `list`, the query `result`, its columns and its wording, and nothing else. `AlbumDetailPage`'s photo grid deliberately stays outside it — that is a `photoGrid`, not a table.

### UI conventions

- **Dialogs mount only while open.** `AlbumFormDialog`, `PhotoUploadDialog`, `UserFormDialog` and `AlbumDeleteDialog` return `null` when closed and render an inner component otherwise, so each open starts from fresh form state. Do not reintroduce a resetting effect.
- **Bootstrap's JavaScript is deliberately unused.** It manipulates the DOM directly, which fights React for ownership of the same nodes and makes dialogs awkward to assert on. `Modal`, `ConfirmDialog` and the navbar dropdown are React components using Bootstrap's markup and CSS only; the account menu implements its own outside-click and Escape dismissal.
- **One modal shell, one form shell.** `Modal` owns the backdrop, the centring and Escape dismissal; `ConfirmDialog` is built _on_ it rather than repeating it. `FormModal` adds the header, the Cancel/submit footer and the `<form>`, so an editing dialog declares its fields and its wording only.
- **Mutations report through `useMutationAction`.** `run(promise, { success, failure, onDone })` replaced the same try/await/toast/catch written out in seven screens. The wording stays at the call site — only the shape is shared — and `failure` is a fallback: a meaningful server message, such as a 409 naming the invariant that refused, still reaches the user verbatim.
- **A selection being edited is `useToggleSelection`.** It starts from what the server says and becomes local state only once touched, so a refetch never overwrites an edit in progress. The role composer and the role assignment screen share it.
- **Breadcrumbs appear on nested pages only** (album, photo, user, user roles, role editor) via `PageHeader`'s `breadcrumbs` prop. Pages supply their own trail because only they know a record's name. The album's parent depends on the caller: _My albums_ when owned, _All albums_ when they can list all, and **no link at all** otherwise — a crumb that answers 403 is worse than none.
- **Shared list furniture** is `ListScreen` and the pieces it composes: `DataTable` (columns describe their own sort attribute), `FilterBar` (applies on submit, not per keystroke — the API paginates server-side), `PaginationBar` and `QueryBoundary` (the loading / error / empty triad, so no screen invents its own spinner or error copy). `SearchField` is the filter bar's look for a screen filtering a list it already holds — the permission catalogue — where a URL round trip would buy nothing.
- **Small shared pieces, each with one job:** `Spinner` (the one waiting indicator, used by `QueryBoundary` and `RequirePermission`), `PhotoFrame` (the image-or-placeholder, used by the tile and the detail screen), `AlbumDeleteButton` (turns an `AlbumDeleteMode` into the right colour and verb, so a permanent delete is never dressed as a review flag on one screen and not another).
- **Toasts** live in `notificationsSlice` so any layer can raise one — including the transport's re-auth failure path. Each toast owns its own dismissal timer; the stack is `pointer-events: none` and anchored bottom-right, because it previously intercepted clicks meant for the page header.

### Styling

All styles are **SCSS**; there is no other stylesheet language in the project. Bootstrap 5.3 is **compiled from its SCSS sources**, so the framework is built _from_ our variables rather than overridden after the fact. Import order in `src/styles/main.scss` is load-bearing:

```scss
@import 'variables'; // our overrides FIRST
@import 'bootstrap/scss/bootstrap'; // ...so Bootstrap compiles from them
$bootstrap-icons-font-dir: 'bootstrap-icons/font/fonts'; // before the icon font
@import 'bootstrap-icons/font/bootstrap-icons';
@import 'mixins';
@import 'base';
@import 'components/…'; // ours last
```

The icon-font variable must be set between the two: the package ships a `./fonts` URL relative to _its own_ stylesheet, which would otherwise resolve against `main.scss` and leave the fonts unhashed and unemitted.

Two contrast fixes exist for the same reason and should not be reverted. Bootstrap picks button and dropdown colours with `color-contrast()`, which falls back to black when white would not clear its 4.5 threshold; our red scores 4.38, so `.btn-outline-danger` got unreadable black text on a red fill — `src/styles/components/_buttons.scss` forces white. Separately, the dropdown's hover tint resolved to `#f8f9fa` against a menu background of `#f6f7f9`, an invisible two-value difference — `_variables.scss` lifts the menu onto white and tints the hover with the brand colour. **`.btn-outline-success` and `.btn-outline-info` still have the original defect**, left in place by an explicit decision; the same one-line override extends to them if wanted.

Class names are camelCase blocks with BEM-ish modifiers (`.photoCard__title`, `.healthBadge--ok`), enforced by `selector-class-pattern` in `.stylelintrc.json`.

**`.appCard` is the panel; `.dataTable` is the table.** Both take their surface from the one `app-card-surface` mixin, so they cannot drift apart — but a `<section>` or a `<form>` is not a table, and marking one `.dataTable` made the class lie about its content. Anything that is a panel gets `.appCard`.

**No inline `style` attributes.** A width or a colour belongs in SCSS where the rest of the design lives; the navbar's own max-width is `.appNavbar__inner`, not a `style={{ … }}` on the element.

### Runtime configuration

`src/config/index.ts` resolves `window.__APP_CONFIG__` (written by the production entrypoint into `env.js`) first, then `import.meta.env`, then a default. `public/env.js` is an empty stub in development. This is what lets one built image be pointed anywhere:

```bash
make prod-run PROD_API_URL=https://api.example.com
```

Never read `import.meta.env` directly outside `src/config/` — a value baked at build time cannot be changed at deploy time.

## Testing Conventions

Four suites, mirroring the API's own split plus a contract suite. **451 Vitest tests** across 44 files (unit, contract, functional) at **100% coverage — lines, branches, functions and statements alike** — plus **24 Playwright specs**.

**Work test-first.** The 100% floor is enforced, not aspirational, so there is no "add tests later": an uncovered line fails the build on the commit that introduced it. Which form of test-first depends on what you are doing:

1. **New behaviour** — write the test against the module that does not exist yet, watch it fail, then implement.
2. **Refactoring** — write characterisation tests first where coverage is thin, get them green on the _old_ code, then refactor. **The assertions must not change.** If a test goes red during a refactor, the code changed behaviour; fix the code, not the test.
3. **Bug fixing** — write the test that fails on the current code and proves the bug, then fix it. `AlbumPolicy.albumsCrumb()` exists because of one of these.

After editing source, run `codegraph affected <the files you changed>` to find which suites cover them, run those first with `make test-one file=…`, and only then `make check` — see **Codebase Navigation**.

- **Unit** (`tests/unit/`) — services, form schemas + list specs, the error normaliser, the list-query serialiser, reducers. No React, no network. Every RBAC branch and every policy outcome is asserted here; the four policy suites share `checkerFor()` from `tests/utils/policies.ts` rather than each redefining it.
- **Functional** (`tests/functional/`) — whole pages rendered with a real store and router through `renderWithProviders()` (`tests/utils/renderWithProviders.tsx`), against **MSW**. The store is rebuilt per test so the RTK Query cache never leaks between them, and the wrapper renders `ToastStack` because every screen sits inside `AppLayout` in the real app.
- **End-to-end** (`tests/e2e/`, Playwright, on the host) — the real browser against the real API. `smoke.spec.ts` covers a base user's journey; `privileged.spec.ts` covers the RBAC screens; `styling.spec.ts` asserts the handful of behaviours that only exist once the stylesheet is loaded (hover contrast, the account menu's open state) — the other suites run with `css: false` and cannot see those at all.

**The MSW mock is a small re-implementation of the API, not canned responses.** `tests/mocks/handlers.ts` reproduces the envelope, pagination with filters and a sort whitelist, token rotation, and the 401/403/404/409/422/429 answers; `tests/mocks/db.ts` holds the in-memory state with helpers `grantRole()`, `grant()` and `expireAccessTokens()`. `onUnhandledRequest: 'error'` is deliberate — a request the mock doesn't know means the client is calling something the contract doesn't describe, and that should fail the test rather than hang it.

**The gates live in `tests/mocks/guards.ts`, not in each handler.** `authed(handler)` answers 401 and hands the caller through; `authed.requiring(permission, handler)` adds the 403; `byId(collection, params['id'])` replaces the find-by-path-id every member route used to spell out; `createMockUser(body)` is shared by registration and the admin create. Spelled out per handler, those were three lines of preamble repeated twenty-odd times — and three chances per endpoint to get the order of 401, 403 and 404 subtly wrong. `guards.ts` also owns the mock's `canOn`/`OWN_ABILITIES`, which are deliberately **re-derived rather than imported from `src/`**: the mock is an independent mirror of the API's contract, and importing the client's own catalogue would make it agree with the client by construction.

**The functional suite runs a custom Vitest environment** (`tests/environment/jsdomWithNodeFetch.ts`) — do not switch it back to plain `jsdom`. jsdom has no `fetch`, so requests go through Node's (undici), which brand-checks the values it is handed and rejects jsdom's look-alikes. Without this, every request fails with _"Expected signal to be an instance of AbortSignal"_ and every upload is sent without its multipart boundary. The environment restores Node's `AbortController`/`AbortSignal`/`Blob`/`File` after jsdom installs its own, provides `URL.createObjectURL` (which jsdom lacks despite the DOM types), and installs a **hybrid `FormData`**: React DOM constructs one _from a form element_ on every submit, which Node's cannot accept, while undici only accepts its own — so `new FormData()` gets Node's and `new FormData(form)` gets jsdom's.

Other conventions:

- Coverage thresholds are **100** on all four metrics, enforced in `vitest.config.ts`. Only what carries no executable logic is excluded: `src/main.tsx` (mounts the app on import), `src/vite-env.d.ts`, `src/types/**` and the `index.ts` barrels. `App.tsx` and `router.tsx` are **not** excluded — the route table and its gates are real logic and are covered by `tests/functional/routing.test.tsx`.
- **An unreachable branch is a bug in the code, not a gap in the tests.** Delete the guard that can never fire rather than reaching for `/* v8 ignore */` — that is how `hasAllowedImageExtension` came to use `lastIndexOf`, why `FilterDefinition` became a union (a `select` must carry its `options`), and why `UserWithAlbums.albums` stopped being optional. The one legitimate ignore in the codebase is in `schemas.ts`, where a rejected `safeParse` always carries an issue but an indexed access cannot be typed to say so; it carries a comment explaining exactly that. If you add a second, justify it the same way.
- Scope queries with `within(dialog)` / `within(row)` when a label also exists on the screen behind — several labels legitimately repeat (a "Title" filter and a "Title" field, "New password" inside "Confirm new password"). In Playwright use `{ exact: true }`.
- E2E tests register their own accounts with unique emails, so no database reset is needed between runs. The privileged suite needs an account that already holds a role-managing role (roles cannot be granted over HTTP without one) — set `E2E_ADMIN_EMAIL` in `.env`; without it those tests **skip** rather than pretend to have run.
- **Known flakiness:** the API rate-limits its auth endpoints per IP (5 attempts/minute by default). Running the whole E2E suite several times back to back can trip the brute-force protection and fail an auth test. Wait out the window, or raise `LOGIN_RATE_LIMIT_ATTEMPTS` in the API's environment.
- Assert against MSW state (`db.users`, `db.albums`) to prove what was _sent_, not just what was rendered — that is how "the password was not sent" is testable at all.

## Docker Environment

One multi-stage `Dockerfile` — the single source of truth for the environment:

| Stage   | Used by                              | Contents                                                                                                                                                                                                       |
| ------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base`  | —                                    | `node:24-alpine` + `npm ci`. Never used directly.                                                                                                                                                              |
| `dev`   | `docker-compose.yml` (`target: dev`) | Vite dev server with HMR. Source is bind-mounted; `node_modules` stays in the image, kept out of the host's reach by a named volume (native binaries such as `sass-embedded`/`esbuild` are platform-specific). |
| `build` | `prod`                               | Runs `npm run build`. An intermediate only.                                                                                                                                                                    |
| `prod`  | CD pipeline (`target: prod`)         | `httpd:2.4-alpine` serving the built bundle. No volumes, no Node.                                                                                                                                              |

The production image enables `mod_rewrite` (`FallbackResource /index.html`, so a deep link resolves client-side), `mod_deflate`, and a cache policy treating Vite's fingerprinted assets as immutable while never caching `index.html` or `env.js`. Its config is `docker/apache/app.conf` and its entrypoint `docker/apache/entrypoint.sh`.

`.dockerignore` is an **allow-list** (`*` then `!` for the build inputs), which keeps the context minimal and independent of whatever else sits in the working directory. Prettier is likewise pointed at explicit paths in `package.json` rather than `.` — for the same reason.

## CI/CD & Static Analysis

**CI** — `.github/workflows/ci.yml` runs on every push and pull request: `npm ci`, then the same three gates as locally, **in the same order**: code style (`cs-check`), static analysis (`typecheck`), tests (with coverage). Keep the workflow in sync with the `Makefile` targets — they must stay runnable both ways. A second job runs Playwright, and is **skipped unless the `E2E_API_URL` repository variable is set**, because the API is not part of this repository; E2E is local-first via `make test-e2e`.

**CD** — `.github/workflows/cd.yml` chains off a green CI on `master` via `workflow_run`, guarded on `conclusion == 'success'` so a red CI never deploys. It builds the `prod` stage with Buildx + GHA cache and **smoke-tests the real image**: Apache serves the shell, falls back to it for a client-side route, and the entrypoint injected the API URL. The release then runs through a `production` GitHub Environment but is **simulated** — this sample provisions no server.

**Type checking** is `tsc --build --force` (`make typecheck`). `tsconfig.app.json` sets `noEmit`, so the build only checks. Do **not** add `--noEmit false` to work around composite-project errors: that writes `.js`/`.d.ts` files next to the sources, which Playwright then collects as duplicate specs (this happened once).

**ESLint** is type-aware (`strictTypeChecked` + `stylisticTypeChecked`) and points at the real `tsconfig.app.json`/`tsconfig.node.json` — not `projectService`, because the root tsconfig is a solution file with no files of its own and the service would fall back to an inferred project, losing the path aliases and reporting every aliased import as an error type. Four exceptions exist, each scoped and deliberate — **do not "clean them up"**:

- `dot-notation` allows bracket access on index-signature types: that is how a dynamic key reads, not a stylistic slip.
- `no-invalid-void-type` is off in `src/repositories/` only: RTK Query spells "this endpoint takes no argument" as a `void` type argument, which is what lets `useMeQuery()` be called with none.
- `no-non-null-assertion`, `no-unsafe-assignment` and `unbound-method` are off in `tests/` only.
- `eslint-config-prettier` comes last, disabling every stylistic rule that would fight Prettier.

`react-hooks` rules are enabled and were followed rather than suppressed: the two "set state in an effect" warnings became derived state and RHF's `values`, not `eslint-disable` comments.

## Project Structure

```
├── .github/workflows/  # CI (cs-check, typecheck, tests) + CD (build image, deploy)
├── Dockerfile          # Multi-stage: base → dev / build → prod (Apache)
├── .dockerignore       # Allow-list build context
├── docker-compose.yml  # Local dev stack (Vite dev server on CLIENT_PORT)
├── docker/apache/      # Production vhost + the entrypoint that writes env.js
├── public/env.js       # Runtime-config stub, overwritten in the prod image
├── src/                # Application code (see Architecture)
├── tests/
│   ├── unit/           # Layers in isolation (services, forms, transport, reducers)
│   ├── functional/     # Pages, components/ and hooks/ against MSW
│   ├── e2e/            # Playwright against the real API
│   ├── mocks/          # MSW handlers, the gates behind them, in-memory state
│   ├── environment/    # jsdom with Node's fetch globals
│   └── utils/          # renderWithProviders, checkerFor
├── init.sh             # Creates .env from .env.example
├── setup.sh            # Builds, starts, and checks the API is reachable
└── Makefile            # Short aliases for the docker compose commands (make help)
```

Environment variables live in `.env` (created from `.env.example` by `make init`): `VITE_API_BASE_URL` (resolved **by the browser**, so it stays `localhost` even though the client runs in a container), `VITE_APP_NAME`, `CLIENT_PORT`, `VITE_USE_POLLING` (for bind mounts where inotify doesn't fire), `E2E_BASE_URL`, `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD`.
