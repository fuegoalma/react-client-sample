import type { ReactNode } from 'react'

import { errorMessage } from '@/api'

import { Skeleton } from './Skeleton'
import { Spinner } from './Spinner'

interface QueryBoundaryProps {
  readonly isLoading: boolean
  readonly error?: unknown
  /** Rendered instead of the children when the query returned nothing. */
  readonly isEmpty?: boolean
  readonly emptyMessage?: string
  /**
   * What to show while waiting. A screen that is about to render rows of
   * content asks for `'skeleton'`, so the page keeps its shape instead of
   * collapsing to a centred spinner and jumping when the data lands.
   */
  readonly pending?: 'spinner' | 'skeleton'
  readonly children: ReactNode
}

/**
 * The three states every query screen has to render — loading, failed, empty —
 * in one place, so no screen invents its own spinner or error copy.
 */
export function QueryBoundary({
  isLoading,
  error,
  isEmpty = false,
  emptyMessage = 'Nothing to show yet.',
  pending = 'spinner',
  children,
}: QueryBoundaryProps) {
  if (isLoading) {
    return pending === 'skeleton' ? <Skeleton label="Loading…" /> : <Spinner label="Loading…" />
  }

  if (error !== undefined && error !== null) {
    return (
      <div className="alert alert-danger" role="alert">
        {errorMessage(error, 'This content could not be loaded.')}
      </div>
    )
  }

  if (isEmpty) {
    return <div className="emptyState">{emptyMessage}</div>
  }

  return <>{children}</>
}
