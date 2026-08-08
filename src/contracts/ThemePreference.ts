/** The two themes Bootstrap 5.3 ships colour modes for. */
export type Theme = 'light' | 'dark'

/**
 * Where the visitor's choice of theme is kept, mirroring `TokenStorage`: the
 * application depends on this, never on `localStorage`, so a test can hand it
 * an in-memory implementation and get a deterministic starting point.
 *
 * `null` means *no choice has been made*, which is different from "light" —
 * that is what lets the application follow the operating system until someone
 * says otherwise.
 */
export interface ThemePreference {
  readonly read: () => Theme | null
  readonly write: (theme: Theme) => void
  readonly clear: () => void
}
