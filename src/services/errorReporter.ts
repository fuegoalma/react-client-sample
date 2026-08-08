import type { ErrorContext, ErrorReporter, Metric } from '@/contracts'

/**
 * The default reporter: everything goes to the console, tagged with where it
 * came from.
 *
 * This sample has no telemetry backend, and inventing one would be pretending.
 * What matters is that the application reports through an interface, so
 * pointing it at a real service is a second implementation and no other edit.
 */
export class ConsoleErrorReporter implements ErrorReporter {
  reportError(error: unknown, context?: ErrorContext): void {
    console.error(`[error] ${context?.source ?? 'unknown'}`, error)
  }

  reportMetric(metric: Metric): void {
    console.info(`[metric] ${metric.name}`, `${metric.value.toString()} (${metric.rating})`)
  }
}

/**
 * Reports nothing. Used where a failure is expected and its output would only
 * bury the run — the test suite deliberately throws.
 */
export class NoopErrorReporter implements ErrorReporter {
  reportError(_error: unknown, _context?: ErrorContext): void {
    // Intentionally silent.
  }

  reportMetric(_metric: Metric): void {
    // Intentionally silent.
  }
}
