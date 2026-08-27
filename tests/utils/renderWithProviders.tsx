import { render, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { credentialsReceived } from '@/app/authSlice'
import { createAppStore, type AppStore } from '@/app/store'
import { ToastStack } from '@/components'
import { InMemoryTokenStorage } from '@/services'

import { ACCESS_TOKEN, REFRESH_TOKEN } from '../mocks/db'

export interface RenderOptions {
  /** Initial history entry, e.g. `/albums/10`. */
  readonly route?: string
  /** Route pattern the element is mounted at, when the path has parameters. */
  readonly path?: string
  /** Start signed in with the seeded session. Defaults to true. */
  readonly authenticated?: boolean
  readonly store?: AppStore
}

export interface RenderedApp extends RenderResult {
  readonly store: AppStore
  readonly user: ReturnType<typeof userEvent.setup>
}

/**
 * Renders a screen with a real store, a real router and the injected in-memory
 * token storage — everything except the network, which MSW answers.
 *
 * Building the store per test (rather than reusing the app's singleton) keeps
 * the RTK Query cache from leaking between tests.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    route = '/',
    path,
    authenticated = true,
    store = createAppStore({ tokenStorage: new InMemoryTokenStorage() }),
  }: RenderOptions = {},
): RenderedApp {
  if (authenticated) {
    store.dispatch(credentialsReceived({ accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN }))
  }

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        {/* `App` mounts this outside the routes, so a toast raised on the way
            to another screen survives the navigation. Mirrored here for the
            same reason: a page test renders one screen, not the shell. */}
        <ToastStack />
        {path === undefined ? (
          children
        ) : (
          <Routes>
            <Route path={path} element={children} />
          </Routes>
        )}
      </MemoryRouter>
    </Provider>
  )

  const result = render(ui, { wrapper })

  return { ...result, store, user: userEvent.setup() }
}
