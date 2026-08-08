import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { ListSpec } from '@/forms'
import { ListQueryBuilder } from '@/services'
import { DEFAULT_PER_PAGE, type FilterDefinition, type ListQuery, type SortSpec } from '@/types'

export interface ListQueryState {
  readonly query: ListQuery
  readonly page: number
  readonly sort: readonly SortSpec[]
  readonly filters: Readonly<Record<string, string>>
  /** The spec's filter definitions, for the screen's `FilterBar`. */
  readonly filterDefinitions: readonly FilterDefinition[]
  readonly setPage: (page: number) => void
  /** Cycles a column: ascending → descending → unsorted. */
  readonly toggleSort: (attribute: string) => void
  /** Applies a whole filter set at once and returns to the first page. */
  readonly applyFilters: (filters: Readonly<Record<string, string>>) => void
  readonly reset: () => void
  readonly isFiltered: boolean
}

/**
 * List state — page, sort and filters — held in the URL rather than in
 * component state, so a filtered list is linkable and the back button works.
 * One implementation for every list screen, driven by the resource's `ListSpec`.
 */
export function useListQuery(spec: ListSpec): ListQueryState {
  const {
    filters: filterDefinitions,
    sortable,
    defaultSort = [],
    perPage = DEFAULT_PER_PAGE,
  } = spec
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Math.max(Number.parseInt(searchParams.get('page') ?? '1', 10) || 1, 1)

  // A spec is a module-level constant for most screens but a composed object for
  // the all-albums one, so its identity is not dependable. Memoising on the
  // serialised form keeps the resolved query stable — which is what stops RTK
  // Query from seeing a new request each render — without every screen having to
  // memoise first.
  const sortParam = searchParams.get('sort')
  const defaultSortKey = ListQueryBuilder.formatSort(defaultSort)
  const filterKey = filterDefinitions.map((filter) => filter.key).join(',')
  const sortableKey = sortable.join(',')

  const resolved = useMemo(() => {
    // An unknown attribute is dropped rather than sent: the API would 422 it,
    // and the sort comes from a URL the user can edit.
    const whitelist = sortableKey === '' ? [] : sortableKey.split(',')
    const requested = ListQueryBuilder.filterSortable(
      ListQueryBuilder.parseSort(sortParam ?? ''),
      whitelist,
    )
    const sort = requested.length > 0 ? requested : ListQueryBuilder.parseSort(defaultSortKey)

    const filters: Record<string, string> = Object.fromEntries(
      (filterKey === '' ? [] : filterKey.split(',')).map((key) => [
        key,
        searchParams.get(key) ?? '',
      ]),
    )

    const query: ListQuery = {
      page,
      perPage,
      sort,
      filters,
    }

    return { query, sort, filters }
  }, [page, perPage, sortParam, defaultSortKey, sortableKey, filterKey, searchParams])

  const update = useCallback(
    (mutate: (params: URLSearchParams) => void): void => {
      const next = new URLSearchParams(searchParams)
      mutate(next)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const setPage = useCallback(
    (value: number): void => {
      update((params) => {
        if (value <= 1) params.delete('page')
        else params.set('page', String(value))
      })
    },
    [update],
  )

  const toggleSort = useCallback(
    (attribute: string): void => {
      const next = ListQueryBuilder.toggleSort(resolved.sort, attribute)
      update((params) => {
        params.delete('page')
        if (next.length === 0) params.delete('sort')
        else params.set('sort', ListQueryBuilder.formatSort(next))
      })
    },
    [resolved.sort, update],
  )

  const applyFilters = useCallback(
    (values: Readonly<Record<string, string>>): void => {
      update((params) => {
        params.delete('page')
        for (const key of Object.keys(resolved.filters)) {
          const value = values[key] ?? ''
          if (value === '') params.delete(key)
          else params.set(key, value)
        }
      })
    },
    [resolved.filters, update],
  )

  const reset = useCallback((): void => {
    setSearchParams(new URLSearchParams(), { replace: true })
  }, [setSearchParams])

  const isFiltered = Object.values(resolved.filters).some((value) => value !== '')

  return {
    query: resolved.query,
    page,
    sort: resolved.sort,
    filters: resolved.filters,
    filterDefinitions,
    setPage,
    toggleSort,
    applyFilters,
    reset,
    isFiltered,
  }
}
