/** Shape of `data` on an error response. */
export interface ApiErrorPayload {
  readonly message?: string
  /** Field name → validation messages (422), or a debug trace when YII_DEBUG. */
  readonly error?: Record<string, unknown>
}

export interface Pagination {
  readonly total: number
  readonly per_page: number
  readonly current_page: number
  readonly last_page: number
  readonly from: number | null
  readonly to: number | null
}

/** The `data` of a list endpoint. */
export interface PaginatedPayload<T> {
  readonly items: readonly T[]
  readonly pagination: Pagination
}

/** Field name → the messages the API reported for it. */
export type FieldErrors = Readonly<Record<string, readonly string[]>>

/**
 * Every failure — HTTP, network or parse — normalised into one shape so the UI
 * has a single error contract to render.
 */
export interface ApiError {
  /** HTTP status, or 0 when the request never reached the server. */
  readonly code: number
  readonly message: string
  /** Populated for 422 responses. */
  readonly fieldErrors: FieldErrors
  /** Seconds to wait, from the `Retry-After` header of a 429. */
  readonly retryAfter?: number
}
