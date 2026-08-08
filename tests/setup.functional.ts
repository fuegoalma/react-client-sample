import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { resetDb } from './mocks/db'
import { server } from './mocks/server'

/**
 * Every functional test runs against the MSW mock of the API.
 *
 * `onUnhandledRequest: 'error'` is deliberate: a request the mock does not know
 * about means the client is calling an endpoint the contract does not describe,
 * and that should fail the test rather than hang it.
 */
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
  cleanup()
  resetDb()
  localStorage.clear()
})

afterAll(() => {
  server.close()
})
