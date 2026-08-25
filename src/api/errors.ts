import type { FetchBaseQueryError, FetchBaseQueryMeta } from '@reduxjs/toolkit/query'

import type { ApiError, ApiErrorPayload, FieldErrors } from '@/types'

/**
 * What a failure is called when the body did not say.
 *
 * Mirrors the API's own `ApiErrorCatalog`, which derives an `error_code` from
 * the status for every failure that has no more specific reason. Keeping the
 * same names on this side means a caller branching on `errorCode` reads the
 * same value whether the API answered or something in front of it did.
 */
const DEFAULT_CODES: Readonly<Record<number, string>> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  405: 'method_not_allowed',
  409: 'conflict',
  413: 'payload_too_large',
  415: 'unsupported_media_type',
  422: 'validation_failed',
  429: 'too_many_requests',
  500: 'server_error',
  503: 'service_unavailable',
}

/** Fallbacks for the statuses the API documents, when it sends no message. */
const DEFAULT_MESSAGES: Readonly<Record<number, string>> = {
  0: 'The server could not be reached. Check your connection and try again.',
  400: 'The request was malformed.',
  401: 'Your session is not valid. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This operation conflicts with a safety rule and was refused.',
  413: 'That file is too large to upload.',
  422: 'Please correct the highlighted fields.',
  429: 'Too many attempts. Please wait before trying again.',
  500: 'The server ran into an unexpected problem.',
  503: 'The service is temporarily unavailable.',
}

function defaultMessage(code: number): string {
  return DEFAULT_MESSAGES[code] ?? 'An unexpected error occurred.'
}

/**
 * `error` is the API's catch-all name for a status it does not enumerate — the
 * same word its own catalog falls back to.
 */
function defaultCode(status: number): string {
  return DEFAULT_CODES[status] ?? 'error'
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

/**
 * Pulls the envelope's `data` out of an error body. The API answers errors with
 * the same `{success, data, code}` wrapper as successes.
 */
function errorPayload(body: unknown): ApiErrorPayload {
  const envelope = asRecord(body)
  if (envelope === null) return {}

  const payload = asRecord(envelope['data']) ?? envelope
  const message = typeof payload['message'] === 'string' ? payload['message'] : undefined
  const errorCode = typeof payload['error_code'] === 'string' ? payload['error_code'] : undefined
  const error = asRecord(payload['error'])

  return {
    ...(message !== undefined && { message }),
    ...(errorCode !== undefined && { error_code: errorCode }),
    ...(error !== null && { error }),
  }
}

/**
 * Reads the 422 field errors out of the envelope's `error`.
 *
 * The API sends `field → string[]` there and nothing else: a debug trace has
 * its own `debug` key, and anything that is not a validation failure sends an
 * empty object. So the only value shape worth recognising is a non-empty list
 * of strings — an empty list carries no message and is not a field error.
 */
export function extractFieldErrors(error: Record<string, unknown> | undefined): FieldErrors {
  if (error === undefined) return {}

  const result: Record<string, readonly string[]> = {}
  for (const [field, value] of Object.entries(error)) {
    if (Array.isArray(value) && value.length > 0 && value.every((it) => typeof it === 'string')) {
      result[field] = value
    }
  }
  return result
}

function retryAfterSeconds(meta: FetchBaseQueryMeta | undefined): number | undefined {
  const header = meta?.response?.headers.get('Retry-After')
  if (header === null || header === undefined) return undefined
  const seconds = Number.parseInt(header, 10)
  return Number.isNaN(seconds) ? undefined : seconds
}

/**
 * Normalises every failure — HTTP, network or parse — into the single
 * `ApiError` shape the rest of the application renders.
 */
export function toApiError(error: FetchBaseQueryError, meta?: FetchBaseQueryMeta): ApiError {
  if (typeof error.status === 'number') {
    const payload = errorPayload(error.data)
    const retryAfter = retryAfterSeconds(meta)

    return {
      code: error.status,
      errorCode: payload.error_code ?? defaultCode(error.status),
      // The API sends wording aimed at a person for every failure it raises,
      // including the ones it refuses for a named reason. Only a body that
      // carries none — a proxy's answer, a truncated response — needs ours.
      message: payload.message ?? defaultMessage(error.status),
      fieldErrors: extractFieldErrors(payload.error),
      ...(retryAfter !== undefined && { retryAfter }),
    }
  }

  if (error.status === 'PARSING_ERROR') {
    return {
      code: error.originalStatus,
      errorCode: defaultCode(error.originalStatus),
      message: defaultMessage(error.originalStatus),
      fieldErrors: {},
    }
  }

  if (error.status === 'TIMEOUT_ERROR') {
    return {
      code: 0,
      errorCode: 'timeout',
      message: 'The request timed out. Please try again.',
      fieldErrors: {},
    }
  }

  return { code: 0, errorCode: 'network_error', message: defaultMessage(0), fieldErrors: {} }
}

export function isApiError(value: unknown): value is ApiError {
  const candidate = asRecord(value)
  return (
    candidate !== null &&
    typeof candidate['code'] === 'number' &&
    typeof candidate['errorCode'] === 'string' &&
    typeof candidate['message'] === 'string' &&
    asRecord(candidate['fieldErrors']) !== null
  )
}

/** Best-effort message for anything that might be an error. */
export function errorMessage(value: unknown, fallback = 'An unexpected error occurred.'): string {
  return isApiError(value) ? value.message : fallback
}
