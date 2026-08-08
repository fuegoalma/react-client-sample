/** Where a failure came from, so a report can be read without a stack trace. */
export type ErrorSource = 'render' | 'boundary' | 'unhandled'

export interface ErrorContext {
  readonly source: ErrorSource
  /** React's component stack, when the failure reached an error boundary. */
  readonly componentStack?: string
}

/** One web-vitals reading. The names are the metrics' own. */
export interface Metric {
  readonly name: string
  readonly value: number
  readonly rating: 'good' | 'needs-improvement' | 'poor'
}

/**
 * Reporting seam, alongside `TokenStorage` and for the same reason: the
 * application depends on this, never on a vendor SDK.
 *
 * A hosted service — Sentry and the like — becomes one more implementation
 * injected at the composition root, and nothing else in the codebase changes.
 * The default writes to the console, which is honest about what this sample
 * actually does rather than pretending to a backend it does not have.
 */
export interface ErrorReporter {
  readonly reportError: (error: unknown, context?: ErrorContext) => void
  readonly reportMetric: (metric: Metric) => void
}
