# 8. Branch on the API's error code, never on its message

**Status:** accepted

## Context

Every failure the API returns carries two things: a `message` written for a
person, and an `error_code` written for a program. The client needs to tell some
failures apart — a 401 that means "retype your password" is not the 401 that
means "this session was revoked and refreshing will not help", and a 413 from an
oversized upload is not the same problem as a 413 from anything else.

The API did not always offer the second. Before it did, it sent Yii's
`"An error occurred during execution"` for essentially everything, and this
client compensated by substituting its own wording per status. That worked, and
it hid a wrong answer for as long as it existed: a rejected sign-in told the user
their session was no longer valid, when in fact the password was simply wrong.
The status alone could not distinguish the two, and nothing else was available
to distinguish them by.

The tempting alternative — matching on message text — is available and works
today. It is also the thing that breaks silently: prose is written for humans and
is expected to be reworded, translated, or made friendlier, and none of those is
a breaking change anybody would announce.

## Decision

`ApiError.errorCode` carries the API's `error_code`, and **that is the field to
branch on.** It is typed as a required `string`, not `string | undefined`: a body
that carries no code falls back to the name of its status (`not_found`,
`conflict`, `validation_failed`, …), mirroring the API's own `ApiErrorCatalog`.
A caller therefore never has to test for absence before comparing, which is what
keeps the easy path and the correct path the same path.

`message` is passed through from the API and rendered, never matched against.
The client no longer substitutes wording for a message the API did send; its
status-specific fallbacks apply only to a body that carries none — a proxy's
answer, a truncated response, a network failure.

The one deliberate exception is the 429, where the `Retry-After` header knows
something the sentence does not, so the client composes a message that says how
long to wait.

## Consequences

- Two 401s can now be told apart, so the sign-in screen says the password was
  wrong instead of implying a session expired.
- The `startsWith('An error occurred')` check is gone. It could no longer fire,
  and a branch that cannot fire is a defect rather than a coverage gap.
- `errors.ts` keeps a status→code table that duplicates the API's. It is small,
  it only fills silence, and the alternative — an absent field — pushes an
  `undefined` check onto every caller.
- Nothing enforces "do not match on `message`" mechanically. It is a review
  rule, which is why it is written down here.
- A narrowed code the client does not yet know about is simply an unrecognised
  string, not an error. Adding a case is additive; the API can narrow further
  without breaking anything.
