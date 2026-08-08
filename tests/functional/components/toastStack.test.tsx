import { act, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ToastStack } from '@/components'
import { notifyError, notifySuccess } from '@/app/notificationsSlice'
import { createAppStore } from '@/app/store'
import { InMemoryTokenStorage } from '@/services'

import { renderWithProviders } from '../../utils/renderWithProviders'

function storeWith(...actions: readonly { type: string }[]) {
  const store = createAppStore({ tokenStorage: new InMemoryTokenStorage() })
  for (const action of actions) store.dispatch(action)
  return store
}

describe('ToastStack', () => {
  it('renders nothing while there is nothing to say', () => {
    const { container } = renderWithProviders(<ToastStack />, { store: storeWith() })

    // `renderWithProviders` mounts its own stack; both must be silent.
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a success message as a status, not an alert', () => {
    renderWithProviders(<ToastStack />, { store: storeWith(notifySuccess('Album created.')) })

    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Album created.')
  })

  it('shows a failure as an alert, so it is announced', () => {
    renderWithProviders(<ToastStack />, { store: storeWith(notifyError('Refused.')) })

    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Refused.')
  })

  it('dismisses a toast the reader closes', async () => {
    const store = storeWith(notifySuccess('Album created.'))
    const { user } = renderWithProviders(<ToastStack />, { store })

    await user.click(screen.getAllByRole('button', { name: 'Dismiss' })[0]!)

    expect(store.getState().notifications.items).toHaveLength(0)
  })
})

describe('A toast’s own lifetime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lets a success message expire on its own', () => {
    const store = storeWith(notifySuccess('Album created.'))
    renderWithProviders(<ToastStack />, { store })

    act(() => {
      vi.advanceTimersByTime(6000)
    })

    expect(store.getState().notifications.items).toHaveLength(0)
  })

  it('keeps an error until it is dismissed', () => {
    // A 409 explains which safety rule refused the operation — that is worth
    // reading twice, so it must not disappear on a timer.
    const store = storeWith(notifyError('This would leave no role manager.'))
    renderWithProviders(<ToastStack />, { store })

    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(store.getState().notifications.items).toHaveLength(1)
  })

  it('gives each toast its own timer, so a later one never extends an earlier', () => {
    const store = storeWith(notifySuccess('First.'))
    renderWithProviders(<ToastStack />, { store })

    act(() => {
      vi.advanceTimersByTime(4000)
    })
    act(() => {
      store.dispatch(notifySuccess('Second.'))
    })
    act(() => {
      vi.advanceTimersByTime(2500)
    })

    // A stack-wide effect would have restarted the first toast's timer here.
    expect(store.getState().notifications.items.map((item) => item.message)).toEqual(['Second.'])
  })
})
