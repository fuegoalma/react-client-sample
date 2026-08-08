import { setupServer } from 'msw/node'

import { handlers } from './handlers'

/** The mock API used by the functional suite. */
export const server = setupServer(...handlers)
