import { useCallback, useEffect, useState } from 'react'

import type { Theme } from '@/contracts'
import { applyTheme, createThemePreference, resolveTheme } from '@/services'

const DARK_QUERY = '(prefers-color-scheme: dark)'

const preference = createThemePreference()

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches
}

export interface ThemeState {
  readonly theme: Theme
  readonly toggle: () => void
}

/**
 * The applied theme, and the one control that changes it.
 *
 * The starting point is the visitor's stored choice, or the operating system's
 * when they have not made one — and it keeps following the system in that case,
 * so switching the desktop to dark at sunset switches this too. Choosing
 * explicitly stops that, which is the whole reason a choice is stored.
 */
export function useTheme(): ThemeState {
  const [chosen, setChosen] = useState<Theme | null>(() => preference.read())
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark)

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY)
    const follow = (event: MediaQueryListEvent): void => {
      setPrefersDark(event.matches)
    }

    query.addEventListener('change', follow)
    return () => {
      query.removeEventListener('change', follow)
    }
  }, [])

  const theme = resolveTheme(chosen, prefersDark)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggle = useCallback(() => {
    setChosen((current) => {
      const next: Theme = resolveTheme(current, systemPrefersDark()) === 'dark' ? 'light' : 'dark'
      preference.write(next)
      return next
    })
  }, [])

  return { theme, toggle }
}
