# 3. A service layer only where there is logic

**Status:** accepted

## Context

The client mirrors the API's layering — Controller → Form Request → Service →
Repository. Followed literally, every screen would get a service, and most of
those services would contain a single line forwarding a call to a repository.

## Decision

The service layer exists **only where it decides something**: permission
evaluation, the per-resource policies, list-query building, token storage. A
screen with no rules of its own goes page hook → repository directly.

If a service is added, it must decide something.

## Consequences

- The diagram is not satisfied symmetrically, on purpose. A pass-through class
  adds a file, an indirection and a test, and answers no question.
- Dependency injection stays at the composition root. `PermissionService` and
  the four policies are pure — built from data by `usePermissions()` on every
  render — so they need no container, and there is deliberately no
  `ServicesProvider`.
- The rule that keeps this honest is the other half: business rules never live
  in a page. The moment a screen spells out an ability string or compares the
  caller's id, that belongs in the resource's policy.
