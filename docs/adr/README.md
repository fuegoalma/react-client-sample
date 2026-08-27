# Architecture decision records

One file per decision that a reader would otherwise have to reverse-engineer
from the code — what was chosen, what it cost, and what would have to change to
undo it. They are deliberately short.

| #                                                | Decision                                                    |
| ------------------------------------------------ | ----------------------------------------------------------- |
| [0001](0001-tokens-in-local-storage.md)          | The refresh token lives in `localStorage`                   |
| [0002](0002-single-flight-token-refresh.md)      | One refresh at a time, behind a mutex                       |
| [0003](0003-no-pass-through-services.md)         | A service layer only where there is logic                   |
| [0004](0004-permissions-mirrored-client-side.md) | The server's permission model, mirrored on the client       |
| [0005](0005-mock-api-as-independent-mirror.md)   | The mock API is a re-implementation, not fixtures           |
| [0006](0006-runtime-configuration.md)            | The API URL is read at runtime, not built in                |
| [0007](0007-openapi-as-a-checked-oracle.md)      | The OpenAPI document is checked against, not generated from |
| [0008](0008-branch-on-the-error-code.md)         | Branch on the API's error code, never on its message        |
