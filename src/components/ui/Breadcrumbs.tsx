import { Link } from 'react-router-dom'

export interface Crumb {
  readonly label: string
  /** Absent on the current page, and on an ancestor the caller may not open. */
  readonly to?: string
}

interface BreadcrumbsProps {
  readonly items: readonly Crumb[]
}

/**
 * The trail to the current screen.
 *
 * Pages supply their own trail rather than it being derived from the URL,
 * because only they know what a record is called — `/albums/12` says nothing
 * about "Holiday 2026".
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb">
      <ol className="breadcrumb appBreadcrumb">
        {items.map((crumb, index) => {
          const isLast = index === items.length - 1

          return (
            <li
              key={`${crumb.label}-${String(index)}`}
              className={`breadcrumb-item${isLast ? ' active' : ''}`}
              {...(isLast && { 'aria-current': 'page' })}
            >
              {crumb.to === undefined || isLast ? (
                crumb.label
              ) : (
                <Link to={crumb.to}>{crumb.label}</Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
