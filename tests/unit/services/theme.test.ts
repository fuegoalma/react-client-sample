import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  applyStoredTheme,
  createThemePreference,
  InMemoryThemePreference,
  LocalStorageThemePreference,
  resolveTheme,
  THEME_ATTRIBUTE,
} from '@/services'

describe('resolveTheme', () => {
  it('uses the stored choice when there is one', () => {
    expect(resolveTheme('dark', true)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('follows the system when nothing has been chosen', () => {
    expect(resolveTheme(null, true)).toBe('dark')
    expect(resolveTheme(null, false)).toBe('light')
  })

  it('lets an explicit choice override the system, in both directions', () => {
    // The point of storing a choice at all: someone on a dark desktop may still
    // want this application light.
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})

describe('InMemoryThemePreference', () => {
  it('starts with nothing chosen', () => {
    expect(new InMemoryThemePreference().read()).toBeNull()
  })

  it('remembers a choice and forgets it again', () => {
    const preference = new InMemoryThemePreference()

    preference.write('dark')
    expect(preference.read()).toBe('dark')

    preference.clear()
    expect(preference.read()).toBeNull()
  })
})

describe('LocalStorageThemePreference', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('survives a reload', async () => {
    const { LocalStorageThemePreference } = await import('@/services')

    new LocalStorageThemePreference().write('dark')

    expect(new LocalStorageThemePreference().read()).toBe('dark')
  })

  it('ignores a stored value that is not a theme', async () => {
    const { LocalStorageThemePreference } = await import('@/services')
    localStorage.setItem(THEME_ATTRIBUTE, 'chartreuse')

    expect(new LocalStorageThemePreference().read()).toBeNull()
  })

  it('degrades to no preference when storage refuses, as private mode does', async () => {
    const { LocalStorageThemePreference } = await import('@/services')
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('denied')
      },
      setItem() {
        throw new Error('denied')
      },
      removeItem() {
        throw new Error('denied')
      },
    })

    const preference = new LocalStorageThemePreference()

    expect(() => {
      preference.write('dark')
    }).not.toThrow()
    expect(preference.read()).toBeNull()
    expect(() => {
      preference.clear()
    }).not.toThrow()
  })
})

describe('createThemePreference', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('falls back to memory where there is no DOM', () => {
    // The unit project runs in Node, so this is the real environment here.
    expect(createThemePreference()).toBeInstanceOf(InMemoryThemePreference)
  })

  it('persists in a browser', () => {
    vi.stubGlobal('window', { localStorage: {} })
    expect(createThemePreference()).toBeInstanceOf(LocalStorageThemePreference)
  })

  it('falls back to memory in a browser without localStorage', () => {
    vi.stubGlobal('window', {})
    expect(createThemePreference()).toBeInstanceOf(InMemoryThemePreference)
  })
})

describe('applyStoredTheme', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('puts the resolved theme on the document before anything renders', () => {
    const attributes = new Map<string, string>()
    vi.stubGlobal('window', {
      localStorage: undefined,
      matchMedia: () => ({ matches: true }),
    })
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    vi.stubGlobal('document', {
      documentElement: {
        setAttribute: (name: string, value: string) => attributes.set(name, value),
      },
    })

    applyStoredTheme()

    // No stored choice and a system that prefers dark: dark wins.
    expect(attributes.get(THEME_ATTRIBUTE)).toBe('dark')
  })
})
