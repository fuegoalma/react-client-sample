import { useCallback } from 'react'

import { useNotifications } from './useNotifications'

export interface MutationReport<T> {
  readonly success: string
  /** Shown when the API gave no message of its own worth reading. */
  readonly failure: string
  /** Runs only after a success — closing a dialog, leaving the screen. */
  readonly onDone?: (result: T) => void
}

export interface MutationAction {
  readonly run: <T>(request: Promise<T>, report: MutationReport<T>) => Promise<void>
}

/**
 * Runs a mutation and reports what happened, the same way everywhere.
 *
 * Every screen had written out the same try/await/report/catch: success raises a
 * toast, failure raises the API's own wording — which matters, because a 409
 * explains which safety invariant refused the operation and must be shown
 * verbatim. The wording stays at the call site; only the shape lives here.
 */
export function useMutationAction(): MutationAction {
  const { reportSuccess, reportError } = useNotifications()

  const run = useCallback(
    async <T>(request: Promise<T>, report: MutationReport<T>): Promise<void> => {
      try {
        const result = await request
        reportSuccess(report.success)
        report.onDone?.(result)
      } catch (error) {
        reportError(error, report.failure)
      }
    },
    [reportSuccess, reportError],
  )

  return { run }
}
