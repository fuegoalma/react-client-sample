interface SkeletonProps {
  /** How many placeholder rows to stand in for. */
  readonly rows?: number
  /** Announced in place of the shapes, which mean nothing to a screen reader. */
  readonly label: string
}

/**
 * The shape of the content that is coming, rather than a spinner in the middle
 * of an empty page.
 *
 * A spinner says "something is happening somewhere"; this says "a table is
 * loading, and it will be about this big", so the page does not jump when the
 * data lands. It is deliberately not per-screen: one row shape covers the lists
 * and the panels, and a pixel-accurate imitation of each screen would be a
 * second copy of that screen's layout to keep in step.
 */
export function Skeleton({ rows = 5, label }: SkeletonProps) {
  return (
    <div className="skeleton appCard" role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skeleton__row" aria-hidden="true" />
      ))}
    </div>
  )
}
