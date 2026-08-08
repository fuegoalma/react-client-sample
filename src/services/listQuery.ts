import { MAX_PER_PAGE, type ListQuery, type SortSpec } from '@/types'

/**
 * Serialises the resolved list-query spec into the API's query parameters, and
 * parses them back. One implementation for every list endpoint (users, albums,
 * my albums, photos, roles) — the DRY counterpart of the API's `SearchForm`.
 */
export const ListQueryBuilder = {
  /** `[{title, asc}, {created_at, desc}]` → `title,-created_at`. */
  formatSort(sort: readonly SortSpec[]): string {
    return sort.map((s) => (s.direction === 'desc' ? `-${s.attribute}` : s.attribute)).join(',')
  },

  /** `-created_at,title` → `[{created_at, desc}, {title, asc}]`. */
  parseSort(value: string): SortSpec[] {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part !== '')
      .map((part) =>
        part.startsWith('-')
          ? { attribute: part.slice(1), direction: 'desc' as const }
          : { attribute: part, direction: 'asc' as const },
      )
      .filter((spec) => spec.attribute !== '')
  },

  /**
   * Keeps only the attributes a resource actually sorts by — the client's half
   * of the API's `sortableAttributes()` whitelist, which 422s anything else.
   *
   * The sort arrives from the URL, so it is user-editable: dropping an unknown
   * attribute lets a hand-typed or stale link render its list under the default
   * sort instead of an error screen.
   */
  filterSortable(sort: readonly SortSpec[], sortable: readonly string[]): SortSpec[] {
    return sort.filter((spec) => sortable.includes(spec.attribute))
  },

  /**
   * Builds the parameter object handed to the transport. Empty and undefined
   * values are dropped so an untouched filter never reaches the API, and
   * `per_page` is clamped to the range the API accepts (it 422s otherwise).
   */
  toParams(query: ListQuery): Record<string, string> {
    const params: Record<string, string> = {}

    if (query.page !== undefined && query.page > 1) {
      params['page'] = String(Math.trunc(query.page))
    }

    if (query.perPage !== undefined) {
      const clamped = Math.min(Math.max(Math.trunc(query.perPage), 1), MAX_PER_PAGE)
      params['per_page'] = String(clamped)
    }

    if (query.sort !== undefined && query.sort.length > 0) {
      params['sort'] = ListQueryBuilder.formatSort(query.sort)
    }

    if (query.expand !== undefined && query.expand.length > 0) {
      params['expand'] = query.expand.join(',')
    }

    for (const [key, value] of Object.entries(query.filters ?? {})) {
      if (value === undefined || value === '') continue
      params[key] = typeof value === 'boolean' ? (value ? '1' : '0') : String(value)
    }

    return params
  },

  /** Toggles a column between ascending, descending and unsorted. */
  toggleSort(sort: readonly SortSpec[], attribute: string): SortSpec[] {
    const current = sort.find((s) => s.attribute === attribute)
    if (current === undefined) return [{ attribute, direction: 'asc' }]
    if (current.direction === 'asc') return [{ attribute, direction: 'desc' }]
    return []
  },
} as const
