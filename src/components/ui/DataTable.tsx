import type { Key, ReactNode } from 'react'

import type { SortSpec } from '@/types'

export interface Column<T> {
  readonly key: string
  readonly header: ReactNode
  /** When set, the header becomes a sort control for this API attribute. */
  readonly sortAttribute?: string
  readonly className?: string
  readonly render: (row: T) => ReactNode
}

export interface DataTableProps<T> {
  readonly columns: readonly Column<T>[]
  readonly rows: readonly T[]
  readonly rowKey: (row: T) => Key
  readonly sort?: readonly SortSpec[]
  readonly onToggleSort?: (attribute: string) => void
  readonly caption?: string
  readonly footer?: ReactNode
  /**
   * Called when the pointer first reaches a row. A screen uses it to warm the
   * detail view's query, so the record is usually already there by the time the
   * click lands. It is only ever a head start: the detail screen still asks for
   * its own data and renders its own loading state.
   */
  readonly onRowFocus?: (row: T) => void
}

function SortHeader({
  label,
  attribute,
  sort,
  onToggle,
}: {
  readonly label: ReactNode
  readonly attribute: string
  readonly sort: readonly SortSpec[]
  readonly onToggle: (attribute: string) => void
}) {
  const active = sort.find((spec) => spec.attribute === attribute)
  const icon =
    active === undefined
      ? 'bi-arrow-down-up'
      : active.direction === 'asc'
        ? 'bi-sort-up'
        : 'bi-sort-down'

  return (
    <button
      type="button"
      className={`sortHeader${active === undefined ? '' : ' sortHeader--active'}`}
      onClick={() => {
        onToggle(attribute)
      }}
      aria-label={`Sort by ${attribute}`}
    >
      {label}
      <i className={`sortHeader__icon bi ${icon}`} aria-hidden="true" />
    </button>
  )
}

/**
 * The one table every list screen renders. Columns describe themselves —
 * including which API attribute they sort by — so adding a screen never means
 * re-implementing sorting, markup or empty handling.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  sort = [],
  onToggleSort,
  caption,
  footer,
  onRowFocus,
}: DataTableProps<T>) {
  return (
    <div className="dataTable">
      <div className="dataTable__scroll">
        <table className="table table-hover align-middle">
          {caption !== undefined && <caption className="visually-hidden">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={column.className}>
                  {column.sortAttribute !== undefined && onToggleSort !== undefined ? (
                    <SortHeader
                      label={column.header}
                      attribute={column.sortAttribute}
                      sort={sort}
                      onToggle={onToggleSort}
                    />
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                // `focus` as well as hover, so reaching the row by keyboard
                // gets the same head start as reaching it by mouse.
                onPointerEnter={
                  onRowFocus === undefined
                    ? undefined
                    : () => {
                        onRowFocus(row)
                      }
                }
                onFocus={
                  onRowFocus === undefined
                    ? undefined
                    : () => {
                        onRowFocus(row)
                      }
                }
              >
                {columns.map((column) => (
                  <td key={column.key} className={column.className}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  )
}
