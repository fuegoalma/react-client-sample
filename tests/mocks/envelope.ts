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

/**
 * What the API calls a failure when the endpoint named no narrower reason —
 * re-derived here rather than imported, like the rest of this mock.
 */
const STATUS_CODES: Readonly<Record<number, string>> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  413: 'payload_too_large',
  422: 'validation_failed',
  429: 'too_many_requests',
  500: 'server_error',
  503: 'service_unavailable',
}

const STATUS_MESSAGES: Readonly<Record<number, string>> = {
  400: 'The request was malformed.',
  401: 'Your credentials are missing or no longer valid.',
  403: 'You are not allowed to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This operation conflicts with a safety rule and was refused.',
  422: 'The request could not be processed — see `error` for the fields at fault.',
  429: 'Too many attempts. Please try again later.',
  500: 'The server ran into an unexpected problem.',
  503: 'The service is temporarily unavailable.',
}

/**
 * Every failure the API sends carries a message, a machine-readable
 * `error_code`, and an `error` map that is empty unless the failure is a
 * validation one. Debug detail, when the server is in debug mode, has its own
 * key and never lands in `error`.
 */
function failure(
  code: number,
  {
    message,
    errorCode,
    error = {},
  }: { message?: string; errorCode?: string; error?: Record<string, string[]> } = {},
) {
  return {
    success: false,
    data: {
      message: message ?? STATUS_MESSAGES[code] ?? 'The request could not be completed.',
      error_code: errorCode ?? STATUS_CODES[code] ?? 'error',
      error,
    },
    code,
  }
}

export function fail(code: number, message?: string, errorCode?: string) {
  return HttpResponse.json(failure(code, { message, errorCode }), { status: code })
}

export function unauthorized(errorCode?: string) {
  return fail(401, undefined, errorCode)
}

/**
 * A rejected email/password pair. Deliberately says nothing about which half
 * was wrong — telling the two apart would make the endpoint an
 * account-enumeration oracle.
 */
export function invalidCredentials(message = 'Invalid email or password.') {
  return fail(401, message, 'auth.invalid_credentials')
}

export function forbidden() {
  return fail(403)
}

export function notFound() {
  return fail(404, 'Object not found.')
}

/** A safety-invariant refusal, e.g. the last role manager. */
export function conflict(message: string) {
  return HttpResponse.json(failure(409, { message }), { status: 409 })
}

export function unprocessable(errors: Record<string, string[]>) {
  return HttpResponse.json(failure(422, { error: errors }), { status: 422 })
}

export function tooManyRequests(retryAfter = 60) {
  return HttpResponse.json(failure(429), {
    status: 429,
    headers: { 'Retry-After': String(retryAfter) },
  })
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
  // 0 when nothing matched, not 1 — the API reports no pages rather than one
  // empty one, and a mock that rounds it up is a mock of the client's guess.
  const lastPage = Math.ceil(total / perPage)
  const slice = rows.slice((page - 1) * perPage, page * perPage)

  return ok({
    items: slice,
    pagination: {
      total,
      per_page: perPage,
      current_page: page,
      last_page: lastPage,
      // The API reports 0–0 on a page with nothing on it, not null: verified
      // against it directly, both for an empty result set and for a page past
      // the last one. This mock previously invented `null`, which is how the
      // client came to defend against a value it can never be sent.
      from: slice.length === 0 ? 0 : (page - 1) * perPage + 1,
      to: slice.length === 0 ? 0 : (page - 1) * perPage + slice.length,
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
