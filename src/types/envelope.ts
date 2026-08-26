/** Shape of `data` on an error response. */
export interface ApiErrorPayload {
  readonly message?: string
  /**
   * Machine-readable and stable — branch on this, never on `message`, which is
   * wording aimed at a person and free to change.
   */
  readonly error_code?: string
  /** Field name → validation messages. `{}` for anything that is not a 422. */
  readonly error?: Record<string, unknown>
  /** Only when the API runs with `YII_DEBUG`; never sent in production. */
  readonly debug?: {
    readonly file?: string
    readonly line?: number
    readonly trace?: readonly string[]
  }
}

export interface Pagination {
  readonly total: number
  readonly per_page: number
  readonly current_page: number
  readonly last_page: number
  /** 0 on a page with nothing on it — the API never sends null here. */
  readonly from: number
  readonly to: number
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
  /**
   * The API's machine-readable reason, and the thing to branch on — `message`
   * is wording aimed at a person and free to change. Always present: a body
   * carrying none falls back to the name of its status, so no caller has to
   * test for `undefined` first.
   */
  readonly errorCode: string
  readonly message: string
  /** Populated for 422 responses. */
  readonly fieldErrors: FieldErrors
  /**
   * Seconds to wait, from the `Retry-After` header of a 429. The API sends the
   * whole rate-limit window rather than the time actually left, so treat it as
   * an upper bound.
   */
  readonly retryAfter?: number
  /**
   * The id the API filed this request under in its logs (`X-Request-Id`), for a
   * bug report to quote. Diagnostics only — never UI copy.
   */
  readonly requestId?: string
}
