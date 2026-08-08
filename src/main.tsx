import { setupListeners } from '@reduxjs/toolkit/query'
import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'

import { onCLS, onINP, onLCP } from 'web-vitals'

import { App } from '@/app/App'
import { store } from '@/app/store'
import { DemoBanner } from '@/components'
import { config } from '@/config'
import { ConsoleErrorReporter } from '@/services'

import './styles/main.scss'

/*
 * The one place `import.meta.env` is read outside src/config, and deliberately.
 *
 * The rule there exists so a *deployment* value is never frozen into the
 * bundle. This is the opposite kind of flag: the demo is a different artifact,
 * built once and never repointed. It has to be read as a literal so Rollup can
 * see the branch is dead in a normal build and drop the mock API with it —
 * behind `config.isDemo` the whole of MSW would ship to production.
 */
const isDemo = import.meta.env.VITE_DEMO === '1'

/**
 * Starts the in-browser mock API the published demo runs against — the same
 * handlers the functional suite uses, so there is only one fake to maintain.
 * The caller is given the highest role, otherwise a visitor would land on a
 * base user's account and never see the RBAC screens the project is about.
 */
async function startDemoApi(): Promise<void> {
  const [{ worker }, { grantRole }] = await Promise.all([
    import('@tests/mocks/browser'),
    import('@tests/mocks/db'),
  ])

  grantRole('super_admin')
  await worker.start({
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    quiet: true,
  })
}

// Refetch when the tab regains focus or the network comes back.
setupListeners(store.dispatch)

document.title = config.appName

/*
 * The one place a reporter is chosen. Swapping the console for a hosted service
 * is this line and nothing else — that is what the `ErrorReporter` contract
 * buys, exactly as `TokenStorage` does for persistence.
 */
const reporter = new ConsoleErrorReporter()

onCLS((metric) => {
  reporter.reportMetric(metric)
})
onINP((metric) => {
  reporter.reportMetric(metric)
})
onLCP((metric) => {
  reporter.reportMetric(metric)
})

const container = document.getElementById('root')
if (container === null) {
  throw new Error('Root container #root is missing from index.html')
}

/*
 * Reporting is wired here rather than inside `ErrorBoundary`.
 *
 * `onCaughtError` fires for everything a boundary catches and `onUncaughtError`
 * for everything that gets past one, so the boundary stays a plain component
 * with no dependency on a reporter — and no failure is reported twice.
 */
const root = createRoot(container, {
  onCaughtError: (error, info) => {
    reporter.reportError(error, {
      source: 'boundary',
      ...(info.componentStack != null && { componentStack: info.componentStack }),
    })
  },
  onUncaughtError: (error) => {
    reporter.reportError(error, { source: 'unhandled' })
  },
})

function render(banner: ReactNode) {
  root.render(
    <StrictMode>
      <Provider store={store}>
        {banner}
        <App />
      </Provider>
    </StrictMode>,
  )
}

if (isDemo) {
  // Rendering only once the worker is listening: a query fired before then
  // would reach the network and fail.
  void startDemoApi().then(() => {
    render(<DemoBanner />)
  })
} else {
  render(null)
}
