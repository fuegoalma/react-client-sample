import type { Pagination } from '@/types'

interface PaginationBarProps {
  readonly pagination: Pagination
  readonly onPageChange: (page: number) => void
}

/** Page numbers around the current page, with ellipses for long ranges. */
function pageWindow(current: number, last: number): readonly (number | 'gap')[] {
  if (last <= 7) return Array.from({ length: last }, (_, index) => index + 1)

  const pages = new Set<number>([1, last, current])
  if (current > 1) pages.add(current - 1)
  if (current < last) pages.add(current + 1)

  const sorted = [...pages].sort((a, b) => a - b)
  const result: (number | 'gap')[] = []

  sorted.forEach((page, index) => {
    const previous = sorted[index - 1]
    if (previous !== undefined && page - previous > 1) result.push('gap')
    result.push(page)
  })

  return result
}

export function PaginationBar({ pagination, onPageChange }: PaginationBarProps) {
  const { current_page: current, last_page: last, total, from, to } = pagination

  return (
    <div className="paginationBar">
      {/* An empty page reports 0–0, which reads as a slice that isn't there.
          `total` is what decides whether there is anything to show at all. */}
      <span>{total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}</span>

      {last > 1 && (
        <nav aria-label="Pagination">
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item${current <= 1 ? ' disabled' : ''}`}>
              <button
                type="button"
                className="page-link"
                onClick={() => {
                  onPageChange(current - 1)
                }}
                disabled={current <= 1}
              >
                Previous
              </button>
            </li>

            {pageWindow(current, last).map((page, index) =>
              page === 'gap' ? (
                <li key={`gap-${index}`} className="page-item disabled">
                  <span className="page-link">…</span>
                </li>
              ) : (
                <li key={page} className={`page-item${page === current ? ' active' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    aria-current={page === current ? 'page' : undefined}
                    onClick={() => {
                      onPageChange(page)
                    }}
                  >
                    {page}
                  </button>
                </li>
              ),
            )}

            <li className={`page-item${current >= last ? ' disabled' : ''}`}>
              <button
                type="button"
                className="page-link"
                onClick={() => {
                  onPageChange(current + 1)
                }}
                disabled={current >= last}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  )
}
