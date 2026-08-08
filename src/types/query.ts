/** Sort direction of a single attribute in a `sort` parameter. */
export type SortDirection = 'asc' | 'desc'

export interface SortSpec {
  readonly attribute: string
  readonly direction: SortDirection
}

/**
 * The resolved list-query specification, mirroring the API's `SearchCriteria`
 * DTO. Repositories turn it into a query string via `ListQueryBuilder`.
 */
export interface ListQuery {
  readonly page?: number
  /** 1–100; the API returns 422 outside that range. */
  readonly perPage?: number
  readonly sort?: readonly SortSpec[]
  /** One entry per filterable attribute of the resource. */
  readonly filters?: Readonly<Record<string, string | number | boolean | undefined>>
  /** Related resources to embed, e.g. `albums` on users, `photos` on albums. */
  readonly expand?: readonly string[]
}

/**
 * One filterable attribute of a resource, as the API names it, plus how the
 * filter bar should render it. It describes a query parameter rather than a
 * component, which is why it lives beside `ListQuery` — `src/forms/` declares
 * these and `FilterBar` merely renders them.
 */
interface FilterBase {
  readonly key: string
  readonly label: string
  readonly placeholder?: string
}

/** A free-text or numeric filter, matched however the API matches it. */
interface TextFilter extends FilterBase {
  readonly type?: 'text' | 'number'
}

/** A fixed set of values, e.g. the soft-deleted toggle. */
interface SelectFilter extends FilterBase {
  readonly type: 'select'
  /** Required: a select with nothing to choose from could not be answered. */
  readonly options: readonly { readonly value: string; readonly label: string }[]
}

export type FilterDefinition = TextFilter | SelectFilter

export const DEFAULT_PER_PAGE = 20
export const MAX_PER_PAGE = 100
