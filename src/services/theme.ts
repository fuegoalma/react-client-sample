import type { Theme, ThemePreference } from '@/contracts'

/**
 * Bootstrap 5.3 reads its colour mode from this attribute on <html>, so the
 * whole framework switches with it and the application only has to set it.
 * It doubles as the storage key — one name, one concept.
 */
export const THEME_ATTRIBUTE = 'data-bs-theme'

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

/**
 * The theme to apply: the visitor's choice if they made one, the operating
 * system's otherwise.
 *
 * Kept as a pure function rather than folded into the hook so every branch is
 * assertable without a DOM — the same reason the policies are pure.
 */
export function resolveTheme(chosen: Theme | null, prefersDark: boolean): Theme {
  if (chosen !== null) return chosen
  return prefersDark ? 'dark' : 'light'
}

/** Remembers the choice across reloads. */
export class LocalStorageThemePreference implements ThemePreference {
  read(): Theme | null {
    try {
      const raw = localStorage.getItem(THEME_ATTRIBUTE)
      return isTheme(raw) ? raw : null
    } catch {
      // Private-mode browsers can throw on access; following the system is a
      // perfectly good answer.
      return null
    }
  }

  write(theme: Theme): void {
    try {
      localStorage.setItem(THEME_ATTRIBUTE, theme)
    } catch {
      // The theme still applies for this visit.
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(THEME_ATTRIBUTE)
    } catch {
      // Nothing to do.
    }
  }
}

/** Used by tests and by any environment without a DOM. */
export class InMemoryThemePreference implements ThemePreference {
  private theme: Theme | null = null

  read(): Theme | null {
    return this.theme
  }

  write(theme: Theme): void {
    this.theme = theme
  }

  clear(): void {
    this.theme = null
  }
}

/** Bootstrap reads the attribute, so this is the whole of "applying" a theme. */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme)
}

/**
 * Applies the theme before the first paint, from the composition root.
 *
 * Left to the hook's effect, the browser would paint the light stylesheet and
 * then swap — a flash of the wrong theme on every load for anyone who prefers
 * dark. The resolution itself is still `resolveTheme`, so there is one answer
 * to "which theme", not two.
 */
export function applyStoredTheme(): void {
  applyTheme(
    resolveTheme(
      createThemePreference().read(),
      window.matchMedia('(prefers-color-scheme: dark)').matches,
    ),
  )
}

/** Picks the implementation appropriate for the current environment. */
export function createThemePreference(): ThemePreference {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return new InMemoryThemePreference()
  }
  return new LocalStorageThemePreference()
}
