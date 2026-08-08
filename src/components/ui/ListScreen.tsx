import type { Key } from 'react'

import type { ListQueryState } from '@/hooks'
import type { PaginatedPayload } from '@/types'

import { DataTable, type Column } from './DataTable'
import { FilterBar } from './FilterBar'
import { PaginationBar } from './PaginationBar'
import { QueryBoundary } from './QueryBoundary'

/** The parts of an RTK Query result a list screen actually reads. */
export interface ListResult<T> {
  readonly data?: PaginatedPayload<T> | undefined
  readonly error?: unknown
  readonly isLoading: boolean
  /** True while a *refetch* is in flight, with the previous page still shown. */
  readonly isFetching: boolean
}

interface ListScreenProps<T> {
  /** Page, sort and filters, from `useListQuery`. */
  readonly list: ListQueryState
  readonly result: ListResult<T>
  readonly columns: readonly Column<T>[]
  readonly rowKey: (row: T) => Key
  /** Names the table for assistive technology. */
  readonly caption: string
  readonly emptyMessage: string
  readonly filteredEmptyMessage?: string
  /** Warms the detail view for a row the pointer or the focus has reached. */
  readonly onRowFocus?: (row: T) => void
}

/**
 * Filter bar, table, pagination and the loading / failed / empty triad — the
 * whole of a list screen except its columns.
 *
 * Every list screen wired these four together identically, differing only in
 * the columns and the wording. Keeping the wiring here means a new list screen
 * declares what it lists, not how a list behaves.
 */
export function ListScreen<T>({
  list,
  result,
  columns,
  rowKey,
  caption,
  emptyMessage,
  filteredEmptyMessage = 'No results match this filter.',
  onRowFocus,
}: ListScreenProps<T>) {
  const { data, error, isLoading, isFetching } = result

  return (
    <>
      <FilterBar
        filters={list.filterDefinitions}
        values={list.filters}
        onApply={list.applyFilters}
        onReset={list.reset}
        isFiltered={list.isFiltered}
      />

      <QueryBoundary
        isLoading={isLoading}
        error={error}
        // Every list screen renders rows, so the wait keeps the page's shape.
        pending="skeleton"
        // While a refetch is in flight the previous page is still on screen, so
        // announcing "nothing here" would contradict what the user can see.
        isEmpty={!isFetching && data?.items.length === 0}
        emptyMessage={list.isFiltered ? filteredEmptyMessage : emptyMessage}
      >
        {data !== undefined && (
          <DataTable
            caption={caption}
            columns={columns}
            rows={data.items}
            rowKey={rowKey}
            sort={list.sort}
            onToggleSort={list.toggleSort}
            {...(onRowFocus !== undefined && { onRowFocus })}
            footer={<PaginationBar pagination={data.pagination} onPageChange={list.setPage} />}
          />
        )}
      </QueryBoundary>
    </>
  )
}
