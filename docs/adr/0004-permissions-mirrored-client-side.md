# 4. The server's permission model, mirrored on the client

**Status:** accepted

## Context

`GET /users/me/permissions` returns what the caller may do. The UI has to decide
what to show — a link that answers 403 is worse than no link — which means
re-deriving, on this side, the answers the server's `AccessControlService`
gives.

## Decision

`PermissionService` (`src/services/permissions.ts`) implements the same two
questions the server asks: `can(permission)` for a global one, and
`canOn(ability, isOwn)` for a per-record one, granted by the `.any` variant of a
role or by ownership when the ability is in `OWN_ABILITIES`.

The names live in two catalogs, `PERMISSIONS` and `ABILITIES`, with
`OWN_ABILITIES` built _from_ `ABILITIES` so the two cannot drift. An ability is
never spelled inline.

## Consequences

- **The UI only hides.** Every request is re-checked server-side, so a
  hand-typed URL gains nothing. This mirror is about not offering dead ends, not
  about enforcement.
- Each action checks only its own permission. A custom role of just
  `photo.delete.any` can delete a photo it cannot view — matching the server,
  and worth keeping that way.
- Two rules stay server-only, and not by oversight: anti-escalation and the
  last-role-manager invariant. `GET /roles` returns names and descriptions
  without permission sets, so the client cannot tell which roles carry
  `role.manage`. Both surface through the API's own 403 and 409 wording.
- Ownership is derived, not returned: album lists carry no owner, so
  `usePermissions()` builds the set of owned album ids from `GET /users/me`.
  This is also why the all-albums screen has no owner column — there is nothing
  in the response to render.
