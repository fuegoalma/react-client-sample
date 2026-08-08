import { Component, type ReactNode } from 'react'

import { errorMessage } from '@/api'

interface ErrorBoundaryProps {
  readonly children: ReactNode
}

interface ErrorBoundaryState {
  readonly error: unknown
}

/**
 * The last line of defence for a screen that throws while rendering.
 *
 * Without one, a single bad read — a field on a record that turned out to be
 * absent — replaces the whole application with a blank page, taking the
 * navigation and the way out with it. Mounted around the routed content, so the
 * shell survives and the user can go somewhere else.
 *
 * Still a class component: `getDerivedStateFromError` has no hook equivalent,
 * which is the one thing React has not moved off classes.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error }
  }

  // There is deliberately no `componentDidCatch`: reporting belongs to the
  // composition root, where `createRoot`'s `onCaughtError` already sees
  // everything that reaches a boundary. Catching it here as well would send
  // each failure twice.

  private readonly retry = (): void => {
    this.setState({ error: null })
  }

  override render(): ReactNode {
    const { error } = this.state

    if (error === null) return this.props.children

    return (
      <div className="appCard">
        <div className="alert alert-danger" role="alert">
          {errorMessage(error, 'This screen could not be displayed.')}
        </div>
        <button type="button" className="btn btn-outline-secondary" onClick={this.retry}>
          Try again
        </button>
      </div>
    )
  }
}
