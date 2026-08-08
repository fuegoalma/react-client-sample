import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppLayout, ErrorBoundary } from '@/components'

import { renderWithProviders } from '../../utils/renderWithProviders'

function Boom({ fail }: { readonly fail: boolean }) {
  if (fail) throw new Error('Rendering blew up')
  return <p>The screen</p>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs the caught error itself; the test asserts on the fallback, and
    // the log would otherwise bury the rest of the run.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('leaves a working screen alone', () => {
    renderWithProviders(
      <ErrorBoundary>
        <Boom fail={false} />
      </ErrorBoundary>,
    )

    expect(screen.getByText('The screen')).toBeInTheDocument()
  })

  it('replaces a screen that threw with something the user can act on', () => {
    renderWithProviders(
      <ErrorBoundary>
        <Boom fail />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByText('The screen')).not.toBeInTheDocument()
  })

  it('renders the screen again when the user retries', async () => {
    // The boundary can only clear itself; whether the second attempt succeeds
    // is the screen's business, which is why "Try again" re-renders rather
    // than reloading the page.
    const { user, rerender } = renderWithProviders(
      <ErrorBoundary>
        <Boom fail />
      </ErrorBoundary>,
    )

    rerender(
      <ErrorBoundary>
        <Boom fail={false} />
      </ErrorBoundary>,
    )
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText('The screen')).toBeInTheDocument()
  })
})

describe('The shell around a screen that threw', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps the navigation usable, so the user is not stranded', async () => {
    renderWithProviders(
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/albums" element={<Boom fail />} />
        </Route>
      </Routes>,
      { route: '/albums' },
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'My albums' })).toBeInTheDocument()
  })
})
