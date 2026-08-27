import { BrowserRouter } from 'react-router-dom'

import { ToastStack } from '@/components/ui'

import { AppRoutes } from './router'

export function App() {
  return (
    // The demo is published under a project-page subdirectory, so every route
    // sits below it. `BASE_URL` is Vite's own build-time constant and is '/'
    // for a normal build, which leaves the deployed application unaffected.
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      {/*
       * Outside the routes, not inside the authenticated layout.
       *
       * Toasts are raised from anywhere — including the transport, when
       * re-authentication fails — and the two that matter most are raised by
       * signing out, which then navigates to `/login`. That route sits outside
       * `AppLayout`, so a stack mounted there was torn down in the same commit
       * as the message it was holding, and "You have been signed out" was never
       * actually seen. Here it survives the navigation.
       */}
      <ToastStack />
      <AppRoutes />
    </BrowserRouter>
  )
}
