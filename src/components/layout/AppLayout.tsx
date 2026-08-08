import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { ToastStack } from '@/components/ui'

import { HealthBadge } from './HealthBadge'
import { Navbar } from './Navbar'

const MAIN_ID = 'appMain'

/** The shell every authenticated screen renders inside. */
export function AppLayout() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const landed = useRef(false)

  /*
   * A client-side navigation replaces the page without telling anyone: the
   * focus stays wherever the link was, and a screen reader announces nothing.
   * Moving it to the new content is the fix — and the shell is the only thing
   * that survives the change, so a screen could not do this for itself.
   *
   * Arriving is not navigating, hence the first render is skipped: taking the
   * focus there would fight the browser's own restoration on a reload.
   */
  useEffect(() => {
    if (!landed.current) {
      landed.current = true
      return
    }

    mainRef.current?.focus()
  }, [pathname])

  return (
    <div className="appShell">
      {/* First in the tab order, so a keyboard user reaches the page without
          walking the whole navigation on every screen. */}
      <a className="skipLink" href={`#${MAIN_ID}`}>
        Skip to content
      </a>

      <Navbar />
      <ToastStack />

      <main className="appMain" id={MAIN_ID} ref={mainRef} tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="appFooter">
        <div className="appMain py-0 d-flex justify-content-between align-items-center">
          <HealthBadge />
          <span>Photos REST API client</span>
        </div>
      </footer>
    </div>
  )
}
