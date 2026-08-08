import { HttpResponse } from 'msw'

/**
 * Response helpers mirroring the API's unified envelope, so a handler is one
 * line and no test hand-builds a wrapper.
 */

export function ok(data: unknown, code = 200) {
  return HttpResponse.json({ success: true, data, code }, { status: code })
}

export function created(data: unknown) {
  return ok(data, 201)
}

export function noContent() {
  return new HttpResponse(null, { status: 204 })
}

export function fail(code: number, message = 'An error occurred during execution') {
  return HttpResponse.json({ success: false, data: { message }, code }, { status: code })
}

export function unauthorized() {
  return fail(401)
}

export function forbidden() {
  return fail(403, 'You are not allowed to perform this action.')
}

export function notFound() {
  return fail(404, 'Object not found.')
}

/** A safety-invariant refusal, e.g. the last role manager. */
export function conflict(message: string) {
  return HttpResponse.json({ success: false, data: { message }, code: 409 }, { status: 409 })
}

export function unprocessable(errors: Record<string, string[]>) {
  return HttpResponse.json(
    {
      success: false,
      data: { message: 'An error occurred during execution', error: errors },
      code: 422,
    },
    { status: 422 },
  )
}

/**
 * The rate limiter throws, so the response carries the error handler's generic
 * message — which is exactly why the client substitutes its own wording.
 */
export function tooManyRequests(retryAfter = 60) {
  return HttpResponse.json(
    { success: false, data: { message: 'An error occurred during execution' }, code: 429 },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}

export interface PageOptions<T> {
  readonly url: URL
  readonly items: readonly T[]
  /** Attributes matched with a case-insensitive "contains". */
  readonly likeFilters?: readonly (keyof T & string)[]
  /** Attributes matched exactly (compared as strings). */
  readonly exactFilters?: readonly (keyof T & string)[]
  readonly sortable?: readonly string[]
}

/**
 * Applies the API's list semantics — filters, sort whitelist, pagination — and
 * wraps the page in the documented `{items, pagination}` payload.
 */
export function paginate<T extends object>({
  url,
  items,
  likeFilters = [],
  exactFilters = [],
  sortable = [],
}: PageOptions<T>) {
  let rows = [...items]

  for (const key of likeFilters) {
    const needle = url.searchParams.get(key)
    if (needle === null || needle === '') continue
    rows = rows.filter((row) =>
      asText(valueOf(row, key)).toLowerCase().includes(needle.toLowerCase()),
    )
  }

  for (const key of exactFilters) {
    const value = url.searchParams.get(key)
    if (value === null || value === '') continue
    rows = rows.filter((row) => normaliseBoolean(valueOf(row, key)) === normaliseBoolean(value))
  }

  const sortParam = url.searchParams.get('sort')
  if (sortParam !== null && sortParam !== '') {
    for (const part of sortParam.split(',').reverse()) {
      const descending = part.startsWith('-')
      const attribute = descending ? part.slice(1) : part
      if (!sortable.includes(attribute)) {
        return unprocessable({ sort: [`Unknown sort attribute "${attribute}".`] })
      }
      rows.sort(
        (a, b) => compare(valueOf(a, attribute), valueOf(b, attribute)) * (descending ? -1 : 1),
      )
    }
  }

  const perPage = Number(url.searchParams.get('per_page') ?? '20')
  if (perPage < 1 || perPage > 100) {
    return unprocessable({ per_page: ['Per page must be between 1 and 100.'] })
  }

  const page = Number(url.searchParams.get('page') ?? '1')
  const total = rows.length
  const lastPage = Math.max(Math.ceil(total / perPage), 1)
  const slice = rows.slice((page - 1) * perPage, page * perPage)

  return ok({
    items: slice,
    pagination: {
      total,
      per_page: perPage,
      current_page: page,
      last_page: lastPage,
      from: slice.length === 0 ? null : (page - 1) * perPage + 1,
      to: slice.length === 0 ? null : (page - 1) * perPage + slice.length,
    },
  })
}

/** Reads an attribute the API filters or sorts by, whatever the row's shape. */
function valueOf(row: object, key: string): unknown {
  return (row as Record<string, unknown>)[key]
}

/** Filters compare text, so anything that is not scalar simply cannot match. */
function asText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

function normaliseBoolean(value: unknown): string {
  if (value === true || value === '1') return '1'
  if (value === false || value === '0') return '0'
  return String(value)
}

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}
