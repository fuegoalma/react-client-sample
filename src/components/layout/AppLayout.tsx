import { Outlet } from 'react-router-dom'

import { ToastStack } from '@/components/ui'

import { HealthBadge } from './HealthBadge'
import { Navbar } from './Navbar'

/** The shell every authenticated screen renders inside. */
export function AppLayout() {
  return (
    <div className="appShell">
      <Navbar />
      <ToastStack />

      <main className="appMain">
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
