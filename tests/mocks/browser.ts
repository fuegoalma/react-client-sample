import { setupWorker } from 'msw/browser'

import { handlers } from './handlers'

/**
 * The same mock API, in a service worker instead of Node.
 *
 * This is what the published demo runs against. Reusing the suite's handlers
 * rather than writing a second fake is the whole point: there is one
 * re-implementation of the contract, and the demo cannot drift from what the
 * tests prove. It also lets a visitor exercise the RBAC screens, which against
 * the real API would need an account nobody is going to hand out.
 */
export const worker = setupWorker(...handlers)
