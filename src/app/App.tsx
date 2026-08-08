import { BrowserRouter } from 'react-router-dom'

import { AppRoutes } from './router'

export function App() {
  return (
    // The demo is published under a project-page subdirectory, so every route
    // sits below it. `BASE_URL` is Vite's own build-time constant and is '/'
    // for a normal build, which leaves the deployed application unaffected.
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppRoutes />
    </BrowserRouter>
  )
}
