import type { FetchBaseQueryError, FetchBaseQueryMeta } from '@reduxjs/toolkit/query'
import { describe, expect, it } from 'vitest'

import { errorMessage, extractFieldErrors, isApiError, toApiError } from '@/api'

function envelope(code: number, data: unknown): FetchBaseQueryError {
  return { status: code, data: { success: false, data, code } }
}

function metaWith(headers: Record<string, string>): FetchBaseQueryMeta {
  return { response: new Response(null, { headers }) } as FetchBaseQueryMeta
}

/**
 * Every failure the UI renders passes through here, so this is where the API's
 * error envelope stops being the rest of the application's problem.
 */
describe('toApiError', () => {
  it('unwraps a validation error into per-field messages', () => {
    const error = toApiError(
      envelope(422, {
        message: 'The request could not be processed — see `error` for the fields at fault.',
        error_code: 'validation_failed',
        error: { email: ['Email has already been taken.'] },
      }),
    )

    expect(error.code).toBe(422)
    expect(error.errorCode).toBe('validation_failed')
    expect(error.fieldErrors).toEqual({ email: ['Email has already been taken.'] })
  })

  it('keeps a meaningful server message, such as a 409 conflict', () => {
    const error = toApiError(
      envelope(409, {
        message: 'This would leave no user able to manage roles.',
        error_code: 'role.last_manager',
      }),
    )

    expect(error.message).toBe('This would leave no user able to manage roles.')
  })

  it('carries the reason a program should branch on, not the prose', () => {
    // Two 401s that mean entirely different things: one is a password to retype,
    // the other a session that has been revoked and cannot be refreshed.
    expect(
      toApiError(
        envelope(401, { message: 'Invalid credentials.', error_code: 'auth.invalid_credentials' }),
      ).errorCode,
    ).toBe('auth.invalid_credentials')
    expect(
      toApiError(envelope(401, { message: 'Token reused.', error_code: 'refresh_token.reused' }))
        .errorCode,
    ).toBe('refresh_token.reused')
  })

  it('names the failure after its status when the body gives no code', () => {
    // A proxy in front of the API answers without the envelope, so a caller
    // still gets something to branch on rather than an absent field.
    expect(toApiError(envelope(404, {})).errorCode).toBe('not_found')
    expect(toApiError(envelope(413, {})).errorCode).toBe('payload_too_large')
    expect(toApiError({ status: 418, data: {} }).errorCode).toBe('error')
  })

  it('falls back on a status message when the body carries none', () => {
    expect(toApiError(envelope(404, {})).message).toBe('The requested resource was not found.')
  })

  it('explains an upload the endpoint refused for its size', () => {
    const error = toApiError(envelope(413, { error_code: 'payload.too_large' }))

    expect(error.errorCode).toBe('payload.too_large')
    expect(error.message).toBe('That file is too large to upload.')
  })

  it('reads Retry-After off a rate-limited response', () => {
    const error = toApiError(envelope(429, {}), metaWith({ 'Retry-After': '30' }))
    expect(error.retryAfter).toBe(30)
  })

  it('leaves retryAfter unset when the header is absent or unparseable', () => {
    expect(toApiError(envelope(429, {})).retryAfter).toBeUndefined()
    expect(
      toApiError(envelope(429, {}), metaWith({ 'Retry-After': 'soon' })).retryAfter,
    ).toBeUndefined()
  })

  it('reports a network failure as code 0', () => {
    const error = toApiError({ status: 'FETCH_ERROR', error: 'Failed to fetch' })
    expect(error.code).toBe(0)
    expect(error.errorCode).toBe('network_error')
    expect(error.message).toContain('could not be reached')
  })

  it('reports a timeout distinctly', () => {
    const error = toApiError({ status: 'TIMEOUT_ERROR', error: 'timed out' })
    expect(error.code).toBe(0)
    expect(error.errorCode).toBe('timeout')
    expect(error.message).toContain('timed out')
  })

  it('uses the original status of an unparseable response', () => {
    const error = toApiError({
      status: 'PARSING_ERROR',
      originalStatus: 500,
      data: '<html>',
      error: 'Unexpected token',
    })
    expect(error.code).toBe(500)
    expect(error.errorCode).toBe('server_error')
  })

  it('never invents field errors from a debug trace', () => {
    // Debug detail has its own `debug` key now, and `error` is empty for
    // anything that is not a validation failure — so there is nothing to mine.
    const error = toApiError(
      envelope(500, {
        message: 'Boom',
        error_code: 'server_error',
        error: {},
        debug: { file: 'x.php', line: 12, trace: [] },
      }),
    )
    expect(error.fieldErrors).toEqual({})
  })
})

describe('extractFieldErrors', () => {
  it('keeps the message lists the API sends', () => {
    expect(extractFieldErrors({ title: ['Title cannot be blank.'] })).toEqual({
      title: ['Title cannot be blank.'],
    })
  })

  it('drops values that are not messages', () => {
    // An empty list carries nothing to show, and the API never sends a bare
    // value under a field — `getErrors()` produces a list per attribute.
    expect(extractFieldErrors({ line: 12, trace: [{ file: 'x' }], sort: [] })).toEqual({})
  })

  it('returns nothing when there is no error object', () => {
    expect(extractFieldErrors(undefined)).toEqual({})
  })
})

describe('isApiError and errorMessage', () => {
  it('recognises a normalised error', () => {
    expect(
      isApiError({ code: 404, errorCode: 'not_found', message: 'Nope', fieldErrors: {} }),
    ).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isApiError(null)).toBe(false)
    expect(isApiError('boom')).toBe(false)
    expect(isApiError({ code: 404 })).toBe(false)
    // Missing the field every caller branches on is not our shape.
    expect(isApiError({ code: 404, message: 'Nope', fieldErrors: {} })).toBe(false)
  })

  it('falls back when handed something that is not an API error', () => {
    expect(errorMessage(new Error('x'), 'Could not load.')).toBe('Could not load.')
    expect(errorMessage({ code: 1, errorCode: 'error', message: 'Real', fieldErrors: {} })).toBe(
      'Real',
    )
  })
})

describe('Statuses and bodies the API is not documented to send', () => {
  it('still explains a status it has no wording for', () => {
    expect(toApiError({ status: 418, data: {} }).message).toBe('An unexpected error occurred.')
  })

  it('falls back to status wording when the envelope carries no message', () => {
    expect(toApiError(envelope(403, {})).message).toBe(
      'You do not have permission to perform this action.',
    )
  })

  it('reads an error body that was not wrapped in the envelope', () => {
    // Anything in front of the API — a proxy, a load balancer — may answer
    // without the wrapper the API itself always uses.
    const error = toApiError({ status: 502, data: { message: 'Bad gateway.' } })
    expect(error.message).toBe('Bad gateway.')
  })

  it('falls back to the status wording when the body is not an object at all', () => {
    expect(toApiError({ status: 500, data: 'plain text' }).message).toBe(
      'The server ran into an unexpected problem.',
    )
  })
})
