import { act, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Navbar } from '@/components'
import { THEME_ATTRIBUTE } from '@/services'

import { renderWithProviders } from '../utils/renderWithProviders'

/** jsdom has no matchMedia, and the hook asks it what the system prefers. */
function stubSystemPrefersDark(prefersDark: boolean): (matches: boolean) => void {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  let matches = prefersDark

  vi.stubGlobal('matchMedia', (query: string) => ({
    media: query,
    get matches() {
      return matches
    },
    addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener)
    },
    removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener)
    },
  }))

  // The change arrives from outside React, which is exactly how it arrives in a
  // browser — `act` is what lets the test see the render it causes.
  return (next: boolean) => {
    act(() => {
      matches = next
      for (const listener of listeners) listener({ matches: next } as MediaQueryListEvent)
    })
  }
}

async function openAccountMenu(user: ReturnType<typeof renderWithProviders>['user']) {
  await user.click(await screen.findByRole('button', { name: /Ada Lovelace/ }))
}

describe('Choosing a theme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute(THEME_ATTRIBUTE)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('follows the system when no choice has been made', () => {
    stubSystemPrefersDark(true)
    renderWithProviders(<Navbar />)

    expect(document.documentElement).toHaveAttribute(THEME_ATTRIBUTE, 'dark')
  })

  it('keeps following the system while it is left alone', () => {
    const setSystem = stubSystemPrefersDark(false)
    renderWithProviders(<Navbar />)
    expect(document.documentElement).toHaveAttribute(THEME_ATTRIBUTE, 'light')

    setSystem(true)

    expect(document.documentElement).toHaveAttribute(THEME_ATTRIBUTE, 'dark')
  })

  it('switches on request and remembers the choice', async () => {
    stubSystemPrefersDark(false)
    const { user } = renderWithProviders(<Navbar />)

    await openAccountMenu(user)
    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))

    expect(document.documentElement).toHaveAttribute(THEME_ATTRIBUTE, 'dark')
    expect(localStorage.getItem(THEME_ATTRIBUTE)).toBe('dark')
  })

  it('lets an explicit choice outrank the system, and stops following it', async () => {
    // Someone on a dark desktop may still want this application light.
    const setSystem = stubSystemPrefersDark(true)
    const { user } = renderWithProviders(<Navbar />)

    await openAccountMenu(user)
    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }))
    expect(document.documentElement).toHaveAttribute(THEME_ATTRIBUTE, 'light')

    setSystem(false)
    setSystem(true)

    expect(document.documentElement).toHaveAttribute(THEME_ATTRIBUTE, 'light')
  })
})
