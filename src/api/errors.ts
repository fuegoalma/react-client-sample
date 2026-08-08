import type { FetchBaseQueryError, FetchBaseQueryMeta } from '@reduxjs/toolkit/query'

import type { ApiError, ApiErrorPayload, FieldErrors } from '@/types'

/** Fallbacks for the statuses the API documents, when it sends no message. */
const DEFAULT_MESSAGES: Readonly<Record<number, string>> = {
  0: 'The server could not be reached. Check your connection and try again.',
  400: 'The request was malformed.',
  401: 'Your session is not valid. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This operation conflicts with a safety rule and was refused.',
  422: 'Please correct the highlighted fields.',
  429: 'Too many attempts. Please wait before trying again.',
  500: 'The server ran into an unexpected problem.',
  503: 'The service is temporarily unavailable.',
}

function defaultMessage(code: number): string {
  return DEFAULT_MESSAGES[code] ?? 'An unexpected error occurred.'
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
  const error = asRecord(payload['error'])

  return { ...(message !== undefined && { message }), ...(error !== null && { error }) }
}

/**
 * Keeps only entries that look like validation messages. On a 422 the API sends
 * `field → string[]`; on other statuses `error` may instead carry a debug trace,
 * which this drops rather than rendering as field errors.
 */
export function extractFieldErrors(error: Record<string, unknown> | undefined): FieldErrors {
  if (error === undefined) return {}

  const result: Record<string, readonly string[]> = {}
  for (const [field, value] of Object.entries(error)) {
    if (typeof value === 'string') {
      result[field] = [value]
    } else if (
      // An empty array carries no message, so it is not a field error — which
      // also keeps a debug trace's empty `trace: []` from being mistaken for one.
      Array.isArray(value) &&
      value.length > 0 &&
      value.every((item) => typeof item === 'string')
    ) {
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
    const fieldErrors = extractFieldErrors(payload.error)
    const retryAfter = retryAfterSeconds(meta)

    // Yii's generic "An error occurred during execution" says nothing useful;
    // our status-specific fallback does.
    const isGenericMessage =
      payload.message === undefined || payload.message.startsWith('An error occurred')

    return {
      code: error.status,
      message: isGenericMessage ? defaultMessage(error.status) : payload.message,
      fieldErrors,
      ...(retryAfter !== undefined && { retryAfter }),
    }
  }

  if (error.status === 'PARSING_ERROR') {
    return {
      code: error.originalStatus,
      message: defaultMessage(error.originalStatus),
      fieldErrors: {},
    }
  }

  if (error.status === 'TIMEOUT_ERROR') {
    return { code: 0, message: 'The request timed out. Please try again.', fieldErrors: {} }
  }

  return { code: 0, message: defaultMessage(0), fieldErrors: {} }
}

export function isApiError(value: unknown): value is ApiError {
  const candidate = asRecord(value)
  return (
    candidate !== null &&
    typeof candidate['code'] === 'number' &&
    typeof candidate['message'] === 'string' &&
    asRecord(candidate['fieldErrors']) !== null
  )
}

/** Best-effort message for anything that might be an error. */
export function errorMessage(value: unknown, fallback = 'An unexpected error occurred.'): string {
  return isApiError(value) ? value.message : fallback
}
